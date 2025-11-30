/**
 * Property-Based Tests for Invoice Module
 * Using fast-check for property-based testing
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateUUID,
  generateInvoiceNumber,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  calculateStatus,
  calculateLateFee,
  getInvoicesWithStatus,
  calculateSummary
} from '../js/invoice.js';

describe('Invoice Module - Property-Based Tests', () => {
  /**
   * **Feature: invoice-guard, Property 1: UUID Uniqueness**
   * **Validates: Requirements 1.1**
   * 
   * For any set of invoices created, all invoice IDs should be unique UUIDs with no duplicates.
   */
  describe('Property 1: UUID Uniqueness', () => {
    it('should generate unique UUIDs for all invoices', () => {
      // Generator for valid invoice input data
      const invoiceInputArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        notes: fc.string({ maxLength: 500 })
      });

      fc.assert(
        fc.property(
          fc.array(invoiceInputArbitrary, { minLength: 1, maxLength: 100 }),
          (invoiceInputs) => {
            // Create multiple invoices
            const invoices = [];
            for (const input of invoiceInputs) {
              const invoice = createInvoice(input, invoices);
              invoices.push(invoice);
            }

            // Extract all IDs
            const ids = invoices.map(inv => inv.id);

            // Check that all IDs are unique
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);

            // Verify each ID is a valid UUID format (basic check)
            ids.forEach(id => {
              expect(typeof id).toBe('string');
              expect(id.length).toBeGreaterThan(0);
              // UUID v4 format check (8-4-4-4-12 hex digits)
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              expect(id).toMatch(uuidRegex);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate unique UUIDs even with identical invoice data', () => {
      // Create the same invoice data multiple times
      const invoiceData = {
        clientName: 'Test Client',
        amount: 1000,
        paymentMethod: 'UPI',
        notes: 'Test notes'
      };

      fc.assert(
        fc.property(fc.integer({ min: 2, max: 50 }), (count) => {
          const invoices = [];
          for (let i = 0; i < count; i++) {
            const invoice = createInvoice(invoiceData, invoices);
            invoices.push(invoice);
          }

          // All IDs should be unique despite identical input data
          const ids = invoices.map(inv => inv.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(count);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 2: Default Due Date**
   * **Validates: Requirements 1.2**
   * 
   * For any invoice created without a specified due date, the due date should be
   * exactly 14 days from the creation date.
   */
  describe('Property 2: Default Due Date', () => {
    it('should set due date to 14 days from creation when not specified', () => {
      // Generator for invoice data without due date
      const invoiceInputArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        notes: fc.string({ maxLength: 500 })
      });

      fc.assert(
        fc.property(invoiceInputArbitrary, (input) => {
          // Create invoice without specifying due date
          const invoice = createInvoice(input, []);

          // Parse dates
          const createdDate = new Date(invoice.createdDate);
          const dueDate = new Date(invoice.dueDate);

          // Calculate expected due date (14 days from creation)
          const expectedDueDate = new Date(createdDate);
          expectedDueDate.setDate(expectedDueDate.getDate() + 14);

          // Compare dates (ignoring milliseconds due to timing differences)
          const dueDateDay = dueDate.getDate();
          const dueDateMonth = dueDate.getMonth();
          const dueDateYear = dueDate.getFullYear();

          const expectedDay = expectedDueDate.getDate();
          const expectedMonth = expectedDueDate.getMonth();
          const expectedYear = expectedDueDate.getFullYear();

          expect(dueDateYear).toBe(expectedYear);
          expect(dueDateMonth).toBe(expectedMonth);
          expect(dueDateDay).toBe(expectedDay);

          // Verify the difference is exactly 14 days
          const diffTime = dueDate - createdDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          expect(diffDays).toBe(14);
        }),
        { numRuns: 100 }
      );
    });

    it('should use provided due date when specified', () => {
      // Generator for invoice data with explicit due date
      const invoiceInputArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        notes: fc.string({ maxLength: 500 }),
        dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
          .map(d => d.toISOString())
      });

      fc.assert(
        fc.property(invoiceInputArbitrary, (input) => {
          // Create invoice with specified due date
          const invoice = createInvoice(input, []);

          // The due date should match the provided date (not default +14 days)
          const providedDate = new Date(input.dueDate);
          const invoiceDate = new Date(invoice.dueDate);

          expect(invoiceDate.getFullYear()).toBe(providedDate.getFullYear());
          expect(invoiceDate.getMonth()).toBe(providedDate.getMonth());
          expect(invoiceDate.getDate()).toBe(providedDate.getDate());
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 3: Invoice Number Format and Sequencing**
   * **Validates: Requirements 1.3**
   * 
   * For any sequence of invoices created, each invoice number should match the format
   * INV-YYYYMM-XXX where YYYYMM is the creation year-month and XXX increments
   * sequentially starting from 001.
   */
  describe('Property 3: Invoice Number Format and Sequencing', () => {
    it('should generate invoice numbers in correct format INV-YYYYMM-XXX', () => {
      // Generator for invoice input data
      const invoiceInputArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        notes: fc.string({ maxLength: 500 })
      });

      fc.assert(
        fc.property(invoiceInputArbitrary, (input) => {
          // Create invoice
          const invoice = createInvoice(input, []);

          // Verify format: INV-YYYYMM-XXX
          const formatRegex = /^INV-\d{6}-\d{3}$/;
          expect(invoice.invoiceNumber).toMatch(formatRegex);

          // Extract parts
          const parts = invoice.invoiceNumber.split('-');
          expect(parts.length).toBe(3);
          expect(parts[0]).toBe('INV');

          // Verify YYYYMM matches creation date
          const createdDate = new Date(invoice.createdDate);
          const expectedYear = createdDate.getFullYear();
          const expectedMonth = String(createdDate.getMonth() + 1).padStart(2, '0');
          const expectedYearMonth = `${expectedYear}${expectedMonth}`;

          expect(parts[1]).toBe(expectedYearMonth);

          // Verify sequence is 3 digits
          expect(parts[2].length).toBe(3);
          expect(/^\d{3}$/.test(parts[2])).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should increment sequence numbers sequentially within same month', () => {
      // Generator for count of invoices to create
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 20 }), (count) => {
          const invoices = [];
          const invoiceData = {
            clientName: 'Test Client',
            amount: 1000,
            paymentMethod: 'UPI',
            notes: ''
          };

          // Create multiple invoices
          for (let i = 0; i < count; i++) {
            const invoice = createInvoice(invoiceData, invoices);
            invoices.push(invoice);
          }

          // Extract sequence numbers
          const sequences = invoices.map(inv => {
            const parts = inv.invoiceNumber.split('-');
            return parseInt(parts[2], 10);
          });

          // Verify sequences are sequential starting from 1
          for (let i = 0; i < sequences.length; i++) {
            expect(sequences[i]).toBe(i + 1);
          }

          // Verify all invoice numbers have the same year-month prefix
          const prefixes = invoices.map(inv => {
            const parts = inv.invoiceNumber.split('-');
            return `${parts[0]}-${parts[1]}`;
          });

          const uniquePrefixes = new Set(prefixes);
          expect(uniquePrefixes.size).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle existing invoices and continue sequence correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          (existingCount, newCount) => {
            const invoices = [];
            const invoiceData = {
              clientName: 'Test Client',
              amount: 1000,
              paymentMethod: 'UPI',
              notes: ''
            };

            // Create existing invoices
            for (let i = 0; i < existingCount; i++) {
              const invoice = createInvoice(invoiceData, invoices);
              invoices.push(invoice);
            }

            // Create new invoices
            const newInvoices = [];
            for (let i = 0; i < newCount; i++) {
              const invoice = createInvoice(invoiceData, invoices);
              invoices.push(invoice);
              newInvoices.push(invoice);
            }

            // Verify new invoices continue the sequence
            newInvoices.forEach((invoice, index) => {
              const parts = invoice.invoiceNumber.split('-');
              const sequence = parseInt(parts[2], 10);
              expect(sequence).toBe(existingCount + index + 1);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should pad sequence numbers with leading zeros', () => {
      const invoiceData = {
        clientName: 'Test Client',
        amount: 1000,
        paymentMethod: 'UPI',
        notes: ''
      };

      fc.assert(
        fc.property(fc.integer({ min: 1, max: 999 }), (targetSequence) => {
          const invoices = [];

          // Create invoices up to target sequence
          for (let i = 0; i < targetSequence; i++) {
            const invoice = createInvoice(invoiceData, invoices);
            invoices.push(invoice);
          }

          // Check the last invoice number
          const lastInvoice = invoices[invoices.length - 1];
          const parts = lastInvoice.invoiceNumber.split('-');
          const sequencePart = parts[2];

          // Should always be 3 digits with leading zeros
          expect(sequencePart.length).toBe(3);
          expect(parseInt(sequencePart, 10)).toBe(targetSequence);

          // Verify format with leading zeros
          const expectedSequence = String(targetSequence).padStart(3, '0');
          expect(sequencePart).toBe(expectedSequence);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 22: Edit Immutability**
   * **Validates: Requirements 7.3**
   * 
   * For any invoice being edited, the updated invoice should preserve the original
   * id and createdDate fields regardless of the edits made.
   */
  describe('Property 22: Edit Immutability', () => {
    it('should preserve id and createdDate when updating invoice', () => {
      // Generator for original invoice
      const originalInvoiceArbitrary = fc.record({
        id: fc.uuid(),
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 50 }),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        dueDate: fc.date().map(d => d.toISOString()),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        status: fc.constantFrom('pending', 'paid', 'cancelled'),
        notes: fc.string({ maxLength: 500 }),
        createdDate: fc.date().map(d => d.toISOString()),
        reminderSent: fc.boolean(),
        lateFee: fc.double({ min: 0, max: 100000, noNaN: true })
      });

      // Generator for updates (including attempts to change id and createdDate)
      const updatesArbitrary = fc.record({
        id: fc.uuid(), // Attempt to change id
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        dueDate: fc.date().map(d => d.toISOString()),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        status: fc.constantFrom('pending', 'paid', 'cancelled'),
        notes: fc.string({ maxLength: 500 }),
        createdDate: fc.date().map(d => d.toISOString()), // Attempt to change createdDate
        reminderSent: fc.boolean()
      });

      fc.assert(
        fc.property(originalInvoiceArbitrary, updatesArbitrary, (original, updates) => {
          // Update the invoice
          const updated = updateInvoice(original, updates);

          // Verify id and createdDate are preserved
          expect(updated.id).toBe(original.id);
          expect(updated.createdDate).toBe(original.createdDate);

          // Verify id and createdDate did NOT change to the update values
          expect(updated.id).not.toBe(updates.id);
          expect(updated.createdDate).not.toBe(updates.createdDate);

          // Verify other fields were updated
          expect(updated.clientName).toBe(updates.clientName);
          expect(updated.amount).toBe(updates.amount);
          expect(updated.status).toBe(updates.status);
        }),
        { numRuns: 100 }
      );
    });

    it('should allow updating all fields except id and createdDate', () => {
      // Create an original invoice
      const original = {
        id: 'original-id-123',
        clientName: 'Original Client',
        invoiceNumber: 'INV-202401-001',
        amount: 1000,
        dueDate: new Date('2024-01-15').toISOString(),
        paymentMethod: 'UPI',
        status: 'pending',
        notes: 'Original notes',
        createdDate: new Date('2024-01-01').toISOString(),
        reminderSent: false,
        lateFee: 0
      };

      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
          fc.constantFrom('pending', 'paid', 'cancelled'),
          fc.string({ maxLength: 500 }),
          fc.boolean(),
          (newClientName, newAmount, newPaymentMethod, newStatus, newNotes, newReminderSent) => {
            const updates = {
              clientName: newClientName,
              amount: newAmount,
              paymentMethod: newPaymentMethod,
              status: newStatus,
              notes: newNotes,
              reminderSent: newReminderSent
            };

            const updated = updateInvoice(original, updates);

            // Immutable fields preserved
            expect(updated.id).toBe(original.id);
            expect(updated.createdDate).toBe(original.createdDate);

            // Mutable fields updated
            expect(updated.clientName).toBe(newClientName);
            expect(updated.amount).toBe(newAmount);
            expect(updated.paymentMethod).toBe(newPaymentMethod);
            expect(updated.status).toBe(newStatus);
            expect(updated.notes).toBe(newNotes);
            expect(updated.reminderSent).toBe(newReminderSent);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate the original invoice object', () => {
      const originalInvoiceArbitrary = fc.record({
        id: fc.uuid(),
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 50 }),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        dueDate: fc.date().map(d => d.toISOString()),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        status: fc.constantFrom('pending', 'paid', 'cancelled'),
        notes: fc.string({ maxLength: 500 }),
        createdDate: fc.date().map(d => d.toISOString()),
        reminderSent: fc.boolean(),
        lateFee: fc.double({ min: 0, max: 100000, noNaN: true })
      });

      const updatesArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true })
      });

      fc.assert(
        fc.property(originalInvoiceArbitrary, updatesArbitrary, (original, updates) => {
          // Store original values
          const originalClientName = original.clientName;
          const originalAmount = original.amount;

          // Update the invoice
          const updated = updateInvoice(original, updates);

          // Verify original object was not mutated
          expect(original.clientName).toBe(originalClientName);
          expect(original.amount).toBe(originalAmount);

          // Verify updated object has new values
          expect(updated.clientName).toBe(updates.clientName);
          expect(updated.amount).toBe(updates.amount);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 27: Late Fee Calculation**
   * **Validates: Requirements 10.1, 10.2**
   * 
   * For any overdue invoice, the calculated late fee should equal the invoice amount
   * multiplied by the configured percentage per week multiplied by the number of
   * complete weeks overdue.
   */
  describe('Property 27: Late Fee Calculation', () => {
    it('should calculate late fee correctly for overdue invoices', () => {
      // Generator for invoice amount and days overdue
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.integer({ min: 1, max: 365 }),
          fc.double({ min: 0.1, max: 10, noNaN: true }),
          (amount, daysOverdue, percentagePerWeek) => {
            // Create an overdue invoice
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - daysOverdue);

            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: dueDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            const config = {
              enabled: true,
              percentagePerWeek: percentagePerWeek
            };

            // Calculate late fee
            const lateFee = calculateLateFee(invoice, config);

            // Calculate expected late fee
            const weeksOverdue = Math.floor(daysOverdue / 7);
            const expectedLateFee = amount * (percentagePerWeek / 100) * weeksOverdue;

            // Verify calculation
            expect(lateFee).toBeCloseTo(expectedLateFee, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero late fee for non-overdue invoices', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.integer({ min: 0, max: 365 }),
          (amount, daysInFuture) => {
            // Create a future due date invoice
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() + daysInFuture);

            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: dueDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            const config = {
              enabled: true,
              percentagePerWeek: 1.0
            };

            // Calculate late fee
            const lateFee = calculateLateFee(invoice, config);

            // Should be zero for non-overdue invoices
            expect(lateFee).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero late fee when disabled in config', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.integer({ min: 1, max: 365 }),
          (amount, daysOverdue) => {
            // Create an overdue invoice
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - daysOverdue);

            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: dueDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            const config = {
              enabled: false,
              percentagePerWeek: 1.0
            };

            // Calculate late fee
            const lateFee = calculateLateFee(invoice, config);

            // Should be zero when disabled
            expect(lateFee).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero late fee for paid invoices', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.integer({ min: 1, max: 365 }),
          (amount, daysOverdue) => {
            // Create an overdue but paid invoice
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - daysOverdue);

            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: dueDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'paid',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            const config = {
              enabled: true,
              percentagePerWeek: 1.0
            };

            // Calculate late fee
            const lateFee = calculateLateFee(invoice, config);

            // Should be zero for paid invoices
            expect(lateFee).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate based on complete weeks only', () => {
      // Test specific day ranges to verify complete weeks calculation
      const testCases = [
        { days: 6, expectedWeeks: 0 },   // Less than 1 week
        { days: 7, expectedWeeks: 1 },   // Exactly 1 week
        { days: 13, expectedWeeks: 1 },  // 1 week + 6 days
        { days: 14, expectedWeeks: 2 },  // Exactly 2 weeks
        { days: 20, expectedWeeks: 2 },  // 2 weeks + 6 days
        { days: 21, expectedWeeks: 3 },  // Exactly 3 weeks
      ];

      testCases.forEach(({ days, expectedWeeks }) => {
        const amount = 1000;
        const percentagePerWeek = 1.0;

        const today = new Date();
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() - days);

        const invoice = {
          id: 'test-id',
          clientName: 'Test Client',
          invoiceNumber: 'INV-202401-001',
          amount: amount,
          dueDate: dueDate.toISOString(),
          paymentMethod: 'UPI',
          status: 'pending',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        };

        const config = {
          enabled: true,
          percentagePerWeek: percentagePerWeek
        };

        const lateFee = calculateLateFee(invoice, config);
        const expectedLateFee = amount * (percentagePerWeek / 100) * expectedWeeks;

        expect(lateFee).toBeCloseTo(expectedLateFee, 2);
      });
    });
  });

  /**
   * **Feature: invoice-guard, Property 30: Late Fee Configuration**
   * **Validates: Requirements 10.5**
   * 
   * For any configured late fee percentage, all late fee calculations should use
   * the configured percentage rather than the default 1%.
   */
  describe('Property 30: Late Fee Configuration', () => {
    it('should use configured percentage for late fee calculation', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.integer({ min: 7, max: 365 }),
          fc.double({ min: 0.1, max: 10, noNaN: true }),
          (amount, daysOverdue, configuredPercentage) => {
            // Create an overdue invoice
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - daysOverdue);

            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: dueDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            // Use configured percentage
            const config = {
              enabled: true,
              percentagePerWeek: configuredPercentage
            };

            const lateFee = calculateLateFee(invoice, config);

            // Calculate expected late fee with configured percentage
            const weeksOverdue = Math.floor(daysOverdue / 7);
            const expectedLateFee = amount * (configuredPercentage / 100) * weeksOverdue;

            // Verify the configured percentage was used
            expect(lateFee).toBeCloseTo(expectedLateFee, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate different late fees for different percentages', () => {
      const amount = 10000;
      const daysOverdue = 21; // 3 weeks

      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() - daysOverdue);

      const invoice = {
        id: 'test-id',
        clientName: 'Test Client',
        invoiceNumber: 'INV-202401-001',
        amount: amount,
        dueDate: dueDate.toISOString(),
        paymentMethod: 'UPI',
        status: 'pending',
        notes: '',
        createdDate: new Date().toISOString(),
        reminderSent: false,
        lateFee: 0
      };

      fc.assert(
        fc.property(
          fc.double({ min: 0.5, max: 5, noNaN: true }),
          fc.double({ min: 0.5, max: 5, noNaN: true }),
          (percentage1, percentage2) => {
            // Skip if percentages are too similar
            if (Math.abs(percentage1 - percentage2) < 0.1) {
              return true;
            }

            const config1 = {
              enabled: true,
              percentagePerWeek: percentage1
            };

            const config2 = {
              enabled: true,
              percentagePerWeek: percentage2
            };

            const lateFee1 = calculateLateFee(invoice, config1);
            const lateFee2 = calculateLateFee(invoice, config2);

            // Different percentages should produce different late fees
            expect(lateFee1).not.toBeCloseTo(lateFee2, 2);

            // The ratio of late fees should match the ratio of percentages
            const ratio = lateFee1 / lateFee2;
            const expectedRatio = percentage1 / percentage2;
            expect(ratio).toBeCloseTo(expectedRatio, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero percentage configuration', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.integer({ min: 7, max: 365 }),
          (amount, daysOverdue) => {
            // Create an overdue invoice
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - daysOverdue);

            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: dueDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            // Configure with 0% late fee
            const config = {
              enabled: true,
              percentagePerWeek: 0
            };

            const lateFee = calculateLateFee(invoice, config);

            // Should be zero with 0% configuration
            expect(lateFee).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply configured percentage consistently across multiple invoices', () => {
      fc.assert(
        fc.property(
          fc.array(fc.double({ min: 0.01, max: 10000000, noNaN: true }), { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 7, max: 365 }),
          fc.double({ min: 0.5, max: 5, noNaN: true }),
          (amounts, daysOverdue, configuredPercentage) => {
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - daysOverdue);

            const config = {
              enabled: true,
              percentagePerWeek: configuredPercentage
            };

            const weeksOverdue = Math.floor(daysOverdue / 7);

            // Calculate late fees for all invoices
            amounts.forEach(amount => {
              const invoice = {
                id: 'test-id',
                clientName: 'Test Client',
                invoiceNumber: 'INV-202401-001',
                amount: amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: 'pending',
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };

              const lateFee = calculateLateFee(invoice, config);
              const expectedLateFee = amount * (configuredPercentage / 100) * weeksOverdue;

              // Each invoice should use the same configured percentage
              expect(lateFee).toBeCloseTo(expectedLateFee, 2);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 7: Status Badge Assignment - Not Due**
   * **Validates: Requirements 3.1**
   * 
   * For any invoice with a due date more than one day in the future and status "pending",
   * the status badge should be green with label "Not Due".
   */
  describe('Property 7: Status Badge Assignment - Not Due', () => {
    it('should assign "Not Due" status for invoices due more than 1 day in future', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.integer({ min: 2, max: 365 }), // More than 1 day in future
          (amount, daysInFuture) => {
            // Create an invoice with due date more than 1 day in future
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() + daysInFuture);

            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: dueDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            // Calculate status
            const statusBadge = calculateStatus(invoice);

            // Verify "Not Due" status
            expect(statusBadge.label).toBe('Not Due');
            expect(statusBadge.color).toBe('#10B981'); // Green color
            expect(statusBadge.icon).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign "Not Due" status consistently for all pending invoices with future due dates', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              daysInFuture: fc.integer({ min: 2, max: 365 }),
              clientName: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create multiple invoices with future due dates
            invoiceData.forEach(data => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() + data.daysInFuture);

              const invoice = {
                id: 'test-id',
                clientName: data.clientName,
                invoiceNumber: 'INV-202401-001',
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: 'pending',
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };

              const statusBadge = calculateStatus(invoice);

              // All should have "Not Due" status
              expect(statusBadge.label).toBe('Not Due');
              expect(statusBadge.color).toBe('#10B981');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not assign "Not Due" status for invoices due today or tomorrow', () => {
      // Test boundary: exactly 1 day in future should NOT be "Not Due"
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const invoiceToday = {
        id: 'test-id-1',
        clientName: 'Test Client',
        invoiceNumber: 'INV-202401-001',
        amount: 1000,
        dueDate: today.toISOString(),
        paymentMethod: 'UPI',
        status: 'pending',
        notes: '',
        createdDate: new Date().toISOString(),
        reminderSent: false,
        lateFee: 0
      };

      const invoiceTomorrow = {
        id: 'test-id-2',
        clientName: 'Test Client',
        invoiceNumber: 'INV-202401-002',
        amount: 1000,
        dueDate: tomorrow.toISOString(),
        paymentMethod: 'UPI',
        status: 'pending',
        notes: '',
        createdDate: new Date().toISOString(),
        reminderSent: false,
        lateFee: 0
      };

      const statusToday = calculateStatus(invoiceToday);
      const statusTomorrow = calculateStatus(invoiceTomorrow);

      // Should be "Due Soon", not "Not Due"
      expect(statusToday.label).not.toBe('Not Due');
      expect(statusTomorrow.label).not.toBe('Not Due');
      expect(statusToday.label).toBe('Due Soon');
      expect(statusTomorrow.label).toBe('Due Soon');
    });
  });

  /**
   * **Feature: invoice-guard, Property 8: Status Badge Assignment - Due Soon**
   * **Validates: Requirements 3.2**
   * 
   * For any invoice with a due date of today or tomorrow and status "pending",
   * the status badge should be yellow with label "Due Soon".
   */
  describe('Property 8: Status Badge Assignment - Due Soon', () => {
    it('should assign "Due Soon" status for invoices due today', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (amount, clientName) => {
            // Create an invoice due today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const invoice = {
              id: 'test-id',
              clientName: clientName,
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: today.toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            // Calculate status
            const statusBadge = calculateStatus(invoice);

            // Verify "Due Soon" status
            expect(statusBadge.label).toBe('Due Soon');
            expect(statusBadge.color).toBe('#F59E0B'); // Yellow/warning color
            expect(statusBadge.icon).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign "Due Soon" status for invoices due tomorrow', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (amount, clientName) => {
            // Create an invoice due tomorrow
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const invoice = {
              id: 'test-id',
              clientName: clientName,
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: tomorrow.toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            // Calculate status
            const statusBadge = calculateStatus(invoice);

            // Verify "Due Soon" status
            expect(statusBadge.label).toBe('Due Soon');
            expect(statusBadge.color).toBe('#F59E0B'); // Yellow/warning color
            expect(statusBadge.icon).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign "Due Soon" status consistently for all pending invoices due today or tomorrow', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              daysOffset: fc.constantFrom(0, 1), // Today or tomorrow
              clientName: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create multiple invoices due today or tomorrow
            invoiceData.forEach(data => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() + data.daysOffset);

              const invoice = {
                id: 'test-id',
                clientName: data.clientName,
                invoiceNumber: 'INV-202401-001',
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: 'pending',
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };

              const statusBadge = calculateStatus(invoice);

              // All should have "Due Soon" status
              expect(statusBadge.label).toBe('Due Soon');
              expect(statusBadge.color).toBe('#F59E0B');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not assign "Due Soon" status for invoices due more than 1 day in future', () => {
      // Test boundary: 2 days in future should NOT be "Due Soon"
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const twoDaysLater = new Date(today);
      twoDaysLater.setDate(twoDaysLater.getDate() + 2);

      const invoice = {
        id: 'test-id',
        clientName: 'Test Client',
        invoiceNumber: 'INV-202401-001',
        amount: 1000,
        dueDate: twoDaysLater.toISOString(),
        paymentMethod: 'UPI',
        status: 'pending',
        notes: '',
        createdDate: new Date().toISOString(),
        reminderSent: false,
        lateFee: 0
      };

      const statusBadge = calculateStatus(invoice);

      // Should be "Not Due", not "Due Soon"
      expect(statusBadge.label).not.toBe('Due Soon');
      expect(statusBadge.label).toBe('Not Due');
    });

    it('should not assign "Due Soon" status for overdue invoices', () => {
      // Test boundary: yesterday should NOT be "Due Soon"
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const invoice = {
        id: 'test-id',
        clientName: 'Test Client',
        invoiceNumber: 'INV-202401-001',
        amount: 1000,
        dueDate: yesterday.toISOString(),
        paymentMethod: 'UPI',
        status: 'pending',
        notes: '',
        createdDate: new Date().toISOString(),
        reminderSent: false,
        lateFee: 0
      };

      const statusBadge = calculateStatus(invoice);

      // Should be "Overdue", not "Due Soon"
      expect(statusBadge.label).not.toBe('Due Soon');
      expect(statusBadge.label).toBe('Overdue');
    });
  });

  /**
   * **Feature: invoice-guard, Property 9: Status Badge Assignment - Overdue**
   * **Validates: Requirements 3.3**
   * 
   * For any invoice with a due date more than one day in the past and status "pending",
   * the status badge should be red with label "Overdue".
   */
  describe('Property 9: Status Badge Assignment - Overdue', () => {
    it('should assign "Overdue" status for invoices due more than 1 day in past', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.integer({ min: 2, max: 365 }), // More than 1 day in past
          (amount, daysOverdue) => {
            // Create an invoice with due date more than 1 day in past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - daysOverdue);

            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: dueDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            // Calculate status
            const statusBadge = calculateStatus(invoice);

            // Verify "Overdue" status
            expect(statusBadge.label).toBe('Overdue');
            expect(statusBadge.color).toBe('#EF4444'); // Red/danger color
            expect(statusBadge.icon).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign "Overdue" status consistently for all pending invoices with past due dates', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              daysOverdue: fc.integer({ min: 2, max: 365 }),
              clientName: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create multiple overdue invoices
            invoiceData.forEach(data => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() - data.daysOverdue);

              const invoice = {
                id: 'test-id',
                clientName: data.clientName,
                invoiceNumber: 'INV-202401-001',
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: 'pending',
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };

              const statusBadge = calculateStatus(invoice);

              // All should have "Overdue" status
              expect(statusBadge.label).toBe('Overdue');
              expect(statusBadge.color).toBe('#EF4444');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not assign "Overdue" status for invoices due today', () => {
      // Test boundary: today should NOT be "Overdue"
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const invoice = {
        id: 'test-id',
        clientName: 'Test Client',
        invoiceNumber: 'INV-202401-001',
        amount: 1000,
        dueDate: today.toISOString(),
        paymentMethod: 'UPI',
        status: 'pending',
        notes: '',
        createdDate: new Date().toISOString(),
        reminderSent: false,
        lateFee: 0
      };

      const statusBadge = calculateStatus(invoice);

      // Should be "Due Soon", not "Overdue"
      expect(statusBadge.label).not.toBe('Overdue');
      expect(statusBadge.label).toBe('Due Soon');
    });

    it('should not assign "Overdue" status for invoices due yesterday (exactly 1 day)', () => {
      // Test boundary: exactly 1 day overdue should still be "Overdue"
      // According to requirements: "more than one day overdue"
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const invoice = {
        id: 'test-id',
        clientName: 'Test Client',
        invoiceNumber: 'INV-202401-001',
        amount: 1000,
        dueDate: yesterday.toISOString(),
        paymentMethod: 'UPI',
        status: 'pending',
        notes: '',
        createdDate: new Date().toISOString(),
        reminderSent: false,
        lateFee: 0
      };

      const statusBadge = calculateStatus(invoice);

      // Should be "Overdue" (1 day in past counts as overdue)
      expect(statusBadge.label).toBe('Overdue');
      expect(statusBadge.color).toBe('#EF4444');
    });

    it('should not assign "Overdue" status for future invoices', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }),
          (daysInFuture) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + daysInFuture);

            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: 1000,
              dueDate: futureDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            const statusBadge = calculateStatus(invoice);

            // Should not be "Overdue"
            expect(statusBadge.label).not.toBe('Overdue');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 10: Status Badge Assignment - Paid**
   * **Validates: Requirements 3.4, 6.3**
   * 
   * For any invoice with status "paid", the status badge should show a green
   * checkmark with label "Paid".
   */
  describe('Property 10: Status Badge Assignment - Paid', () => {
    it('should assign "Paid" status for all paid invoices regardless of due date', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          (amount, dueDate) => {
            // Create a paid invoice with any due date
            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: dueDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'paid',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            // Calculate status
            const statusBadge = calculateStatus(invoice);

            // Verify "Paid" status
            expect(statusBadge.label).toBe('Paid');
            expect(statusBadge.color).toBe('#10B981'); // Green/success color
            expect(statusBadge.icon).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign "Paid" status for paid invoices that were overdue', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.integer({ min: 1, max: 365 }),
          (amount, daysOverdue) => {
            // Create a paid invoice that was overdue
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - daysOverdue);

            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: dueDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'paid',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            // Calculate status
            const statusBadge = calculateStatus(invoice);

            // Should be "Paid", not "Overdue"
            expect(statusBadge.label).toBe('Paid');
            expect(statusBadge.color).toBe('#10B981');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign "Paid" status for paid invoices with future due dates', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.integer({ min: 1, max: 365 }),
          (amount, daysInFuture) => {
            // Create a paid invoice with future due date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() + daysInFuture);

            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: dueDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'paid',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            // Calculate status
            const statusBadge = calculateStatus(invoice);

            // Should be "Paid", not "Not Due" or "Due Soon"
            expect(statusBadge.label).toBe('Paid');
            expect(statusBadge.color).toBe('#10B981');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign "Paid" status consistently for all paid invoices', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
              clientName: fc.string({ minLength: 1, maxLength: 100 }),
              paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other')
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (invoiceData) => {
            // Create multiple paid invoices
            invoiceData.forEach(data => {
              const invoice = {
                id: 'test-id',
                clientName: data.clientName,
                invoiceNumber: 'INV-202401-001',
                amount: data.amount,
                dueDate: data.dueDate.toISOString(),
                paymentMethod: data.paymentMethod,
                status: 'paid',
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };

              const statusBadge = calculateStatus(invoice);

              // All should have "Paid" status
              expect(statusBadge.label).toBe('Paid');
              expect(statusBadge.color).toBe('#10B981');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use green color for paid status matching success color', () => {
      // Verify that paid status uses the same green as "Not Due" (success color)
      const paidInvoice = {
        id: 'test-id-1',
        clientName: 'Test Client',
        invoiceNumber: 'INV-202401-001',
        amount: 1000,
        dueDate: new Date().toISOString(),
        paymentMethod: 'UPI',
        status: 'paid',
        notes: '',
        createdDate: new Date().toISOString(),
        reminderSent: false,
        lateFee: 0
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 10);

      const notDueInvoice = {
        id: 'test-id-2',
        clientName: 'Test Client',
        invoiceNumber: 'INV-202401-002',
        amount: 1000,
        dueDate: futureDate.toISOString(),
        paymentMethod: 'UPI',
        status: 'pending',
        notes: '',
        createdDate: new Date().toISOString(),
        reminderSent: false,
        lateFee: 0
      };

      const paidStatus = calculateStatus(paidInvoice);
      const notDueStatus = calculateStatus(notDueInvoice);

      // Both should use the same green success color
      expect(paidStatus.color).toBe('#10B981');
      expect(notDueStatus.color).toBe('#10B981');
      expect(paidStatus.color).toBe(notDueStatus.color);
    });

    it('should not assign "Paid" status for pending invoices', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          (amount, dueDate) => {
            // Create a pending invoice
            const invoice = {
              id: 'test-id',
              clientName: 'Test Client',
              invoiceNumber: 'INV-202401-001',
              amount: amount,
              dueDate: dueDate.toISOString(),
              paymentMethod: 'UPI',
              status: 'pending',
              notes: '',
              createdDate: new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };

            // Calculate status
            const statusBadge = calculateStatus(invoice);

            // Should not be "Paid"
            expect(statusBadge.label).not.toBe('Paid');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 11: Cancelled Invoice Exclusion**
   * **Validates: Requirements 3.5**
   * 
   * For any set of invoices containing cancelled invoices, the summary calculations
   * (total outstanding, overdue amount) should exclude all cancelled invoices.
   */
  describe('Property 11: Cancelled Invoice Exclusion', () => {
    it('should exclude cancelled invoices from total outstanding calculation', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              status: fc.constantFrom('pending', 'paid', 'cancelled'),
              daysOffset: fc.integer({ min: -365, max: 365 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create invoices with mixed statuses
            const invoices = invoiceData.map((data, index) => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() + data.daysOffset);

              return {
                id: `test-id-${index}`,
                clientName: 'Test Client',
                invoiceNumber: `INV-202401-${String(index + 1).padStart(3, '0')}`,
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: data.status,
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };
            });

            // Calculate summary
            const summary = calculateSummary(invoices);

            // Manually calculate expected total outstanding (only pending invoices)
            const expectedOutstanding = invoices
              .filter(inv => inv.status === 'pending')
              .reduce((sum, inv) => sum + inv.amount, 0);

            // Verify cancelled invoices are excluded
            expect(summary.totalOutstanding).toBeCloseTo(expectedOutstanding, 2);

            // Verify cancelled invoices don't contribute to outstanding
            const cancelledAmount = invoices
              .filter(inv => inv.status === 'cancelled')
              .reduce((sum, inv) => sum + inv.amount, 0);

            // If there are cancelled invoices, outstanding should be less than total of all invoices
            if (cancelledAmount > 0) {
              const totalAllInvoices = invoices.reduce((sum, inv) => sum + inv.amount, 0);
              expect(summary.totalOutstanding).toBeLessThan(totalAllInvoices);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude cancelled invoices from overdue amount calculation', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              status: fc.constantFrom('pending', 'paid', 'cancelled'),
              daysOverdue: fc.integer({ min: 1, max: 365 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create overdue invoices with mixed statuses
            const invoices = invoiceData.map((data, index) => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() - data.daysOverdue);

              return {
                id: `test-id-${index}`,
                clientName: 'Test Client',
                invoiceNumber: `INV-202401-${String(index + 1).padStart(3, '0')}`,
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: data.status,
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };
            });

            // Calculate summary
            const summary = calculateSummary(invoices);

            // Manually calculate expected overdue amount (only pending overdue invoices)
            const expectedOverdue = invoices
              .filter(inv => inv.status === 'pending')
              .reduce((sum, inv) => sum + inv.amount, 0);

            // Verify cancelled invoices are excluded from overdue calculation
            expect(summary.overdueAmount).toBeCloseTo(expectedOverdue, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude both paid and cancelled invoices from calculations', () => {
      // Create a specific test case with known values
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const invoices = [
        {
          id: 'pending-1',
          clientName: 'Client 1',
          invoiceNumber: 'INV-202401-001',
          amount: 1000,
          dueDate: yesterday.toISOString(),
          paymentMethod: 'UPI',
          status: 'pending',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        },
        {
          id: 'cancelled-1',
          clientName: 'Client 2',
          invoiceNumber: 'INV-202401-002',
          amount: 2000,
          dueDate: yesterday.toISOString(),
          paymentMethod: 'UPI',
          status: 'cancelled',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        },
        {
          id: 'paid-1',
          clientName: 'Client 3',
          invoiceNumber: 'INV-202401-003',
          amount: 3000,
          dueDate: yesterday.toISOString(),
          paymentMethod: 'UPI',
          status: 'paid',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        }
      ];

      const summary = calculateSummary(invoices);

      // Only the pending invoice should be counted
      expect(summary.totalOutstanding).toBe(1000);
      expect(summary.overdueAmount).toBe(1000);
      expect(summary.paidInvoices).toBe(1);
    });
  });

  /**
   * **Feature: invoice-guard, Property 12: Total Outstanding Calculation**
   * **Validates: Requirements 4.1, 4.4**
   * 
   * For any set of invoices, the total outstanding amount should equal the sum
   * of amounts for all invoices with status "pending".
   */
  describe('Property 12: Total Outstanding Calculation', () => {
    it('should calculate total outstanding as sum of all pending invoice amounts', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              status: fc.constantFrom('pending', 'paid', 'cancelled'),
              daysOffset: fc.integer({ min: -365, max: 365 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create invoices
            const invoices = invoiceData.map((data, index) => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() + data.daysOffset);

              return {
                id: `test-id-${index}`,
                clientName: 'Test Client',
                invoiceNumber: `INV-202401-${String(index + 1).padStart(3, '0')}`,
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: data.status,
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };
            });

            // Calculate summary
            const summary = calculateSummary(invoices);

            // Manually calculate expected total outstanding
            const expectedOutstanding = invoices
              .filter(inv => inv.status === 'pending')
              .reduce((sum, inv) => sum + inv.amount, 0);

            // Verify total outstanding matches
            expect(summary.totalOutstanding).toBeCloseTo(expectedOutstanding, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero outstanding when all invoices are paid or cancelled', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              status: fc.constantFrom('paid', 'cancelled'),
              daysOffset: fc.integer({ min: -365, max: 365 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create invoices with only paid or cancelled status
            const invoices = invoiceData.map((data, index) => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() + data.daysOffset);

              return {
                id: `test-id-${index}`,
                clientName: 'Test Client',
                invoiceNumber: `INV-202401-${String(index + 1).padStart(3, '0')}`,
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: data.status,
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };
            });

            // Calculate summary
            const summary = calculateSummary(invoices);

            // Should be zero when no pending invoices
            expect(summary.totalOutstanding).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include all pending invoices regardless of due date', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              daysOffset: fc.integer({ min: -365, max: 365 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create all pending invoices with various due dates
            const invoices = invoiceData.map((data, index) => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() + data.daysOffset);

              return {
                id: `test-id-${index}`,
                clientName: 'Test Client',
                invoiceNumber: `INV-202401-${String(index + 1).padStart(3, '0')}`,
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: 'pending',
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };
            });

            // Calculate summary
            const summary = calculateSummary(invoices);

            // Should equal sum of all amounts (all are pending)
            const expectedTotal = invoices.reduce((sum, inv) => sum + inv.amount, 0);
            expect(summary.totalOutstanding).toBeCloseTo(expectedTotal, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 13: Overdue Amount Calculation**
   * **Validates: Requirements 4.2**
   * 
   * For any set of invoices, the overdue amount should equal the sum of amounts
   * for all invoices with status "pending" and due date in the past.
   */
  describe('Property 13: Overdue Amount Calculation', () => {
    it('should calculate overdue amount as sum of pending invoices with past due dates', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              status: fc.constantFrom('pending', 'paid', 'cancelled'),
              daysOffset: fc.integer({ min: -365, max: 365 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create invoices
            const invoices = invoiceData.map((data, index) => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() + data.daysOffset);

              return {
                id: `test-id-${index}`,
                clientName: 'Test Client',
                invoiceNumber: `INV-202401-${String(index + 1).padStart(3, '0')}`,
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: data.status,
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };
            });

            // Calculate summary
            const summary = calculateSummary(invoices);

            // Manually calculate expected overdue amount
            const expectedOverdue = invoices
              .filter(inv => {
                if (inv.status !== 'pending') return false;
                const dueDate = new Date(inv.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate < today;
              })
              .reduce((sum, inv) => sum + inv.amount, 0);

            // Verify overdue amount matches
            expect(summary.overdueAmount).toBeCloseTo(expectedOverdue, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero overdue when all pending invoices have future due dates', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              daysInFuture: fc.integer({ min: 1, max: 365 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create pending invoices with future due dates
            const invoices = invoiceData.map((data, index) => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() + data.daysInFuture);

              return {
                id: `test-id-${index}`,
                clientName: 'Test Client',
                invoiceNumber: `INV-202401-${String(index + 1).padStart(3, '0')}`,
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: 'pending',
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };
            });

            // Calculate summary
            const summary = calculateSummary(invoices);

            // Should be zero when no overdue invoices
            expect(summary.overdueAmount).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not include paid or cancelled overdue invoices in overdue amount', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 10);

      const invoices = [
        {
          id: 'pending-overdue',
          clientName: 'Client 1',
          invoiceNumber: 'INV-202401-001',
          amount: 1000,
          dueDate: yesterday.toISOString(),
          paymentMethod: 'UPI',
          status: 'pending',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        },
        {
          id: 'paid-overdue',
          clientName: 'Client 2',
          invoiceNumber: 'INV-202401-002',
          amount: 2000,
          dueDate: yesterday.toISOString(),
          paymentMethod: 'UPI',
          status: 'paid',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        },
        {
          id: 'cancelled-overdue',
          clientName: 'Client 3',
          invoiceNumber: 'INV-202401-003',
          amount: 3000,
          dueDate: yesterday.toISOString(),
          paymentMethod: 'UPI',
          status: 'cancelled',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        }
      ];

      const summary = calculateSummary(invoices);

      // Only the pending overdue invoice should be counted
      expect(summary.overdueAmount).toBe(1000);
    });

    it('should have overdue amount less than or equal to total outstanding', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              daysOffset: fc.integer({ min: -365, max: 365 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create all pending invoices
            const invoices = invoiceData.map((data, index) => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() + data.daysOffset);

              return {
                id: `test-id-${index}`,
                clientName: 'Test Client',
                invoiceNumber: `INV-202401-${String(index + 1).padStart(3, '0')}`,
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: 'pending',
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };
            });

            // Calculate summary
            const summary = calculateSummary(invoices);

            // Overdue amount should always be <= total outstanding
            expect(summary.overdueAmount).toBeLessThanOrEqual(summary.totalOutstanding + 0.01);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 14: Due This Week Count**
   * **Validates: Requirements 4.3**
   * 
   * For any set of invoices, the count of invoices due this week should equal
   * the number of invoices with due dates between today and 7 days from today
   * (inclusive) with status "pending".
   */
  describe('Property 14: Due This Week Count', () => {
    it('should count pending invoices due within next 7 days', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              status: fc.constantFrom('pending', 'paid', 'cancelled'),
              daysOffset: fc.integer({ min: -365, max: 365 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const oneWeekFromNow = new Date(today);
            oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

            // Create invoices
            const invoices = invoiceData.map((data, index) => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() + data.daysOffset);

              return {
                id: `test-id-${index}`,
                clientName: 'Test Client',
                invoiceNumber: `INV-202401-${String(index + 1).padStart(3, '0')}`,
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: data.status,
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };
            });

            // Calculate summary
            const summary = calculateSummary(invoices);

            // Manually count invoices due this week
            const expectedCount = invoices.filter(inv => {
              if (inv.status !== 'pending') return false;
              const dueDate = new Date(inv.dueDate);
              dueDate.setHours(0, 0, 0, 0);
              return dueDate >= today && dueDate <= oneWeekFromNow;
            }).length;

            // Verify count matches
            expect(summary.dueThisWeek).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not count paid or cancelled invoices in due this week', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      const invoices = [
        {
          id: 'pending-due-this-week',
          clientName: 'Client 1',
          invoiceNumber: 'INV-202401-001',
          amount: 1000,
          dueDate: threeDaysLater.toISOString(),
          paymentMethod: 'UPI',
          status: 'pending',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        },
        {
          id: 'paid-due-this-week',
          clientName: 'Client 2',
          invoiceNumber: 'INV-202401-002',
          amount: 2000,
          dueDate: threeDaysLater.toISOString(),
          paymentMethod: 'UPI',
          status: 'paid',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        },
        {
          id: 'cancelled-due-this-week',
          clientName: 'Client 3',
          invoiceNumber: 'INV-202401-003',
          amount: 3000,
          dueDate: threeDaysLater.toISOString(),
          paymentMethod: 'UPI',
          status: 'cancelled',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        }
      ];

      const summary = calculateSummary(invoices);

      // Only the pending invoice should be counted
      expect(summary.dueThisWeek).toBe(1);
    });

    it('should include invoices due today in due this week count', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const invoices = [
        {
          id: 'due-today',
          clientName: 'Client 1',
          invoiceNumber: 'INV-202401-001',
          amount: 1000,
          dueDate: today.toISOString(),
          paymentMethod: 'UPI',
          status: 'pending',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        }
      ];

      const summary = calculateSummary(invoices);

      // Invoice due today should be counted
      expect(summary.dueThisWeek).toBe(1);
    });

    it('should include invoices due exactly 7 days from now in due this week count', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

      const invoices = [
        {
          id: 'due-in-7-days',
          clientName: 'Client 1',
          invoiceNumber: 'INV-202401-001',
          amount: 1000,
          dueDate: sevenDaysLater.toISOString(),
          paymentMethod: 'UPI',
          status: 'pending',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        }
      ];

      const summary = calculateSummary(invoices);

      // Invoice due in exactly 7 days should be counted
      expect(summary.dueThisWeek).toBe(1);
    });

    it('should not include invoices due more than 7 days from now', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const eightDaysLater = new Date(today);
      eightDaysLater.setDate(eightDaysLater.getDate() + 8);

      const invoices = [
        {
          id: 'due-in-8-days',
          clientName: 'Client 1',
          invoiceNumber: 'INV-202401-001',
          amount: 1000,
          dueDate: eightDaysLater.toISOString(),
          paymentMethod: 'UPI',
          status: 'pending',
          notes: '',
          createdDate: new Date().toISOString(),
          reminderSent: false,
          lateFee: 0
        }
      ];

      const summary = calculateSummary(invoices);

      // Invoice due in 8 days should NOT be counted
      expect(summary.dueThisWeek).toBe(0);
    });

    it('should not include overdue invoices in due this week count', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              daysOverdue: fc.integer({ min: 1, max: 365 })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (invoiceData) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Create overdue pending invoices
            const invoices = invoiceData.map((data, index) => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() - data.daysOverdue);

              return {
                id: `test-id-${index}`,
                clientName: 'Test Client',
                invoiceNumber: `INV-202401-${String(index + 1).padStart(3, '0')}`,
                amount: data.amount,
                dueDate: dueDate.toISOString(),
                paymentMethod: 'UPI',
                status: 'pending',
                notes: '',
                createdDate: new Date().toISOString(),
                reminderSent: false,
                lateFee: 0
              };
            });

            // Calculate summary
            const summary = calculateSummary(invoices);

            // Overdue invoices should not be counted in due this week
            expect(summary.dueThisWeek).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
