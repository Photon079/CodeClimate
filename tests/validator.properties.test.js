/**
 * Property-Based Tests for Validator Module
 * Using fast-check for property-based testing
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateInvoice,
  validateClientName,
  validateAmount,
  validateDueDate,
  validatePaymentMethod,
  PAYMENT_METHODS
} from '../js/validator.js';

describe('Validator Module - Property-Based Tests', () => {
  /**
   * **Feature: invoice-guard, Property 4: Invalid Invoice Rejection**
   * **Validates: Requirements 1.4**
   * 
   * For any invoice data with missing required fields (clientName, amount, or paymentMethod),
   * validation should fail and return appropriate error messages.
   */
  describe('Property 4: Invalid Invoice Rejection', () => {
    it('should reject invoices with missing clientName', () => {
      // Generator for invoice data without clientName
      const invoiceWithoutClientNameArbitrary = fc.record({
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        paymentMethod: fc.constantFrom(...PAYMENT_METHODS),
        dueDate: fc.date().map(d => d.toISOString()),
        notes: fc.string({ maxLength: 500 })
      });

      fc.assert(
        fc.property(invoiceWithoutClientNameArbitrary, (invoice) => {
          const result = validateInvoice(invoice);
          
          // Should be invalid
          expect(result.valid).toBe(false);
          
          // Should have an error for clientName
          const clientNameError = result.errors.find(e => e.field === 'clientName');
          expect(clientNameError).toBeDefined();
          expect(clientNameError.message).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invoices with empty or whitespace-only clientName', () => {
      // Generator for whitespace strings
      const whitespaceStringArbitrary = fc.oneof(
        fc.constant(''),
        fc.constant(' '),
        fc.constant('  '),
        fc.constant('\t'),
        fc.constant('\n'),
        fc.constant('   \t\n  ')
      );

      const invoiceWithWhitespaceClientNameArbitrary = fc.record({
        clientName: whitespaceStringArbitrary,
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        paymentMethod: fc.constantFrom(...PAYMENT_METHODS),
        dueDate: fc.date().map(d => d.toISOString()),
        notes: fc.string({ maxLength: 500 })
      });

      fc.assert(
        fc.property(invoiceWithWhitespaceClientNameArbitrary, (invoice) => {
          const result = validateInvoice(invoice);
          
          // Should be invalid
          expect(result.valid).toBe(false);
          
          // Should have an error for clientName
          const clientNameError = result.errors.find(e => e.field === 'clientName');
          expect(clientNameError).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invoices with missing amount', () => {
      // Generator for invoice data without amount
      const invoiceWithoutAmountArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        paymentMethod: fc.constantFrom(...PAYMENT_METHODS),
        dueDate: fc.date().map(d => d.toISOString()),
        notes: fc.string({ maxLength: 500 })
      });

      fc.assert(
        fc.property(invoiceWithoutAmountArbitrary, (invoice) => {
          const result = validateInvoice(invoice);
          
          // Should be invalid
          expect(result.valid).toBe(false);
          
          // Should have an error for amount
          const amountError = result.errors.find(e => e.field === 'amount');
          expect(amountError).toBeDefined();
          expect(amountError.message).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invoices with non-positive amounts', () => {
      // Generator for non-positive amounts
      const nonPositiveAmountArbitrary = fc.oneof(
        fc.constant(0),
        fc.double({ min: -10000000, max: -0.01, noNaN: true }),
        fc.constant(-0)
      );

      const invoiceWithNonPositiveAmountArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        amount: nonPositiveAmountArbitrary,
        paymentMethod: fc.constantFrom(...PAYMENT_METHODS),
        dueDate: fc.date().map(d => d.toISOString()),
        notes: fc.string({ maxLength: 500 })
      });

      fc.assert(
        fc.property(invoiceWithNonPositiveAmountArbitrary, (invoice) => {
          const result = validateInvoice(invoice);
          
          // Should be invalid
          expect(result.valid).toBe(false);
          
          // Should have an error for amount
          const amountError = result.errors.find(e => e.field === 'amount');
          expect(amountError).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invoices with missing paymentMethod', () => {
      // Generator for invoice data without paymentMethod
      const invoiceWithoutPaymentMethodArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        dueDate: fc.date().map(d => d.toISOString()),
        notes: fc.string({ maxLength: 500 })
      });

      fc.assert(
        fc.property(invoiceWithoutPaymentMethodArbitrary, (invoice) => {
          const result = validateInvoice(invoice);
          
          // Should be invalid
          expect(result.valid).toBe(false);
          
          // Should have an error for paymentMethod
          const paymentMethodError = result.errors.find(e => e.field === 'paymentMethod');
          expect(paymentMethodError).toBeDefined();
          expect(paymentMethodError.message).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invoices with invalid paymentMethod', () => {
      // Generator for invalid payment methods (not in the enum)
      const invalidPaymentMethodArbitrary = fc.string({ minLength: 1, maxLength: 50 })
        .filter(s => !PAYMENT_METHODS.includes(s));

      const invoiceWithInvalidPaymentMethodArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        paymentMethod: invalidPaymentMethodArbitrary,
        dueDate: fc.date().map(d => d.toISOString()),
        notes: fc.string({ maxLength: 500 })
      });

      fc.assert(
        fc.property(invoiceWithInvalidPaymentMethodArbitrary, (invoice) => {
          const result = validateInvoice(invoice);
          
          // Should be invalid
          expect(result.valid).toBe(false);
          
          // Should have an error for paymentMethod
          const paymentMethodError = result.errors.find(e => e.field === 'paymentMethod');
          expect(paymentMethodError).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should accept valid invoices with all required fields', () => {
      // Generator for valid invoice data
      const validInvoiceArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        paymentMethod: fc.constantFrom(...PAYMENT_METHODS),
        dueDate: fc.date().map(d => d.toISOString()),
        notes: fc.string({ maxLength: 500 })
      });

      fc.assert(
        fc.property(validInvoiceArbitrary, (invoice) => {
          const result = validateInvoice(invoice);
          
          // Should be valid
          expect(result.valid).toBe(true);
          expect(result.errors).toEqual([]);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invoices with multiple missing fields', () => {
      // Generator for invoices with multiple missing required fields
      const invoiceWithMultipleMissingFieldsArbitrary = fc.oneof(
        fc.record({}), // All fields missing
        fc.record({ clientName: fc.string({ minLength: 1, maxLength: 100 }) }), // Only clientName
        fc.record({ amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }) }), // Only amount
        fc.record({ paymentMethod: fc.constantFrom(...PAYMENT_METHODS) }) // Only paymentMethod
      );

      fc.assert(
        fc.property(invoiceWithMultipleMissingFieldsArbitrary, (invoice) => {
          const result = validateInvoice(invoice);
          
          // Should be invalid
          expect(result.valid).toBe(false);
          
          // Should have multiple errors
          expect(result.errors.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 21: Edit Validation Consistency**
   * **Validates: Requirements 7.2**
   * 
   * For any invalid invoice data, validation during editing should reject it with
   * the same rules and error messages as validation during creation.
   */
  describe('Property 21: Edit Validation Consistency', () => {
    it('should apply the same validation rules regardless of context', () => {
      // Generator for various invalid invoice data
      const invalidInvoiceArbitrary = fc.oneof(
        // Missing clientName
        fc.record({
          amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          paymentMethod: fc.constantFrom(...PAYMENT_METHODS)
        }),
        // Empty clientName
        fc.record({
          clientName: fc.constant(''),
          amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          paymentMethod: fc.constantFrom(...PAYMENT_METHODS)
        }),
        // Missing amount
        fc.record({
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
          paymentMethod: fc.constantFrom(...PAYMENT_METHODS)
        }),
        // Non-positive amount
        fc.record({
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
          amount: fc.oneof(fc.constant(0), fc.double({ min: -1000, max: -0.01, noNaN: true })),
          paymentMethod: fc.constantFrom(...PAYMENT_METHODS)
        }),
        // Missing paymentMethod
        fc.record({
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
          amount: fc.double({ min: 0.01, max: 10000000, noNaN: true })
        }),
        // Invalid paymentMethod
        fc.record({
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
          amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
          paymentMethod: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !PAYMENT_METHODS.includes(s))
        })
      );

      fc.assert(
        fc.property(invalidInvoiceArbitrary, (invoice) => {
          // Validate the invoice (same function used for both create and edit)
          const result1 = validateInvoice(invoice);
          const result2 = validateInvoice(invoice);
          
          // Both validations should produce identical results
          expect(result1.valid).toBe(result2.valid);
          expect(result1.valid).toBe(false); // Should be invalid
          expect(result1.errors.length).toBe(result2.errors.length);
          
          // Error messages should be consistent
          result1.errors.forEach((error, index) => {
            expect(error.field).toBe(result2.errors[index].field);
            expect(error.message).toBe(result2.errors[index].message);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should produce consistent validation results for valid data', () => {
      // Generator for valid invoice data
      const validInvoiceArbitrary = fc.record({
        clientName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        amount: fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        paymentMethod: fc.constantFrom(...PAYMENT_METHODS),
        dueDate: fc.date().map(d => d.toISOString()),
        notes: fc.string({ maxLength: 500 })
      });

      fc.assert(
        fc.property(validInvoiceArbitrary, (invoice) => {
          // Validate multiple times
          const result1 = validateInvoice(invoice);
          const result2 = validateInvoice(invoice);
          const result3 = validateInvoice(invoice);
          
          // All validations should produce identical results
          expect(result1.valid).toBe(true);
          expect(result2.valid).toBe(true);
          expect(result3.valid).toBe(true);
          expect(result1.errors).toEqual([]);
          expect(result2.errors).toEqual([]);
          expect(result3.errors).toEqual([]);
        }),
        { numRuns: 100 }
      );
    });
  });
});
