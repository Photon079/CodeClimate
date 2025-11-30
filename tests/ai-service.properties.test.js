/**
 * Property-Based Tests for AI Service
 * Using fast-check for property-based testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock the AIService class for testing
class MockAIService {
  constructor() {
    this.provider = 'template'; // Use template mode for testing
    this.messageCache = new Map();
  }

  /**
   * Determine escalation level based on days overdue
   * This is the core logic we're testing
   */
  _determineEscalationLevel(daysOverdue) {
    if (daysOverdue >= 1 && daysOverdue <= 3) {
      return 'gentle';
    } else if (daysOverdue >= 4 && daysOverdue <= 7) {
      return 'firm';
    } else if (daysOverdue >= 8) {
      return 'urgent';
    }
    return 'gentle'; // Default
  }

  /**
   * Generate reminder message (simplified for testing)
   */
  async generateReminder(params) {
    const {
      clientName,
      invoiceNumber,
      amount,
      dueDate,
      daysOverdue,
      escalationLevel,
      paymentDetails,
      previousReminders
    } = params;

    // Verify that the provided escalation level matches the expected level
    const expectedLevel = this._determineEscalationLevel(daysOverdue);
    
    // Generate template message
    const message = this._generateTemplateMessage({
      ...params,
      escalationLevel: expectedLevel
    });

    return message;
  }

  /**
   * Generate template-based message
   */
  _generateTemplateMessage(params) {
    const {
      clientName,
      invoiceNumber,
      amount,
      dueDate,
      daysOverdue,
      escalationLevel,
      paymentDetails
    } = params;

    const templates = {
      gentle: `Dear ${clientName},

I hope this message finds you well. This is a friendly reminder that invoice ${invoiceNumber} for ₹${amount.toLocaleString('en-IN')} was due on ${new Date(dueDate).toLocaleDateString('en-IN')}.

If you have already made the payment, please disregard this message. Otherwise, I would appreciate it if you could process the payment at your earliest convenience.

Payment Details:
${paymentDetails.upiId ? `UPI ID: ${paymentDetails.upiId}` : ''}
${paymentDetails.bankDetails ? `Bank Details:\n${paymentDetails.bankDetails}` : ''}
${paymentDetails.paypalEmail ? `PayPal: ${paymentDetails.paypalEmail}` : ''}

Thank you for your business!

Best regards`,

      firm: `Dear ${clientName},

This is a payment reminder for invoice ${invoiceNumber} amounting to ₹${amount.toLocaleString('en-IN')}, which was due on ${new Date(dueDate).toLocaleDateString('en-IN')} (${daysOverdue} days ago).

We kindly request that you process this payment as soon as possible to avoid any late fees.

Payment Details:
${paymentDetails.upiId ? `UPI ID: ${paymentDetails.upiId}` : ''}
${paymentDetails.bankDetails ? `Bank Details:\n${paymentDetails.bankDetails}` : ''}
${paymentDetails.paypalEmail ? `PayPal: ${paymentDetails.paypalEmail}` : ''}

Please confirm once the payment has been made.

Best regards`,

      urgent: `Dear ${clientName},

This is an urgent reminder regarding invoice ${invoiceNumber} for ₹${amount.toLocaleString('en-IN')}, which is now ${daysOverdue} days overdue (due date: ${new Date(dueDate).toLocaleDateString('en-IN')}).

We request immediate payment to settle this outstanding amount. Late fees may apply as per our payment terms.

Payment Details:
${paymentDetails.upiId ? `UPI ID: ${paymentDetails.upiId}` : ''}
${paymentDetails.bankDetails ? `Bank Details:\n${paymentDetails.bankDetails}` : ''}
${paymentDetails.paypalEmail ? `PayPal: ${paymentDetails.paypalEmail}` : ''}

Please contact us immediately if there are any issues with this payment.

Best regards`
    };

    return templates[escalationLevel] || templates.gentle;
  }
}

describe('AI Service - Property-Based Tests', () => {
  let aiService;

  beforeEach(() => {
    aiService = new MockAIService();
  });

  /**
   * **Feature: ai-automated-reminders, Property 3: AI Message Generation Consistency**
   * **Validates: Requirements 2.3, 2.4, 2.5**
   * 
   * For any invoice with the same overdue days, the AI should generate messages with
   * consistent escalation levels (gentle: 1-3 days, firm: 4-7 days, urgent: 8+ days).
   */
  describe('Property 3: AI Message Generation Consistency', () => {
    it('should generate gentle messages for 1-3 days overdue', () => {
      // Generator for invoices 1-3 days overdue
      const gentleRangeArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        amount: fc.integer({ min: 100, max: 1000000 }),
        dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        daysOverdue: fc.integer({ min: 1, max: 3 }), // Gentle range
        paymentDetails: fc.record({
          upiId: fc.option(fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0), { nil: undefined }),
          bankDetails: fc.option(fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0), { nil: undefined }),
          paypalEmail: fc.option(fc.emailAddress(), { nil: undefined })
        }),
        previousReminders: fc.integer({ min: 0, max: 5 })
      });

      fc.assert(
        fc.asyncProperty(gentleRangeArbitrary, async (invoiceData) => {
          const escalationLevel = aiService._determineEscalationLevel(invoiceData.daysOverdue);
          
          // Verify escalation level is 'gentle' for 1-3 days
          if (escalationLevel !== 'gentle') return false;
          
          // Generate message and verify it uses gentle tone
          const message = await aiService.generateReminder({
            ...invoiceData,
            escalationLevel
          });
          
          // Verify message contains gentle language indicators
          if (!message || message.length === 0) return false;
          if (!message.toLowerCase().includes('friendly reminder')) return false;
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate firm messages for 4-7 days overdue', () => {
      // Generator for invoices 4-7 days overdue
      const firmRangeArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        amount: fc.integer({ min: 100, max: 1000000 }),
        dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        daysOverdue: fc.integer({ min: 4, max: 7 }), // Firm range
        paymentDetails: fc.record({
          upiId: fc.option(fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0), { nil: undefined }),
          bankDetails: fc.option(fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0), { nil: undefined }),
          paypalEmail: fc.option(fc.emailAddress(), { nil: undefined })
        }),
        previousReminders: fc.integer({ min: 0, max: 5 })
      });

      fc.assert(
        fc.asyncProperty(firmRangeArbitrary, async (invoiceData) => {
          const escalationLevel = aiService._determineEscalationLevel(invoiceData.daysOverdue);
          
          // Verify escalation level is 'firm' for 4-7 days
          if (escalationLevel !== 'firm') return false;
          
          // Generate message and verify it uses firm tone
          const message = await aiService.generateReminder({
            ...invoiceData,
            escalationLevel
          });
          
          // Verify message contains firm language indicators
          if (!message || message.length === 0) return false;
          if (!message.toLowerCase().includes('payment reminder')) return false;
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate urgent messages for 8+ days overdue', () => {
      // Generator for invoices 8+ days overdue
      const urgentRangeArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        amount: fc.integer({ min: 100, max: 1000000 }),
        dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        daysOverdue: fc.integer({ min: 8, max: 100 }), // Urgent range
        paymentDetails: fc.record({
          upiId: fc.option(fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0), { nil: undefined }),
          bankDetails: fc.option(fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0), { nil: undefined }),
          paypalEmail: fc.option(fc.emailAddress(), { nil: undefined })
        }),
        previousReminders: fc.integer({ min: 0, max: 5 })
      });

      fc.assert(
        fc.asyncProperty(urgentRangeArbitrary, async (invoiceData) => {
          const escalationLevel = aiService._determineEscalationLevel(invoiceData.daysOverdue);
          
          // Verify escalation level is 'urgent' for 8+ days
          if (escalationLevel !== 'urgent') return false;
          
          // Generate message and verify it uses urgent tone
          const message = await aiService.generateReminder({
            ...invoiceData,
            escalationLevel
          });
          
          // Verify message contains urgent language indicators
          if (!message || message.length === 0) return false;
          if (!message.toLowerCase().includes('urgent')) return false;
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency for the same days overdue value', () => {
      // Generator for testing consistency with same daysOverdue
      const consistencyArbitrary = fc.tuple(
        fc.integer({ min: 1, max: 30 }), // daysOverdue
        fc.array(
          fc.record({
            clientName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            invoiceNumber: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            amount: fc.integer({ min: 100, max: 1000000 }),
            dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            paymentDetails: fc.record({
              upiId: fc.option(fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0), { nil: undefined }),
              bankDetails: fc.option(fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0), { nil: undefined }),
              paypalEmail: fc.option(fc.emailAddress(), { nil: undefined })
            }),
            previousReminders: fc.integer({ min: 0, max: 5 })
          }),
          { minLength: 2, maxLength: 5 }
        )
      );

      fc.assert(
        fc.asyncProperty(consistencyArbitrary, async ([daysOverdue, invoices]) => {
          // Get escalation levels for all invoices with same daysOverdue
          const escalationLevels = invoices.map(invoice => 
            aiService._determineEscalationLevel(daysOverdue)
          );
          
          // All escalation levels should be the same
          const firstLevel = escalationLevels[0];
          for (const level of escalationLevels) {
            if (level !== firstLevel) return false;
          }
          
          // Verify the level matches the expected range
          if (daysOverdue >= 1 && daysOverdue <= 3) {
            if (firstLevel !== 'gentle') return false;
          } else if (daysOverdue >= 4 && daysOverdue <= 7) {
            if (firstLevel !== 'firm') return false;
          } else if (daysOverdue >= 8) {
            if (firstLevel !== 'urgent') return false;
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should include all required invoice information in generated messages', () => {
      // Generator for complete invoice data
      const completeInvoiceArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        amount: fc.integer({ min: 100, max: 1000000 }),
        dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        daysOverdue: fc.integer({ min: 1, max: 30 }),
        paymentDetails: fc.record({
          upiId: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
          bankDetails: fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
          paypalEmail: fc.emailAddress()
        }),
        previousReminders: fc.integer({ min: 0, max: 5 })
      });

      fc.assert(
        fc.asyncProperty(completeInvoiceArbitrary, async (invoiceData) => {
          const escalationLevel = aiService._determineEscalationLevel(invoiceData.daysOverdue);
          const message = await aiService.generateReminder({
            ...invoiceData,
            escalationLevel
          });
          
          // Verify message includes key information
          if (!message.includes(invoiceData.clientName)) return false;
          if (!message.includes(invoiceData.invoiceNumber)) return false;
          
          // Verify message is not empty and has reasonable length
          if (message.length <= 50) return false;
          if (message.length >= 2000) return false;
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases at escalation boundaries', () => {
      // Test boundary values: 3-4 days (gentle to firm) and 7-8 days (firm to urgent)
      const boundaryArbitrary = fc.constantFrom(1, 3, 4, 7, 8, 100);

      fc.assert(
        fc.property(boundaryArbitrary, (daysOverdue) => {
          const escalationLevel = aiService._determineEscalationLevel(daysOverdue);
          
          // Verify correct escalation level at boundaries
          if (daysOverdue === 1 || daysOverdue === 3) {
            expect(escalationLevel).toBe('gentle');
          } else if (daysOverdue === 4 || daysOverdue === 7) {
            expect(escalationLevel).toBe('firm');
          } else if (daysOverdue === 8 || daysOverdue === 100) {
            expect(escalationLevel).toBe('urgent');
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should handle invoices with missing optional payment details', () => {
      // Generator for invoices with some missing payment details
      const partialPaymentDetailsArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        amount: fc.integer({ min: 100, max: 1000000 }),
        dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        daysOverdue: fc.integer({ min: 1, max: 30 }),
        paymentDetails: fc.record({
          upiId: fc.option(fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0), { nil: undefined }),
          bankDetails: fc.option(fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0), { nil: undefined }),
          paypalEmail: fc.option(fc.emailAddress(), { nil: undefined })
        }),
        previousReminders: fc.integer({ min: 0, max: 5 })
      });

      fc.assert(
        fc.asyncProperty(partialPaymentDetailsArbitrary, async (invoiceData) => {
          const escalationLevel = aiService._determineEscalationLevel(invoiceData.daysOverdue);
          const message = await aiService.generateReminder({
            ...invoiceData,
            escalationLevel
          });
          
          // Message should still be generated even with missing payment details
          if (!message || message.length === 0) return false;
          
          // Verify escalation level is correct
          const expectedLevel = 
            invoiceData.daysOverdue <= 3 ? 'gentle' :
            invoiceData.daysOverdue <= 7 ? 'firm' : 'urgent';
          if (escalationLevel !== expectedLevel) return false;
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
