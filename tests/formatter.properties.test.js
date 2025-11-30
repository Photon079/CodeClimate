/**
 * Property-Based Tests for Formatter Module
 * Tests universal properties using fast-check
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatCurrency, formatDaysOverdue } from '../js/formatter.js';

describe('Formatter Module - Property-Based Tests', () => {
  
  /**
   * Feature: invoice-guard, Property 5: Currency Formatting Consistency
   * Validates: Requirements 2.2
   * 
   * For any numeric amount, the formatted currency string should contain 
   * the rupee symbol (₹) and use proper thousand separators (Indian numbering system).
   */
  it('Property 5: Currency Formatting Consistency - should format all amounts with ₹ symbol and separators', () => {
    fc.assert(
      fc.property(
        // Generate positive numbers between 0.01 and 10,000,000
        fc.double({ min: 0.01, max: 10000000, noNaN: true }),
        (amount) => {
          const formatted = formatCurrency(amount);
          
          // Must contain rupee symbol
          expect(formatted).toContain('₹');
          
          // Must contain decimal point with 2 decimal places
          expect(formatted).toMatch(/\.\d{2}$/);
          
          // For amounts >= 1000, must contain at least one comma separator
          if (amount >= 1000) {
            expect(formatted).toContain(',');
          }
          
          // Should be a valid format: ₹ followed by digits, commas, and decimal
          expect(formatted).toMatch(/^₹[\d,]+\.\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: invoice-guard, Property 6: Days Overdue Calculation
   * Validates: Requirements 2.3
   * 
   * For any unpaid invoice with a due date in the past, the calculated days overdue 
   * should equal the difference in days between the current date and the due date.
   */
  it('Property 6: Days Overdue Calculation - should correctly calculate days overdue', () => {
    fc.assert(
      fc.property(
        // Generate dates from 1 to 365 days in the past
        fc.integer({ min: 1, max: 365 }),
        (daysInPast) => {
          // Create a date that is daysInPast days ago
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() - daysInPast);
          dueDate.setHours(0, 0, 0, 0);
          
          const dueDateString = dueDate.toISOString();
          const result = formatDaysOverdue(dueDateString);
          
          // Should contain the number of days
          if (daysInPast === 1) {
            expect(result).toBe('1 day overdue');
          } else {
            expect(result).toBe(`${daysInPast} days overdue`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Days overdue should return "Not overdue" for future dates
   */
  it('Property 6 (edge case): Days overdue should return "Not overdue" for future dates', () => {
    fc.assert(
      fc.property(
        // Generate dates from 1 to 365 days in the future
        fc.integer({ min: 1, max: 365 }),
        (daysInFuture) => {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + daysInFuture);
          dueDate.setHours(0, 0, 0, 0);
          
          const dueDateString = dueDate.toISOString();
          const result = formatDaysOverdue(dueDateString);
          
          expect(result).toBe('Not overdue');
        }
      ),
      { numRuns: 100 }
    );
  });
});
