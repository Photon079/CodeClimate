/**
 * Property-Based Tests for Storage Module
 * Using fast-check for property-based testing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  loadInvoices,
  saveInvoices,
  getPaymentSettings,
  savePaymentSettings,
  getLateFeeConfig,
  saveLateFeeConfig,
  clearAllData,
  STORAGE_KEYS
} from '../js/storage.js';

describe('Storage Module - Property-Based Tests', () => {
  // Clean up localStorage before and after each test
  beforeEach(() => {
    clearAllData();
  });

  afterEach(() => {
    clearAllData();
  });

  /**
   * **Feature: invoice-guard, Property 25: Storage Round-Trip Integrity**
   * **Validates: Requirements 9.1, 9.2, 9.5**
   * 
   * For any set of invoices, saving to localStorage and then loading from localStorage
   * should return an equivalent set of invoices with all fields preserved including date formats.
   */
  describe('Property 25: Storage Round-Trip Integrity', () => {
    it('should preserve invoice data through save/load cycle', () => {
      // Generator for valid invoice objects
      const invoiceArbitrary = fc.record({
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

      const invoicesArrayArbitrary = fc.array(invoiceArbitrary, { minLength: 0, maxLength: 50 });

      fc.assert(
        fc.property(invoicesArrayArbitrary, (invoices) => {
          // Save invoices to localStorage
          const saveResult = saveInvoices(invoices);
          expect(saveResult.success).toBe(true);

          // Load invoices from localStorage
          const loadedInvoices = loadInvoices();

          // Verify the loaded data matches the saved data
          expect(loadedInvoices).toEqual(invoices);
          expect(loadedInvoices.length).toBe(invoices.length);

          // Verify each invoice field is preserved
          loadedInvoices.forEach((loaded, index) => {
            const original = invoices[index];
            expect(loaded.id).toBe(original.id);
            expect(loaded.clientName).toBe(original.clientName);
            expect(loaded.invoiceNumber).toBe(original.invoiceNumber);
            expect(loaded.amount).toBe(original.amount);
            expect(loaded.dueDate).toBe(original.dueDate);
            expect(loaded.paymentMethod).toBe(original.paymentMethod);
            expect(loaded.status).toBe(original.status);
            expect(loaded.notes).toBe(original.notes);
            expect(loaded.createdDate).toBe(original.createdDate);
            expect(loaded.reminderSent).toBe(original.reminderSent);
            expect(loaded.lateFee).toBe(original.lateFee);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve payment settings through save/load cycle', () => {
      const paymentSettingsArbitrary = fc.record({
        upiId: fc.string({ maxLength: 100 }),
        bankDetails: fc.string({ maxLength: 500 }),
        paypalEmail: fc.string({ maxLength: 100 }),
        userName: fc.string({ maxLength: 100 })
      });

      fc.assert(
        fc.property(paymentSettingsArbitrary, (settings) => {
          // Save settings
          const saveResult = savePaymentSettings(settings);
          expect(saveResult.success).toBe(true);

          // Load settings
          const loadedSettings = getPaymentSettings();

          // Verify all fields are preserved
          expect(loadedSettings).toEqual(settings);
          expect(loadedSettings.upiId).toBe(settings.upiId);
          expect(loadedSettings.bankDetails).toBe(settings.bankDetails);
          expect(loadedSettings.paypalEmail).toBe(settings.paypalEmail);
          expect(loadedSettings.userName).toBe(settings.userName);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve late fee config through save/load cycle', () => {
      const lateFeeConfigArbitrary = fc.record({
        enabled: fc.boolean(),
        percentagePerWeek: fc.double({ min: 0, max: 10, noNaN: true })
      });

      fc.assert(
        fc.property(lateFeeConfigArbitrary, (config) => {
          // Save config
          const saveResult = saveLateFeeConfig(config);
          expect(saveResult.success).toBe(true);

          // Load config
          const loadedConfig = getLateFeeConfig();

          // Verify all fields are preserved
          expect(loadedConfig).toEqual(config);
          expect(loadedConfig.enabled).toBe(config.enabled);
          expect(loadedConfig.percentagePerWeek).toBe(config.percentagePerWeek);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 26: Corrupted Data Handling**
   * **Validates: Requirements 9.3**
   * 
   * For any invalid or corrupted data in localStorage, the application should handle
   * the error gracefully and initialize with an empty invoice array without crashing.
   */
  describe('Property 26: Corrupted Data Handling', () => {
    it('should handle corrupted invoice data gracefully', () => {
      // Generator for various types of corrupted data
      const corruptedDataArbitrary = fc.oneof(
        fc.constant('not valid json{'),
        fc.constant('{"incomplete": '),
        fc.constant('[1, 2, "broken"'),
        fc.constant('null'),
        fc.constant('undefined'),
        fc.constant('{}'),
        fc.constant('"just a string"'),
        fc.constant('12345'),
        fc.constant('true'),
        fc.string({ minLength: 1, maxLength: 100 })
      );

      fc.assert(
        fc.property(corruptedDataArbitrary, (corruptedData) => {
          // Manually set corrupted data in localStorage
          localStorage.setItem(STORAGE_KEYS.INVOICES, corruptedData);

          // Attempt to load - should not throw and should return empty array
          let result;
          expect(() => {
            result = loadInvoices();
          }).not.toThrow();

          // Should return an empty array for corrupted data
          expect(Array.isArray(result)).toBe(true);
          
          // For non-array valid JSON, should return empty array
          if (corruptedData === '{}' || corruptedData === '"just a string"' || 
              corruptedData === '12345' || corruptedData === 'true' || 
              corruptedData === 'null') {
            expect(result).toEqual([]);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle corrupted payment settings gracefully', () => {
      const corruptedDataArbitrary = fc.oneof(
        fc.constant('not valid json{'),
        fc.constant('[1, 2, 3]'),
        fc.string({ minLength: 1, maxLength: 100 })
      );

      fc.assert(
        fc.property(corruptedDataArbitrary, (corruptedData) => {
          // Manually set corrupted data
          localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, corruptedData);

          // Should not throw and should return default settings
          let result;
          expect(() => {
            result = getPaymentSettings();
          }).not.toThrow();

          expect(result).toBeDefined();
          expect(result).toHaveProperty('upiId');
          expect(result).toHaveProperty('bankDetails');
          expect(result).toHaveProperty('paypalEmail');
          expect(result).toHaveProperty('userName');
        }),
        { numRuns: 100 }
      );
    });

    it('should handle corrupted late fee config gracefully', () => {
      const corruptedDataArbitrary = fc.oneof(
        fc.constant('not valid json{'),
        fc.constant('[1, 2, 3]'),
        fc.string({ minLength: 1, maxLength: 100 })
      );

      fc.assert(
        fc.property(corruptedDataArbitrary, (corruptedData) => {
          // Manually set corrupted data
          localStorage.setItem(STORAGE_KEYS.LATE_FEE_CONFIG, corruptedData);

          // Should not throw and should return default config
          let result;
          expect(() => {
            result = getLateFeeConfig();
          }).not.toThrow();

          expect(result).toBeDefined();
          expect(result).toHaveProperty('enabled');
          expect(result).toHaveProperty('percentagePerWeek');
          expect(typeof result.enabled).toBe('boolean');
          expect(typeof result.percentagePerWeek).toBe('number');
        }),
        { numRuns: 100 }
      );
    });

    it('should handle missing localStorage data gracefully', () => {
      // Clear all data to simulate missing data
      clearAllData();

      // All functions should work without throwing
      expect(() => {
        const invoices = loadInvoices();
        expect(invoices).toEqual([]);
      }).not.toThrow();

      expect(() => {
        const settings = getPaymentSettings();
        expect(settings.upiId).toBe('');
        expect(settings.bankDetails).toBe('');
        expect(settings.paypalEmail).toBe('');
        expect(settings.userName).toBe('');
      }).not.toThrow();

      expect(() => {
        const config = getLateFeeConfig();
        expect(config.enabled).toBe(true);
        expect(config.percentagePerWeek).toBe(1.0);
      }).not.toThrow();
    });
  });
});
