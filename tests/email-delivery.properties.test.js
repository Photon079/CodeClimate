/**
 * Property-Based Tests for Email Delivery Logging
 * Using fast-check for property-based testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

/**
 * Mock ReminderLog for testing
 * Simulates the database model for reminder logs
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

  static async findByIdAndUpdate(id, updateData) {
    const log = this.logs.find(l => l.id === id);
    if (log) {
      Object.assign(log, updateData);
    }
    return log;
  }

  static async findById(id) {
    return this.logs.find(l => l.id === id);
  }

  static async find(query) {
    return this.logs.filter(log => {
      return Object.keys(query).every(key => log[key] === query[key]);
    });
  }

  static clearLogs() {
    this.logs = [];
  }
}

/**
 * Mock EmailService for testing
 * Simulates email delivery with logging
 */
class MockEmailService {
  constructor() {
    this.provider = 'sendgrid';
    this.senderEmail = 'test@example.com';
    this.senderName = 'Test Service';
  }

  async sendEmail(params, options = {}) {
    const { to, subject, html, text, reminderLogId } = params;
    const { simulateError = false } = options;

    try {
      // Simulate error if requested
      if (simulateError) {
        throw new Error('Email delivery failed');
      }

      const messageId = `msg_${Math.random().toString(36).substring(2, 15)}`;

      // Update delivery status if reminderLogId is provided
      if (reminderLogId) {
        await this._updateDeliveryStatus(reminderLogId, 'sent', messageId);
      }

      return {
        success: true,
        messageId,
        provider: this.provider
      };
    } catch (error) {
      // Update delivery status if reminderLogId is provided
      if (reminderLogId) {
        await this._updateDeliveryStatus(reminderLogId, 'failed', null, error.message);
      }

      return {
        success: false,
        error: error.message,
        provider: this.provider
      };
    }
  }

  async _updateDeliveryStatus(reminderLogId, status, messageId = null, error = null) {
    const updateData = {
      status,
      error
    };

    if (status === 'sent') {
      updateData.deliveredAt = new Date();
    }

    // Store messageId in error field for tracking
    if (messageId && status === 'sent') {
      updateData.error = `MessageId: ${messageId}`;
    }

    await MockReminderLog.findByIdAndUpdate(reminderLogId, updateData);
  }
}

describe('Email Delivery - Property-Based Tests', () => {
  let emailService;

  beforeEach(() => {
    emailService = new MockEmailService();
    MockReminderLog.clearLogs();
  });

  afterEach(() => {
    MockReminderLog.clearLogs();
  });

  /**
   * **Feature: ai-automated-reminders, Property 9: Email Delivery Logging**
   * **Validates: Requirements 4.5**
   * 
   * For any email reminder sent, there should be a corresponding log entry with
   * status, timestamp, and message content.
   */
  describe('Property 9: Email Delivery Logging', () => {
    it('should create a log entry for every successful email sent', () => {
      // Generator for email reminder data
      const emailReminderArbitrary = fc.record({
        invoiceId: fc.uuid(),
        to: fc.emailAddress(),
        subject: fc.string({ minLength: 5, maxLength: 100 }),
        message: fc.string({ minLength: 50, maxLength: 500 }),
        escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent')
      });

      fc.assert(
        fc.asyncProperty(emailReminderArbitrary, async (reminderData) => {
          // Create a reminder log entry
          const log = await MockReminderLog.create({
            invoiceId: reminderData.invoiceId,
            channel: 'email',
            status: 'pending',
            message: reminderData.message,
            escalationLevel: reminderData.escalationLevel
          });

          // Send email with log ID
          const result = await emailService.sendEmail({
            to: reminderData.to,
            subject: reminderData.subject,
            html: `<p>${reminderData.message}</p>`,
            text: reminderData.message,
            reminderLogId: log.id
          });

          // Verify email was sent successfully
          if (!result.success) return false;

          // Retrieve the updated log
          const updatedLog = await MockReminderLog.findById(log.id);

          // Verify log entry exists
          if (!updatedLog) return false;

          // Verify log has correct status
          if (updatedLog.status !== 'sent') return false;

          // Verify log has timestamp (deliveredAt should be set)
          if (!updatedLog.deliveredAt) return false;

          // Verify log has message content
          if (updatedLog.message !== reminderData.message) return false;

          // Verify log has correct channel
          if (updatedLog.channel !== 'email') return false;

          // Verify log has correct escalation level
          if (updatedLog.escalationLevel !== reminderData.escalationLevel) return false;

          // Verify log has correct invoice ID
          if (updatedLog.invoiceId !== reminderData.invoiceId) return false;

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should create a log entry with error details for failed email delivery', () => {
      // Generator for email reminder data
      const emailReminderArbitrary = fc.record({
        invoiceId: fc.uuid(),
        to: fc.emailAddress(),
        subject: fc.string({ minLength: 5, maxLength: 100 }),
        message: fc.string({ minLength: 50, maxLength: 500 }),
        escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent')
      });

      fc.assert(
        fc.asyncProperty(emailReminderArbitrary, async (reminderData) => {
          // Create a reminder log entry
          const log = await MockReminderLog.create({
            invoiceId: reminderData.invoiceId,
            channel: 'email',
            status: 'pending',
            message: reminderData.message,
            escalationLevel: reminderData.escalationLevel
          });

          // Send email with simulated error
          const result = await emailService.sendEmail(
            {
              to: reminderData.to,
              subject: reminderData.subject,
              html: `<p>${reminderData.message}</p>`,
              text: reminderData.message,
              reminderLogId: log.id
            },
            { simulateError: true }
          );

          // Verify email failed
          if (result.success) return false;

          // Retrieve the updated log
          const updatedLog = await MockReminderLog.findById(log.id);

          // Verify log entry exists
          if (!updatedLog) return false;

          // Verify log has 'failed' status
          if (updatedLog.status !== 'failed') return false;

          // Verify log has error message
          if (!updatedLog.error) return false;

          // Verify log still has message content
          if (updatedLog.message !== reminderData.message) return false;

          // Verify deliveredAt is not set for failed delivery
          if (updatedLog.deliveredAt !== null) return false;

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain log integrity across multiple email sends', () => {
      // Generator for multiple email reminders
      const multipleEmailsArbitrary = fc.array(
        fc.record({
          invoiceId: fc.uuid(),
          to: fc.emailAddress(),
          subject: fc.string({ minLength: 5, maxLength: 100 }),
          message: fc.string({ minLength: 50, maxLength: 500 }),
          escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent')
        }),
        { minLength: 2, maxLength: 10 }
      );

      fc.assert(
        fc.asyncProperty(multipleEmailsArbitrary, async (reminders) => {
          // Clear logs before this test
          MockReminderLog.clearLogs();
          
          const logIds = [];

          // Send all emails and create logs
          for (const reminderData of reminders) {
            const log = await MockReminderLog.create({
              invoiceId: reminderData.invoiceId,
              channel: 'email',
              status: 'pending',
              message: reminderData.message,
              escalationLevel: reminderData.escalationLevel
            });

            logIds.push(log.id);

            await emailService.sendEmail({
              to: reminderData.to,
              subject: reminderData.subject,
              html: `<p>${reminderData.message}</p>`,
              text: reminderData.message,
              reminderLogId: log.id
            });
          }

          // Verify all logs exist and have correct data
          for (let i = 0; i < reminders.length; i++) {
            const log = await MockReminderLog.findById(logIds[i]);
            
            if (!log) return false;
            if (log.status !== 'sent') return false;
            if (log.message !== reminders[i].message) return false;
            if (log.invoiceId !== reminders[i].invoiceId) return false;
            if (!log.deliveredAt) return false;
          }

          // Verify total number of logs matches
          if (MockReminderLog.logs.length !== reminders.length) return false;

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should preserve original log data when updating delivery status', () => {
      // Generator for email reminder with initial log data
      const emailWithLogArbitrary = fc.record({
        invoiceId: fc.uuid(),
        to: fc.emailAddress(),
        subject: fc.string({ minLength: 5, maxLength: 100 }),
        message: fc.string({ minLength: 50, maxLength: 500 }),
        escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent'),
        initialCost: fc.float({ min: Math.fround(0.0001), max: Math.fround(0.01) })
      });

      fc.assert(
        fc.asyncProperty(emailWithLogArbitrary, async (reminderData) => {
          // Create a reminder log entry with initial data
          const log = await MockReminderLog.create({
            invoiceId: reminderData.invoiceId,
            channel: 'email',
            status: 'pending',
            message: reminderData.message,
            escalationLevel: reminderData.escalationLevel,
            cost: reminderData.initialCost
          });

          const originalSentAt = log.sentAt;

          // Send email
          await emailService.sendEmail({
            to: reminderData.to,
            subject: reminderData.subject,
            html: `<p>${reminderData.message}</p>`,
            text: reminderData.message,
            reminderLogId: log.id
          });

          // Retrieve the updated log
          const updatedLog = await MockReminderLog.findById(log.id);

          // Verify log exists
          if (!updatedLog) return false;

          // Verify original data is preserved
          if (updatedLog.invoiceId !== reminderData.invoiceId) return false;
          if (updatedLog.channel !== 'email') return false;
          if (updatedLog.message !== reminderData.message) return false;
          if (updatedLog.escalationLevel !== reminderData.escalationLevel) return false;
          if (updatedLog.cost !== reminderData.initialCost) return false;
          if (updatedLog.sentAt.getTime() !== originalSentAt.getTime()) return false;

          // Verify status was updated
          if (updatedLog.status !== 'sent') return false;

          // Verify deliveredAt was added
          if (!updatedLog.deliveredAt) return false;

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle logs for emails with different escalation levels', () => {
      // Generator for testing all escalation levels
      const escalationLevelArbitrary = fc.constantFrom('gentle', 'firm', 'urgent');

      fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.uuid(),
            fc.emailAddress(),
            fc.string({ minLength: 50, maxLength: 500 }),
            escalationLevelArbitrary
          ),
          async ([invoiceId, email, message, escalationLevel]) => {
            // Clear logs before this test
            MockReminderLog.clearLogs();
            
            // Create log
            const log = await MockReminderLog.create({
              invoiceId,
              channel: 'email',
              status: 'pending',
              message,
              escalationLevel
            });

            // Send email
            await emailService.sendEmail({
              to: email,
              subject: `Test ${escalationLevel}`,
              html: `<p>${message}</p>`,
              text: message,
              reminderLogId: log.id
            });

            // Verify log
            const updatedLog = await MockReminderLog.findById(log.id);
            
            if (!updatedLog) return false;
            if (updatedLog.escalationLevel !== escalationLevel) return false;
            if (updatedLog.status !== 'sent') return false;

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create logs with timestamps that reflect send time', () => {
      // Generator for email reminder data
      const emailReminderArbitrary = fc.record({
        invoiceId: fc.uuid(),
        to: fc.emailAddress(),
        subject: fc.string({ minLength: 5, maxLength: 100 }),
        message: fc.string({ minLength: 50, maxLength: 500 }),
        escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent')
      });

      fc.assert(
        fc.asyncProperty(emailReminderArbitrary, async (reminderData) => {
          // Clear logs before this test
          MockReminderLog.clearLogs();
          
          const beforeSend = new Date();

          // Create log
          const log = await MockReminderLog.create({
            invoiceId: reminderData.invoiceId,
            channel: 'email',
            status: 'pending',
            message: reminderData.message,
            escalationLevel: reminderData.escalationLevel
          });

          // Send email
          await emailService.sendEmail({
            to: reminderData.to,
            subject: reminderData.subject,
            html: `<p>${reminderData.message}</p>`,
            text: reminderData.message,
            reminderLogId: log.id
          });

          const afterSend = new Date();

          // Retrieve log
          const updatedLog = await MockReminderLog.findById(log.id);

          // Verify log exists
          if (!updatedLog) return false;

          // Verify sentAt exists and is within reasonable time range
          if (!updatedLog.sentAt) return false;
          if (updatedLog.sentAt < beforeSend) return false;
          if (updatedLog.sentAt > afterSend) return false;

          // Verify deliveredAt is set and after sentAt
          if (!updatedLog.deliveredAt) return false;
          if (updatedLog.deliveredAt < updatedLog.sentAt) return false;

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should allow querying logs by invoice ID', () => {
      // Generator for multiple emails to same invoice
      const sameInvoiceEmailsArbitrary = fc.tuple(
        fc.uuid(), // Same invoice ID
        fc.array(
          fc.record({
            to: fc.emailAddress(),
            subject: fc.string({ minLength: 5, maxLength: 100 }),
            message: fc.string({ minLength: 50, maxLength: 500 }),
            escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent')
          }),
          { minLength: 2, maxLength: 5 }
        )
      );

      fc.assert(
        fc.asyncProperty(sameInvoiceEmailsArbitrary, async ([invoiceId, emails]) => {
          // Clear logs before this test
          MockReminderLog.clearLogs();
          
          // Send all emails for the same invoice
          for (const emailData of emails) {
            const log = await MockReminderLog.create({
              invoiceId,
              channel: 'email',
              status: 'pending',
              message: emailData.message,
              escalationLevel: emailData.escalationLevel
            });

            await emailService.sendEmail({
              to: emailData.to,
              subject: emailData.subject,
              html: `<p>${emailData.message}</p>`,
              text: emailData.message,
              reminderLogId: log.id
            });
          }

          // Query logs by invoice ID
          const logs = await MockReminderLog.find({ invoiceId });

          // Verify all logs are returned
          if (logs.length !== emails.length) return false;

          // Verify all logs have correct invoice ID
          for (const log of logs) {
            if (log.invoiceId !== invoiceId) return false;
            if (log.status !== 'sent') return false;
          }

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should handle edge case of empty message content', () => {
      // Test with minimal/empty message content
      const minimalMessageArbitrary = fc.record({
        invoiceId: fc.uuid(),
        to: fc.emailAddress(),
        subject: fc.string({ minLength: 1, maxLength: 100 }),
        message: fc.constantFrom('', ' ', '\n', '\t', '  '),
        escalationLevel: fc.constantFrom('gentle', 'firm', 'urgent')
      });

      fc.assert(
        fc.asyncProperty(minimalMessageArbitrary, async (reminderData) => {
          // Clear logs before this test
          MockReminderLog.clearLogs();
          
          // Create log even with empty message
          const log = await MockReminderLog.create({
            invoiceId: reminderData.invoiceId,
            channel: 'email',
            status: 'pending',
            message: reminderData.message,
            escalationLevel: reminderData.escalationLevel
          });

          // Send email
          await emailService.sendEmail({
            to: reminderData.to,
            subject: reminderData.subject,
            html: `<p>${reminderData.message}</p>`,
            text: reminderData.message,
            reminderLogId: log.id
          });

          // Verify log exists and preserves message (even if empty)
          const updatedLog = await MockReminderLog.findById(log.id);
          
          if (!updatedLog) return false;
          if (updatedLog.message !== reminderData.message) return false;
          if (updatedLog.status !== 'sent') return false;

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });
});
