/**
 * Property-Based Tests for Cost Tracking
 * Using fast-check for property-based testing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Mock ReminderLog for testing cost tracking
 */
class MockReminderLog {
  constructor(data) {
    this.id = data.id || this._generateId();
    this.invoiceId = data.invoiceId;
    this.channel = data.channel;
    this.status = data.status || 'pending';
    this.message = data.message;
    this.escalationLevel = data.escalationLevel;
    this.sentAt = data.sentAt || new Date();
    this.deliveredAt = data.deliveredAt || null;
    this.error = data.error || null;
    this.cost = data.cost || null;
  }

  _generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  static logs = [];

  static async create(data) {
    const log = new MockReminderLog(data);
    this.logs.push(log);
    return log;
  }

  static async find(query) {
    return this.logs.filter(log => {
      return Object.keys(query).every(key => {
        if (key === 'sentAt' && typeof query[key] === 'object') {
          // Handle date range queries
          const logDate = log.sentAt;
          if (query[key].$gte && logDate < query[key].$gte) return false;
          if (query[key].$lte && logDate > query[key].$lte) return false;
          return true;
        }
        return log[key] === query[key];
      });
    });
  }

  static async countDocuments(query) {
    const results = await this.find(query);
    return results.length;
  }

  static clearLogs() {
    this.logs = [];
  }
}

/**
 * Cost calculation service
 */
class CostTrackingService {
  // Standard cost rates
  static COSTS = {
    email: 0.0001,      // $0.0001 per email (SendGrid pricing)
    sms: 0.0075,        // $0.0075 per SMS (Twilio pricing for India)
    ai_gentle: 0.002,   // $0.002 per gentle message (fewer tokens)
    ai_firm: 0.003,     // $0.003 per firm message (moderate tokens)
    ai_urgent: 0.004    // $0.004 per urgent message (more tokens)
  };

  /**
   * Calculate cost for a reminder
   */
  static calculateReminderCost(channel, escalationLevel) {
    let cost = 0;

    // Add channel cost
    if (channel === 'email') {
      cost += this.COSTS.email;
    } else if (channel === 'sms') {
      cost += this.COSTS.sms;
    }

    // Add AI generation cost
    if (escalationLevel === 'gentle') {
      cost += this.COSTS.ai_gentle;
    } else if (escalationLevel === 'firm') {
      cost += this.COSTS.ai_firm;
    } else if (escalationLevel === 'urgent') {
      cost += this.COSTS.ai_urgent;
    }

    return cost;
  }

  /**
   * Calculate total cost for an invoice
   */
  static async calculateInvoiceCost(invoiceId) {
    const logs = await MockReminderLog.find({ invoiceId });
    return logs.reduce((sum, log) => sum + (log.cost || 0), 0);
  }

  /**
   * Calculate monthly costs
   */
  static async calculateMonthlyCost(year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const logs = await MockReminderLog.find({
      sentAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    return logs.reduce((sum, log) => sum + (log.cost || 0), 0);
  }

  /**
   * Get usage statistics
   */
  static async getUsageStats(startDate, endDate) {
    const logs = await MockReminderLog.find({
      sentAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    const stats = {
      totalReminders: logs.length,
      totalCost: 0,
      emailCount: 0,
      smsCount: 0,
      emailCost: 0,
      smsCost: 0,
      aiCost: 0,
      byEscalation: {
        gentle: { count: 0, cost: 0 },
        firm: { count: 0, cost: 0 },
        urgent: { count: 0, cost: 0 }
      }
    };

    logs.forEach(log => {
      stats.totalCost += log.cost || 0;

      if (log.channel === 'email') {
        stats.emailCount++;
        stats.emailCost += CostTrackingService.COSTS.email;
      } else if (log.channel === 'sms') {
        stats.smsCount++;
        stats.smsCost += CostTrackingService.COSTS.sms;
      }

      // Track AI costs
      if (log.escalationLevel === 'gentle') {
        stats.byEscalation.gentle.count++;
        stats.byEscalation.gentle.cost += CostTrackingService.COSTS.ai_gentle;
        stats.aiCost += CostTrackingService.COSTS.ai_gentle;
      } else if (log.escalationLevel === 'firm') {
        stats.byEscalation.firm.count++;
        stats.byEscalation.firm.cost += CostTrackingService.COSTS.ai_firm;
        stats.aiCost += CostTrackingService.COSTS.ai_firm;
      } else if (log.escalationLevel === 'urgent') {
        stats.byEscalation.urgent.count++;
        stats.byEscalation.urgent.cost += CostTrackingService.COSTS.ai_urgent;
        stats.aiCost += CostTrackingService.COSTS.ai_urgent;
      }
    });

    return stats;
  }
}

describe('Cost Tracking - Property-Based Tests', () => {
  beforeEach(() => {
    MockReminderLog.clearLogs();
  });

  afterEach(() => {
    MockReminderLog.clearLogs();
  });

  /**
   * **Feature: ai-automated-reminders, Property 12: Cost Tracking**
   * **Validates: Requirements 14.1, 14.2**
   * 
   * For any reminder sent, the estimated cost should be logged and accumulated
   * for budget monitoring.
   */
  describe('Property 12: Cost Tracking', () => {
    it('should track cost for every reminder sent', () => {
      // Generator for reminder data with cost
      const reminderWithCostArbitrary = fc.record({
        invoiceId: fc.uuid(),
        channel: fc.constantFrom('email', 'sms'),
        message: fc.string({ minLength: 50, maxLength: 500 }),
        escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent'),
        status: fc.constantFrom('sent', 'failed', 'pending')
      });

      fc.assert(
        fc.asyncProperty(reminderWithCostArbitrary, async (reminderData) => {
          // Calculate expected cost
          const expectedCost = CostTrackingService.calculateReminderCost(
            reminderData.channel,
            reminderData.escalationLevel
          );

          // Create reminder log with cost
          const log = await MockReminderLog.create({
            ...reminderData,
            cost: expectedCost
          });

          // Verify cost is tracked
          if (!log.cost) return false;
          if (log.cost !== expectedCost) return false;
          if (log.cost < 0) return false;

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should accumulate costs correctly for multiple reminders', () => {
      // Generator for multiple reminders
      const multipleRemindersArbitrary = fc.array(
        fc.record({
          invoiceId: fc.uuid(),
          channel: fc.constantFrom('email', 'sms'),
          message: fc.string({ minLength: 50, maxLength: 500 }),
          escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent')
        }),
        { minLength: 2, maxLength: 20 }
      );

      fc.assert(
        fc.asyncProperty(multipleRemindersArbitrary, async (reminders) => {
          MockReminderLog.clearLogs();

          let expectedTotalCost = 0;

          // Create all reminders with costs
          for (const reminderData of reminders) {
            const cost = CostTrackingService.calculateReminderCost(
              reminderData.channel,
              reminderData.escalationLevel
            );

            await MockReminderLog.create({
              ...reminderData,
              cost,
              status: 'sent'
            });

            expectedTotalCost += cost;
          }

          // Calculate actual total cost
          const actualTotalCost = MockReminderLog.logs.reduce(
            (sum, log) => sum + (log.cost || 0),
            0
          );

          // Verify total cost matches (with floating point tolerance)
          const tolerance = 0.0001;
          if (Math.abs(actualTotalCost - expectedTotalCost) > tolerance) return false;

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should calculate invoice-specific costs correctly', () => {
      // Generator for reminders for same invoice
      const invoiceRemindersArbitrary = fc.tuple(
        fc.uuid(), // Same invoice ID
        fc.array(
          fc.record({
            channel: fc.constantFrom('email', 'sms'),
            message: fc.string({ minLength: 50, maxLength: 500 }),
            escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent')
          }),
          { minLength: 1, maxLength: 10 }
        )
      );

      fc.assert(
        fc.asyncProperty(invoiceRemindersArbitrary, async ([invoiceId, reminders]) => {
          MockReminderLog.clearLogs();

          let expectedInvoiceCost = 0;

          // Create reminders for this invoice
          for (const reminderData of reminders) {
            const cost = CostTrackingService.calculateReminderCost(
              reminderData.channel,
              reminderData.escalationLevel
            );

            await MockReminderLog.create({
              invoiceId,
              ...reminderData,
              cost,
              status: 'sent'
            });

            expectedInvoiceCost += cost;
          }

          // Calculate invoice cost
          const actualInvoiceCost = await CostTrackingService.calculateInvoiceCost(invoiceId);

          // Verify invoice cost matches (with floating point tolerance)
          const tolerance = 0.0001;
          if (Math.abs(actualInvoiceCost - expectedInvoiceCost) > tolerance) return false;

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should calculate monthly costs correctly', () => {
      // Generator for reminders in a specific month
      const monthlyRemindersArbitrary = fc.tuple(
        fc.integer({ min: 2024, max: 2025 }), // Year
        fc.integer({ min: 1, max: 12 }),       // Month
        fc.array(
          fc.record({
            invoiceId: fc.uuid(),
            channel: fc.constantFrom('email', 'sms'),
            message: fc.string({ minLength: 50, maxLength: 500 }),
            escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent'),
            dayOfMonth: fc.integer({ min: 1, max: 28 }) // Safe day range
          }),
          { minLength: 1, maxLength: 15 }
        )
      );

      fc.assert(
        fc.asyncProperty(monthlyRemindersArbitrary, async ([year, month, reminders]) => {
          MockReminderLog.clearLogs();

          let expectedMonthlyCost = 0;

          // Create reminders for this month
          for (const reminderData of reminders) {
            const cost = CostTrackingService.calculateReminderCost(
              reminderData.channel,
              reminderData.escalationLevel
            );

            const sentAt = new Date(year, month - 1, reminderData.dayOfMonth);

            await MockReminderLog.create({
              invoiceId: reminderData.invoiceId,
              channel: reminderData.channel,
              message: reminderData.message,
              escalationLevel: reminderData.escalationLevel,
              cost,
              status: 'sent',
              sentAt
            });

            expectedMonthlyCost += cost;
          }

          // Calculate monthly cost
          const actualMonthlyCost = await CostTrackingService.calculateMonthlyCost(year, month);

          // Verify monthly cost matches (with floating point tolerance)
          const tolerance = 0.0001;
          if (Math.abs(actualMonthlyCost - expectedMonthlyCost) > tolerance) return false;

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should track costs separately by channel', () => {
      // Generator for mixed channel reminders
      const mixedChannelArbitrary = fc.array(
        fc.record({
          invoiceId: fc.uuid(),
          channel: fc.constantFrom('email', 'sms'),
          message: fc.string({ minLength: 50, maxLength: 500 }),
          escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent')
        }),
        { minLength: 5, maxLength: 20 }
      );

      fc.assert(
        fc.asyncProperty(mixedChannelArbitrary, async (reminders) => {
          MockReminderLog.clearLogs();

          let expectedEmailCost = 0;
          let expectedSmsCost = 0;

          // Create reminders
          for (const reminderData of reminders) {
            const cost = CostTrackingService.calculateReminderCost(
              reminderData.channel,
              reminderData.escalationLevel
            );

            await MockReminderLog.create({
              ...reminderData,
              cost,
              status: 'sent'
            });

            if (reminderData.channel === 'email') {
              expectedEmailCost += cost;
            } else {
              expectedSmsCost += cost;
            }
          }

          // Get usage stats
          const stats = await CostTrackingService.getUsageStats(
            new Date(2024, 0, 1),
            new Date(2025, 11, 31)
          );

          // Verify channel costs (with floating point tolerance)
          const tolerance = 0.0001;
          if (Math.abs(stats.emailCost - expectedEmailCost) > tolerance) return false;
          if (Math.abs(stats.smsCost - expectedSmsCost) > tolerance) return false;

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should track costs by escalation level', () => {
      // Generator for reminders with different escalation levels
      const escalationMixArbitrary = fc.array(
        fc.record({
          invoiceId: fc.uuid(),
          channel: fc.constantFrom('email', 'sms'),
          message: fc.string({ minLength: 50, maxLength: 500 }),
          escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent')
        }),
        { minLength: 5, maxLength: 20 }
      );

      fc.assert(
        fc.asyncProperty(escalationMixArbitrary, async (reminders) => {
          MockReminderLog.clearLogs();

          const expectedByEscalation = {
            gentle: 0,
            firm: 0,
            urgent: 0
          };

          // Create reminders
          for (const reminderData of reminders) {
            const cost = CostTrackingService.calculateReminderCost(
              reminderData.channel,
              reminderData.escalationLevel
            );

            await MockReminderLog.create({
              ...reminderData,
              cost,
              status: 'sent'
            });

            expectedByEscalation[reminderData.escalationLevel] += cost;
          }

          // Get usage stats
          const stats = await CostTrackingService.getUsageStats(
            new Date(2024, 0, 1),
            new Date(2025, 11, 31)
          );

          // Verify escalation level costs (with floating point tolerance)
          const tolerance = 0.0001;
          if (Math.abs(stats.byEscalation.gentle.cost - expectedByEscalation.gentle) > tolerance) return false;
          if (Math.abs(stats.byEscalation.firm.cost - expectedByEscalation.firm) > tolerance) return false;
          if (Math.abs(stats.byEscalation.urgent.cost - expectedByEscalation.urgent) > tolerance) return false;

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should handle zero cost reminders gracefully', () => {
      // Generator for reminders with zero or null cost
      const zeroCostArbitrary = fc.array(
        fc.record({
          invoiceId: fc.uuid(),
          channel: fc.constantFrom('email', 'sms'),
          message: fc.string({ minLength: 50, maxLength: 500 }),
          escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent'),
          cost: fc.constantFrom(0, null, undefined)
        }),
        { minLength: 1, maxLength: 10 }
      );

      fc.assert(
        fc.asyncProperty(zeroCostArbitrary, async (reminders) => {
          MockReminderLog.clearLogs();

          // Create reminders with zero/null cost
          for (const reminderData of reminders) {
            await MockReminderLog.create({
              ...reminderData,
              status: 'sent'
            });
          }

          // Calculate total cost (should be 0)
          const totalCost = MockReminderLog.logs.reduce(
            (sum, log) => sum + (log.cost || 0),
            0
          );

          // Verify total cost is 0 or very close to 0
          const tolerance = 0.0001;
          if (Math.abs(totalCost) > tolerance) return false;

          // Verify all logs have zero or null cost
          for (const log of MockReminderLog.logs) {
            if (log.cost !== 0 && log.cost !== null && log.cost !== undefined) {
              return false;
            }
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should maintain cost accuracy across date ranges', () => {
      // Generator for reminders across different dates
      const dateRangeArbitrary = fc.tuple(
        fc.date({ min: new Date(2024, 0, 1), max: new Date(2024, 11, 31) }),
        fc.date({ min: new Date(2024, 0, 1), max: new Date(2024, 11, 31) }),
        fc.array(
          fc.record({
            invoiceId: fc.uuid(),
            channel: fc.constantFrom('email', 'sms'),
            message: fc.string({ minLength: 50, maxLength: 500 }),
            escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent'),
            sentAt: fc.date({ min: new Date(2024, 0, 1), max: new Date(2024, 11, 31) })
          }),
          { minLength: 5, maxLength: 20 }
        )
      );

      fc.assert(
        fc.asyncProperty(dateRangeArbitrary, async ([startDate, endDate, reminders]) => {
          MockReminderLog.clearLogs();

          // Ensure startDate is before endDate
          if (startDate > endDate) {
            [startDate, endDate] = [endDate, startDate];
          }

          let expectedCostInRange = 0;

          // Create reminders
          for (const reminderData of reminders) {
            const cost = CostTrackingService.calculateReminderCost(
              reminderData.channel,
              reminderData.escalationLevel
            );

            await MockReminderLog.create({
              ...reminderData,
              cost,
              status: 'sent'
            });

            // Track expected cost if in range
            if (reminderData.sentAt >= startDate && reminderData.sentAt <= endDate) {
              expectedCostInRange += cost;
            }
          }

          // Get usage stats for date range
          const stats = await CostTrackingService.getUsageStats(startDate, endDate);

          // Verify cost in range (with floating point tolerance)
          const tolerance = 0.0001;
          if (Math.abs(stats.totalCost - expectedCostInRange) > tolerance) return false;

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should ensure costs are always non-negative', () => {
      // Generator for any reminder data
      const anyReminderArbitrary = fc.record({
        invoiceId: fc.uuid(),
        channel: fc.constantFrom('email', 'sms'),
        message: fc.string({ minLength: 50, maxLength: 500 }),
        escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent')
      });

      fc.assert(
        fc.asyncProperty(anyReminderArbitrary, async (reminderData) => {
          // Calculate cost
          const cost = CostTrackingService.calculateReminderCost(
            reminderData.channel,
            reminderData.escalationLevel
          );

          // Create reminder
          const log = await MockReminderLog.create({
            ...reminderData,
            cost,
            status: 'sent'
          });

          // Verify cost is non-negative
          if (log.cost < 0) return false;

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve cost data when reminder status changes', () => {
      // Generator for reminder with status changes
      const reminderWithStatusChangeArbitrary = fc.record({
        invoiceId: fc.uuid(),
        channel: fc.constantFrom('email', 'sms'),
        message: fc.string({ minLength: 50, maxLength: 500 }),
        escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent'),
        initialStatus: fc.constantFrom('pending', 'sent'),
        finalStatus: fc.constantFrom('sent', 'failed')
      });

      fc.assert(
        fc.asyncProperty(reminderWithStatusChangeArbitrary, async (reminderData) => {
          MockReminderLog.clearLogs();

          // Calculate cost
          const cost = CostTrackingService.calculateReminderCost(
            reminderData.channel,
            reminderData.escalationLevel
          );

          // Create reminder with initial status
          const log = await MockReminderLog.create({
            invoiceId: reminderData.invoiceId,
            channel: reminderData.channel,
            message: reminderData.message,
            escalationLevel: reminderData.escalationLevel,
            cost,
            status: reminderData.initialStatus
          });

          const originalCost = log.cost;

          // Change status
          log.status = reminderData.finalStatus;

          // Verify cost is preserved
          if (log.cost !== originalCost) return false;
          if (log.cost !== cost) return false;

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
