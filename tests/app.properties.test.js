/**
 * Property-Based Tests for App Module (CRUD Operations)
 * Using fast-check for property-based testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  handleAddInvoice,
  handleEditInvoice,
  handleDeleteInvoice,
  handleMarkPaid,
  handleSendReminder
} from '../js/app.js';
import {
  createInvoice,
  updateInvoice,
  deleteInvoice,
  calculateSummary
} from '../js/invoice.js';
import {
  loadInvoices,
  saveInvoices,
  clearAllData
} from '../js/storage.js';

describe('App Module - Property-Based Tests', () => {
  // Clear storage before each test
  beforeEach(() => {
    clearAllData();
  });

  /**
   * **Feature: invoice-guard, Property 19: Mark Paid Status Update**
   * **Validates: Requirements 6.1, 6.2**
   * 
   * For any invoice with status "pending", marking it as paid should update
   * the status to "paid" and exclude it from outstanding calculations.
   */
  describe('Property 19: Mark Paid Status Update', () => {
    it('should update status to paid and exclude from outstanding calculations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              clientName: fc.string({ minLength: 1, maxLength: 100 }),
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
              notes: fc.string({ maxLength: 500 }),
              daysOffset: fc.integer({ min: -365, max: 365 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          fc.integer({ min: 0, max: 19 }), // Index of invoice to mark as paid
          (invoiceData, indexToMarkPaid) => {
            // Create invoices
            let invoices = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            invoiceData.forEach(data => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() + data.daysOffset);

              const invoiceInput = {
                clientName: data.clientName,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                notes: data.notes,
                dueDate: dueDate.toISOString()
              };

              const invoice = createInvoice(invoiceInput, invoices);
              invoices.push(invoice);
            });

            // Save invoices
            saveInvoices(invoices);

            // Calculate initial summary
            const initialSummary = calculateSummary(invoices);

            // Mark one invoice as paid
            const actualIndex = indexToMarkPaid % invoices.length;
            const invoiceToMarkPaid = invoices[actualIndex];
            const originalAmount = invoiceToMarkPaid.amount;

            // Update the invoice to paid status
            invoices[actualIndex] = updateInvoice(invoiceToMarkPaid, { status: 'paid' });
            saveInvoices(invoices);

            // Load invoices and calculate new summary
            const updatedInvoices = loadInvoices();
            const updatedSummary = calculateSummary(updatedInvoices);

            // Verify the invoice is now paid
            const paidInvoice = updatedInvoices.find(inv => inv.id === invoiceToMarkPaid.id);
            expect(paidInvoice.status).toBe('paid');

            // Verify outstanding amount decreased by the paid invoice amount
            const expectedOutstanding = initialSummary.totalOutstanding - originalAmount;
            expect(updatedSummary.totalOutstanding).toBeCloseTo(expectedOutstanding, 2);

            // Verify paid invoice count increased
            expect(updatedSummary.paidInvoices).toBe(initialSummary.paidInvoices + 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude paid invoices from overdue calculations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              clientName: fc.string({ minLength: 1, maxLength: 100 }),
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
              daysOverdue: fc.integer({ min: 1, max: 365 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          fc.integer({ min: 0, max: 19 }),
          (invoiceData, indexToMarkPaid) => {
            // Create overdue invoices
            let invoices = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            invoiceData.forEach(data => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() - data.daysOverdue);

              const invoiceInput = {
                clientName: data.clientName,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                dueDate: dueDate.toISOString()
              };

              const invoice = createInvoice(invoiceInput, invoices);
              invoices.push(invoice);
            });

            saveInvoices(invoices);

            // Calculate initial overdue amount
            const initialSummary = calculateSummary(invoices);

            // Mark one invoice as paid
            const actualIndex = indexToMarkPaid % invoices.length;
            const invoiceToMarkPaid = invoices[actualIndex];
            const originalAmount = invoiceToMarkPaid.amount;

            invoices[actualIndex] = updateInvoice(invoiceToMarkPaid, { status: 'paid' });
            saveInvoices(invoices);

            // Calculate new overdue amount
            const updatedInvoices = loadInvoices();
            const updatedSummary = calculateSummary(updatedInvoices);

            // Verify overdue amount decreased
            const expectedOverdue = initialSummary.overdueAmount - originalAmount;
            expect(updatedSummary.overdueAmount).toBeCloseTo(expectedOverdue, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 20: Paid Invoice Data Preservation**
   * **Validates: Requirements 6.5**
   * 
   * For any invoice, marking it as paid should preserve all original invoice
   * fields (id, clientName, invoiceNumber, amount, dueDate, createdDate, notes).
   */
  describe('Property 20: Paid Invoice Data Preservation', () => {
    it('should preserve all original invoice data when marking as paid', () => {
      fc.assert(
        fc.property(
          fc.record({
            clientName: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
            paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
            notes: fc.string({ maxLength: 500 }),
            daysOffset: fc.integer({ min: -365, max: 365 })
          }),
          (data) => {
            // Create an invoice
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() + data.daysOffset);

            const invoiceInput = {
              clientName: data.clientName,
              amount: data.amount,
              paymentMethod: data.paymentMethod,
              notes: data.notes,
              dueDate: dueDate.toISOString()
            };

            const originalInvoice = createInvoice(invoiceInput, []);
            saveInvoices([originalInvoice]);

            // Store original values
            const originalId = originalInvoice.id;
            const originalClientName = originalInvoice.clientName;
            const originalInvoiceNumber = originalInvoice.invoiceNumber;
            const originalAmount = originalInvoice.amount;
            const originalDueDate = originalInvoice.dueDate;
            const originalCreatedDate = originalInvoice.createdDate;
            const originalNotes = originalInvoice.notes;

            // Mark as paid
            const paidInvoice = updateInvoice(originalInvoice, { status: 'paid' });
            saveInvoices([paidInvoice]);

            // Load and verify
            const loadedInvoices = loadInvoices();
            const loadedInvoice = loadedInvoices[0];

            // Verify all original fields are preserved
            expect(loadedInvoice.id).toBe(originalId);
            expect(loadedInvoice.clientName).toBe(originalClientName);
            expect(loadedInvoice.invoiceNumber).toBe(originalInvoiceNumber);
            expect(loadedInvoice.amount).toBe(originalAmount);
            expect(loadedInvoice.dueDate).toBe(originalDueDate);
            expect(loadedInvoice.createdDate).toBe(originalCreatedDate);
            expect(loadedInvoice.notes).toBe(originalNotes);

            // Verify status changed to paid
            expect(loadedInvoice.status).toBe('paid');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve invoice data across multiple status changes', () => {
      fc.assert(
        fc.property(
          fc.record({
            clientName: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
            paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
            notes: fc.string({ maxLength: 500 })
          }),
          (data) => {
            // Create an invoice
            const invoiceInput = {
              clientName: data.clientName,
              amount: data.amount,
              paymentMethod: data.paymentMethod,
              notes: data.notes
            };

            const originalInvoice = createInvoice(invoiceInput, []);
            const originalId = originalInvoice.id;
            const originalCreatedDate = originalInvoice.createdDate;

            // Change to cancelled then to paid
            let invoice = updateInvoice(originalInvoice, { status: 'cancelled' });
            invoice = updateInvoice(invoice, { status: 'paid' });

            // Verify immutable fields preserved through multiple updates
            expect(invoice.id).toBe(originalId);
            expect(invoice.createdDate).toBe(originalCreatedDate);
            expect(invoice.status).toBe('paid');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 23: Deletion Persistence**
   * **Validates: Requirements 8.2**
   * 
   * For any invoice in the system, after deletion, the invoice should not exist
   * in localStorage and should not appear in any subsequent data retrieval.
   */
  describe('Property 23: Deletion Persistence', () => {
    it('should permanently remove invoice from storage after deletion', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              clientName: fc.string({ minLength: 1, maxLength: 100 }),
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
              notes: fc.string({ maxLength: 500 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          fc.integer({ min: 0, max: 19 }),
          (invoiceData, indexToDelete) => {
            // Create invoices
            let invoices = [];

            invoiceData.forEach(data => {
              const invoiceInput = {
                clientName: data.clientName,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                notes: data.notes
              };

              const invoice = createInvoice(invoiceInput, invoices);
              invoices.push(invoice);
            });

            saveInvoices(invoices);

            // Delete one invoice
            const actualIndex = indexToDelete % invoices.length;
            const invoiceToDelete = invoices[actualIndex];
            const deletedId = invoiceToDelete.id;

            invoices = deleteInvoice(invoices, deletedId);
            saveInvoices(invoices);

            // Load invoices from storage
            const loadedInvoices = loadInvoices();

            // Verify deleted invoice does not exist
            const foundInvoice = loadedInvoices.find(inv => inv.id === deletedId);
            expect(foundInvoice).toBeUndefined();

            // Verify count decreased by 1
            expect(loadedInvoices.length).toBe(invoiceData.length - 1);

            // Verify all other invoices still exist
            invoices.forEach(inv => {
              const found = loadedInvoices.find(loaded => loaded.id === inv.id);
              expect(found).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle deletion of multiple invoices correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              clientName: fc.string({ minLength: 1, maxLength: 100 }),
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other')
            }),
            { minLength: 3, maxLength: 20 }
          ),
          fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 1, maxLength: 5 }),
          (invoiceData, indicesToDelete) => {
            // Create invoices
            let invoices = [];

            invoiceData.forEach(data => {
              const invoiceInput = {
                clientName: data.clientName,
                amount: data.amount,
                paymentMethod: data.paymentMethod
              };

              const invoice = createInvoice(invoiceInput, invoices);
              invoices.push(invoice);
            });

            saveInvoices(invoices);

            // Delete multiple invoices
            const deletedIds = new Set();
            indicesToDelete.forEach(index => {
              const actualIndex = index % invoices.length;
              if (actualIndex < invoices.length) {
                const idToDelete = invoices[actualIndex].id;
                deletedIds.add(idToDelete);
                invoices = deleteInvoice(invoices, idToDelete);
              }
            });

            saveInvoices(invoices);

            // Load and verify
            const loadedInvoices = loadInvoices();

            // Verify none of the deleted invoices exist
            deletedIds.forEach(deletedId => {
              const found = loadedInvoices.find(inv => inv.id === deletedId);
              expect(found).toBeUndefined();
            });

            // Verify remaining invoices still exist
            invoices.forEach(inv => {
              const found = loadedInvoices.find(loaded => loaded.id === inv.id);
              expect(found).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 24: Deletion Summary Update**
   * **Validates: Requirements 8.4**
   * 
   * For any set of invoices, after deleting one or more invoices, the summary
   * statistics should reflect the removal by excluding the deleted invoices
   * from all calculations.
   */
  describe('Property 24: Deletion Summary Update', () => {
    it('should update summary statistics after invoice deletion', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              clientName: fc.string({ minLength: 1, maxLength: 100 }),
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
              daysOffset: fc.integer({ min: -365, max: 365 })
            }),
            { minLength: 2, maxLength: 20 }
          ),
          fc.integer({ min: 0, max: 19 }),
          (invoiceData, indexToDelete) => {
            // Create invoices
            let invoices = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            invoiceData.forEach(data => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() + data.daysOffset);

              const invoiceInput = {
                clientName: data.clientName,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                dueDate: dueDate.toISOString()
              };

              const invoice = createInvoice(invoiceInput, invoices);
              invoices.push(invoice);
            });

            saveInvoices(invoices);

            // Calculate initial summary
            const initialSummary = calculateSummary(invoices);

            // Delete one invoice
            const actualIndex = indexToDelete % invoices.length;
            const invoiceToDelete = invoices[actualIndex];
            const deletedAmount = invoiceToDelete.amount;

            invoices = deleteInvoice(invoices, invoiceToDelete.id);
            saveInvoices(invoices);

            // Calculate new summary
            const updatedInvoices = loadInvoices();
            const updatedSummary = calculateSummary(updatedInvoices);

            // Verify total count decreased
            expect(updatedSummary.totalInvoices).toBe(initialSummary.totalInvoices - 1);

            // If deleted invoice was pending, verify outstanding decreased
            if (invoiceToDelete.status === 'pending') {
              const expectedOutstanding = initialSummary.totalOutstanding - deletedAmount;
              expect(updatedSummary.totalOutstanding).toBeCloseTo(expectedOutstanding, 2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update overdue amount when deleting overdue invoices', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              clientName: fc.string({ minLength: 1, maxLength: 100 }),
              amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
              paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
              daysOverdue: fc.integer({ min: 1, max: 365 })
            }),
            { minLength: 2, maxLength: 20 }
          ),
          fc.integer({ min: 0, max: 19 }),
          (invoiceData, indexToDelete) => {
            // Create overdue invoices
            let invoices = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            invoiceData.forEach(data => {
              const dueDate = new Date(today);
              dueDate.setDate(dueDate.getDate() - data.daysOverdue);

              const invoiceInput = {
                clientName: data.clientName,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                dueDate: dueDate.toISOString()
              };

              const invoice = createInvoice(invoiceInput, invoices);
              invoices.push(invoice);
            });

            saveInvoices(invoices);

            // Calculate initial overdue amount
            const initialSummary = calculateSummary(invoices);

            // Delete one invoice
            const actualIndex = indexToDelete % invoices.length;
            const invoiceToDelete = invoices[actualIndex];
            const deletedAmount = invoiceToDelete.amount;

            invoices = deleteInvoice(invoices, invoiceToDelete.id);
            saveInvoices(invoices);

            // Calculate new overdue amount
            const updatedInvoices = loadInvoices();
            const updatedSummary = calculateSummary(updatedInvoices);

            // Verify overdue amount decreased
            const expectedOverdue = initialSummary.overdueAmount - deletedAmount;
            expect(updatedSummary.overdueAmount).toBeCloseTo(expectedOverdue, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 18: Reminder Sent Flag**
   * **Validates: Requirements 5.5**
   * 
   * For any invoice, after generating a reminder, the invoice should have
   * reminderSent set to true.
   */
  describe('Property 18: Reminder Sent Flag', () => {
    it('should set reminderSent flag to true after generating reminder', () => {
      fc.assert(
        fc.property(
          fc.record({
            clientName: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
            paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
            notes: fc.string({ maxLength: 500 }),
            daysOverdue: fc.integer({ min: 1, max: 365 })
          }),
          (data) => {
            // Create an overdue invoice
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - data.daysOverdue);

            const invoiceInput = {
              clientName: data.clientName,
              amount: data.amount,
              paymentMethod: data.paymentMethod,
              notes: data.notes,
              dueDate: dueDate.toISOString()
            };

            const invoice = createInvoice(invoiceInput, []);
            
            // Verify initial reminderSent is false
            expect(invoice.reminderSent).toBe(false);

            // Simulate sending reminder by updating the flag
            const updatedInvoice = updateInvoice(invoice, { reminderSent: true });
            saveInvoices([updatedInvoice]);

            // Load and verify
            const loadedInvoices = loadInvoices();
            const loadedInvoice = loadedInvoices[0];

            // Verify reminderSent flag is now true
            expect(loadedInvoice.reminderSent).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist reminderSent flag across multiple reminders', () => {
      fc.assert(
        fc.property(
          fc.record({
            clientName: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
            paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
            daysOverdue: fc.integer({ min: 1, max: 365 })
          }),
          fc.integer({ min: 2, max: 5 }),
          (data, reminderCount) => {
            // Create an overdue invoice
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - data.daysOverdue);

            const invoiceInput = {
              clientName: data.clientName,
              amount: data.amount,
              paymentMethod: data.paymentMethod,
              dueDate: dueDate.toISOString()
            };

            let invoice = createInvoice(invoiceInput, []);

            // Send multiple reminders
            for (let i = 0; i < reminderCount; i++) {
              invoice = updateInvoice(invoice, { reminderSent: true });
              saveInvoices([invoice]);
            }

            // Load and verify
            const loadedInvoices = loadInvoices();
            const loadedInvoice = loadedInvoices[0];

            // Verify reminderSent flag remains true
            expect(loadedInvoice.reminderSent).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain reminderSent flag when invoice is updated', () => {
      fc.assert(
        fc.property(
          fc.record({
            clientName: fc.string({ minLength: 1, maxLength: 100 }),
            amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
            paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
            daysOverdue: fc.integer({ min: 1, max: 365 })
          }),
          fc.string({ minLength: 1, maxLength: 500 }),
          (data, newNotes) => {
            // Create an overdue invoice
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - data.daysOverdue);

            const invoiceInput = {
              clientName: data.clientName,
              amount: data.amount,
              paymentMethod: data.paymentMethod,
              dueDate: dueDate.toISOString()
            };

            let invoice = createInvoice(invoiceInput, []);

            // Set reminderSent flag
            invoice = updateInvoice(invoice, { reminderSent: true });
            saveInvoices([invoice]);

            // Update other fields
            invoice = updateInvoice(invoice, { notes: newNotes });
            saveInvoices([invoice]);

            // Load and verify
            const loadedInvoices = loadInvoices();
            const loadedInvoice = loadedInvoices[0];

            // Verify reminderSent flag is still true after other updates
            expect(loadedInvoice.reminderSent).toBe(true);
            expect(loadedInvoice.notes).toBe(newNotes);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
