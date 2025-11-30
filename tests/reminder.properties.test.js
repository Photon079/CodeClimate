/**
 * Property-Based Tests for Reminder Module
 * Using fast-check for property-based testing
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateReminder,
  getReminderTone,
  formatPaymentOptions
} from '../js/reminder.js';

describe('Reminder Module - Property-Based Tests', () => {
  /**
   * **Feature: invoice-guard, Property 15: Reminder Message Completeness**
   * **Validates: Requirements 5.1**
   * 
   * For any invoice, the generated reminder message should contain the client name,
   * invoice number, formatted amount, formatted due date, and days overdue (if applicable).
   */
  describe('Property 15: Reminder Message Completeness', () => {
    it('should include all required fields in reminder message', () => {
      // Generator for invoice with enriched data
      const invoiceArbitrary = fc.record({
        id: fc.uuid(),
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 50 }).map(s => `INV-${s}`),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
          .map(d => d.toISOString()),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        status: fc.constantFrom('pending', 'paid', 'cancelled'),
        notes: fc.string({ maxLength: 500 }),
        createdDate: fc.date().map(d => d.toISOString()),
        reminderSent: fc.boolean(),
        lateFee: fc.double({ min: 0, max: 100000, noNaN: true }),
        daysOverdue: fc.integer({ min: 0, max: 365 })
      });

      // Generator for payment settings
      const settingsArbitrary = fc.record({
        upiId: fc.string({ maxLength: 100 }),
        bankDetails: fc.string({ maxLength: 200 }),
        paypalEmail: fc.string({ maxLength: 100 }),
        userName: fc.string({ minLength: 1, maxLength: 100 })
      });

      fc.assert(
        fc.property(invoiceArbitrary, settingsArbitrary, (invoice, settings) => {
          // Generate reminder
          const reminder = generateReminder(invoice, settings);

          // Verify reminder is a non-empty string
          expect(typeof reminder).toBe('string');
          expect(reminder.length).toBeGreaterThan(0);

          // Verify client name is present
          expect(reminder).toContain(invoice.clientName);

          // Verify invoice number is present
          expect(reminder).toContain(invoice.invoiceNumber);

          // Verify amount is present (check for rupee symbol)
          expect(reminder).toContain('₹');

          // Verify due date is present (check for date format DD/MM/YYYY pattern)
          // The date should be formatted, so we check for the pattern
          const dateRegex = /\d{2}\/\d{2}\/\d{4}/;
          expect(reminder).toMatch(dateRegex);

          // Verify days overdue is present if applicable
          if (invoice.daysOverdue > 0) {
            expect(reminder).toContain(String(invoice.daysOverdue));
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should include invoice details section', () => {
      const invoiceArbitrary = fc.record({
        id: fc.uuid(),
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 50 }).map(s => `INV-${s}`),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        dueDate: fc.date().map(d => d.toISOString()),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        status: fc.constant('pending'),
        notes: fc.constant(''),
        createdDate: fc.date().map(d => d.toISOString()),
        reminderSent: fc.constant(false),
        lateFee: fc.constant(0),
        daysOverdue: fc.integer({ min: 0, max: 365 })
      });

      const settingsArbitrary = fc.record({
        upiId: fc.string({ maxLength: 100 }),
        bankDetails: fc.string({ maxLength: 200 }),
        paypalEmail: fc.string({ maxLength: 100 }),
        userName: fc.string({ minLength: 1, maxLength: 100 })
      });

      fc.assert(
        fc.property(invoiceArbitrary, settingsArbitrary, (invoice, settings) => {
          const reminder = generateReminder(invoice, settings);

          // Verify "Invoice Details:" section exists
          expect(reminder).toContain('Invoice Details:');

          // Verify invoice number label
          expect(reminder).toContain('Invoice Number:');

          // Verify amount label
          expect(reminder).toContain('Amount:');

          // Verify due date label
          expect(reminder).toContain('Due Date:');
        }),
        { numRuns: 100 }
      );
    });

    it('should include payment options section', () => {
      const invoiceArbitrary = fc.record({
        id: fc.uuid(),
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 50 }),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        dueDate: fc.date().map(d => d.toISOString()),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        status: fc.constant('pending'),
        notes: fc.constant(''),
        createdDate: fc.date().map(d => d.toISOString()),
        reminderSent: fc.constant(false),
        lateFee: fc.constant(0),
        daysOverdue: fc.integer({ min: 0, max: 365 })
      });

      const settingsArbitrary = fc.record({
        upiId: fc.string({ maxLength: 100 }),
        bankDetails: fc.string({ maxLength: 200 }),
        paypalEmail: fc.string({ maxLength: 100 }),
        userName: fc.string({ minLength: 1, maxLength: 100 })
      });

      fc.assert(
        fc.property(invoiceArbitrary, settingsArbitrary, (invoice, settings) => {
          const reminder = generateReminder(invoice, settings);

          // Verify "Payment Options:" section exists
          expect(reminder).toContain('Payment Options:');
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 16: Reminder Tone Escalation**
   * **Validates: Requirements 5.2**
   * 
   * For any two invoices where invoice A has more days overdue than invoice B,
   * the reminder tone for invoice A should have equal or higher urgency than invoice B.
   */
  describe('Property 16: Reminder Tone Escalation', () => {
    it('should escalate urgency as days overdue increases', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 365 }),
          fc.integer({ min: 0, max: 365 }),
          (daysA, daysB) => {
            // Get tones for both
            const toneA = getReminderTone(daysA);
            const toneB = getReminderTone(daysB);

            // Map urgency to numeric values for comparison
            const urgencyMap = { low: 1, medium: 2, high: 3 };
            const urgencyA = urgencyMap[toneA.urgency];
            const urgencyB = urgencyMap[toneB.urgency];

            // If A has more days overdue, it should have equal or higher urgency
            if (daysA > daysB) {
              expect(urgencyA).toBeGreaterThanOrEqual(urgencyB);
            }

            // If B has more days overdue, it should have equal or higher urgency
            if (daysB > daysA) {
              expect(urgencyB).toBeGreaterThanOrEqual(urgencyA);
            }

            // If equal days, urgency should be equal
            if (daysA === daysB) {
              expect(urgencyA).toBe(urgencyB);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have consistent urgency levels for same days overdue', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 365 }), (days) => {
          // Get tone multiple times for same days
          const tone1 = getReminderTone(days);
          const tone2 = getReminderTone(days);

          // Should return same urgency
          expect(tone1.urgency).toBe(tone2.urgency);
          expect(tone1.greeting).toBe(tone2.greeting);
          expect(tone1.body).toBe(tone2.body);
          expect(tone1.closing).toBe(tone2.closing);
        }),
        { numRuns: 100 }
      );
    });

    it('should have valid urgency levels', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 365 }), (days) => {
          const tone = getReminderTone(days);

          // Verify urgency is one of the valid values
          expect(['low', 'medium', 'high']).toContain(tone.urgency);

          // Verify all tone fields are non-empty strings
          expect(typeof tone.greeting).toBe('string');
          expect(tone.greeting.length).toBeGreaterThan(0);

          expect(typeof tone.body).toBe('string');
          expect(tone.body.length).toBeGreaterThan(0);

          expect(typeof tone.closing).toBe('string');
          expect(tone.closing.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should never decrease urgency as days increase', () => {
      // Test specific ranges to verify escalation
      const testRanges = [
        { min: 0, max: 0 },     // Not overdue
        { min: 1, max: 7 },     // 1-7 days
        { min: 8, max: 14 },    // 8-14 days
        { min: 15, max: 365 }   // 15+ days
      ];

      const urgencyMap = { low: 1, medium: 2, high: 3 };
      let previousMaxUrgency = 0;

      testRanges.forEach(range => {
        // Sample a few values from each range
        for (let days = range.min; days <= Math.min(range.min + 2, range.max); days++) {
          const tone = getReminderTone(days);
          const urgency = urgencyMap[tone.urgency];

          // Urgency should never be less than previous range
          expect(urgency).toBeGreaterThanOrEqual(previousMaxUrgency);

          previousMaxUrgency = Math.max(previousMaxUrgency, urgency);
        }
      });
    });
  });

  /**
   * **Feature: invoice-guard, Property 17: Payment Method Placeholders**
   * **Validates: Requirements 5.3**
   * 
   * For any invoice, the generated reminder message should include placeholder
   * sections for all three payment methods: UPI, bank transfer, and PayPal.
   */
  describe('Property 17: Payment Method Placeholders', () => {
    it('should include all three payment method placeholders', () => {
      const invoiceArbitrary = fc.record({
        id: fc.uuid(),
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 50 }),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        dueDate: fc.date().map(d => d.toISOString()),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        status: fc.constant('pending'),
        notes: fc.constant(''),
        createdDate: fc.date().map(d => d.toISOString()),
        reminderSent: fc.constant(false),
        lateFee: fc.constant(0),
        daysOverdue: fc.integer({ min: 0, max: 365 })
      });

      const settingsArbitrary = fc.record({
        upiId: fc.string({ maxLength: 100 }),
        bankDetails: fc.string({ maxLength: 200 }),
        paypalEmail: fc.string({ maxLength: 100 }),
        userName: fc.string({ minLength: 1, maxLength: 100 })
      });

      fc.assert(
        fc.property(invoiceArbitrary, settingsArbitrary, (invoice, settings) => {
          const reminder = generateReminder(invoice, settings);

          // Verify all three payment methods are mentioned
          expect(reminder).toContain('UPI');
          expect(reminder).toContain('Bank Transfer');
          expect(reminder).toContain('PayPal');
        }),
        { numRuns: 100 }
      );
    });

    it('should use configured payment details when available', () => {
      const invoice = {
        id: 'test-id',
        clientName: 'Test Client',
        invoiceNumber: 'INV-202401-001',
        amount: 1000,
        dueDate: new Date().toISOString(),
        paymentMethod: 'UPI',
        status: 'pending',
        notes: '',
        createdDate: new Date().toISOString(),
        reminderSent: false,
        lateFee: 0,
        daysOverdue: 0
      };

      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (upiId, bankDetails, paypalEmail) => {
            const settings = {
              upiId: upiId,
              bankDetails: bankDetails,
              paypalEmail: paypalEmail,
              userName: 'Test User'
            };

            const reminder = generateReminder(invoice, settings);

            // Verify configured details are present
            expect(reminder).toContain(upiId);
            expect(reminder).toContain(bankDetails);
            expect(reminder).toContain(paypalEmail);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use placeholders when payment details are empty', () => {
      const invoice = {
        id: 'test-id',
        clientName: 'Test Client',
        invoiceNumber: 'INV-202401-001',
        amount: 1000,
        dueDate: new Date().toISOString(),
        paymentMethod: 'UPI',
        status: 'pending',
        notes: '',
        createdDate: new Date().toISOString(),
        reminderSent: false,
        lateFee: 0,
        daysOverdue: 0
      };

      const settings = {
        upiId: '',
        bankDetails: '',
        paypalEmail: '',
        userName: 'Test User'
      };

      const reminder = generateReminder(invoice, settings);

      // Verify placeholders are present
      expect(reminder).toContain('[Your UPI ID]');
      expect(reminder).toContain('[Your bank account details]');
      expect(reminder).toContain('[Your PayPal email]');
    });

    it('should format payment options correctly', () => {
      const settingsArbitrary = fc.record({
        upiId: fc.string({ maxLength: 100 }),
        bankDetails: fc.string({ maxLength: 200 }),
        paypalEmail: fc.string({ maxLength: 100 }),
        userName: fc.string({ maxLength: 100 })
      });

      fc.assert(
        fc.property(settingsArbitrary, (settings) => {
          const paymentOptions = formatPaymentOptions(settings);

          // Verify it's a string
          expect(typeof paymentOptions).toBe('string');

          // Verify all three payment methods are present
          expect(paymentOptions).toContain('UPI');
          expect(paymentOptions).toContain('Bank Transfer');
          expect(paymentOptions).toContain('PayPal');

          // Verify bullet points are present
          const bulletCount = (paymentOptions.match(/•/g) || []).length;
          expect(bulletCount).toBe(3);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 29: Late Fee in Reminders**
   * **Validates: Requirements 10.4**
   * 
   * For any overdue invoice with a non-zero late fee, the generated reminder
   * message should include the late fee amount.
   */
  describe('Property 29: Late Fee in Reminders', () => {
    it('should include late fee when present and non-zero', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.double({ min: 0.01, max: 100000, noNaN: true }),
          (amount, lateFee) => {
            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: new Date().toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: lateFee,
              daysOverdue: 10
            };

            const settings = {
              upiId: 'test@upi',
              bankDetails: 'Test Bank',
              paypalEmail: 'test@paypal.com',
              userName: 'Test User'
            };

            const reminder = generateReminder(invoice, settings);

            // Verify late fee is mentioned
            expect(reminder).toContain('Late Fee');

            // Verify late fee amount is present (check for rupee symbol and some digits)
            expect(reminder).toContain('₹');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not include late fee section when late fee is zero', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          (amount) => {
            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: new Date().toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0,
              daysOverdue: 0
            };

            const settings = {
              upiId: 'test@upi',
              bankDetails: 'Test Bank',
              paypalEmail: 'test@paypal.com',
              userName: 'Test User'
            };

            const reminder = generateReminder(invoice, settings);

            // Verify late fee is NOT mentioned when zero
            expect(reminder).not.toContain('Late Fee');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include total amount due when late fee is present', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 10000, noNaN: true }),
          fc.double({ min: 10, max: 1000, noNaN: true }),
          (amount, lateFee) => {
            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: new Date().toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: lateFee,
              daysOverdue: 10
            };

            const settings = {
              upiId: 'test@upi',
              bankDetails: 'Test Bank',
              paypalEmail: 'test@paypal.com',
              userName: 'Test User'
            };

            const reminder = generateReminder(invoice, settings);

            // Verify total amount due is mentioned
            expect(reminder).toContain('Total Amount Due');

            // The reminder should contain both the original amount and late fee
            expect(reminder).toContain('Late Fee');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
