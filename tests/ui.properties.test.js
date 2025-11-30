/**
 * Property-Based Tests for UI Module
 * Using fast-check for property-based testing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';

// Set up DOM environment
let dom;
let document;
let window;

beforeEach(() => {
  // Create a new JSDOM instance for each test
  dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="totalOutstanding"></div>
        <div id="overdueAmount"></div>
        <div id="dueThisWeek"></div>
        <table id="invoicesTable">
          <tbody id="invoicesTableBody"></tbody>
        </table>
        <div id="emptyState" class="hidden"></div>
      </body>
    </html>
  `, { url: 'http://localhost' });
  
  document = dom.window.document;
  window = dom.window;
  
  // Make document and window global for the UI module
  global.document = document;
  global.window = window;
  
  // Mock requestAnimationFrame to execute synchronously for tests
  global.requestAnimationFrame = (callback) => {
    callback();
    return 0;
  };
});

afterEach(() => {
  // Clean up
  delete global.document;
  delete global.window;
  delete global.requestAnimationFrame;
});

describe('UI Module - Property-Based Tests', () => {
  /**
   * **Feature: invoice-guard, Property 31: Status Color Coding**
   * **Validates: Requirements 12.2**
   * 
   * For any status indicator displayed, success states should use color #10B981,
   * warning states should use #F59E0B, and danger states should use #EF4444.
   */
  describe('Property 31: Status Color Coding', () => {
    it('should use #10B981 for success status badges', async () => {
      // Import UI module functions
      const { renderStatusBadge } = await import('../js/ui.js');
      
      
      // Generator for success status badges
      const successBadgeArbitrary = fc.record({
        label: fc.constantFrom('Paid', 'Not Due'),
        color: fc.constant('#10B981'),
        icon: fc.constantFrom('✓', '○')
      });

      fc.assert(
        fc.property(successBadgeArbitrary, (statusBadge) => {
          // Render the status badge
          const badgeElement = renderStatusBadge(statusBadge);

          // Verify it's a span element
          expect(badgeElement.tagName).toBe('SPAN');

          // Verify it has the correct success color classes
          expect(badgeElement.classList.contains('bg-green-100')).toBe(true);
          expect(badgeElement.classList.contains('text-green-800')).toBe(true);

          // Verify the badge contains the label and icon
          expect(badgeElement.textContent).toContain(statusBadge.label);
          expect(badgeElement.textContent).toContain(statusBadge.icon);
        }),
        { numRuns: 100 }
      );
    });

    it('should use #F59E0B for warning status badges', async () => {
      // Import UI module functions
      const { renderStatusBadge } = await import('../js/ui.js');
      
      // Generator for warning status badges
      const warningBadgeArbitrary = fc.record({
        label: fc.constant('Due Soon'),
        color: fc.constant('#F59E0B'),
        icon: fc.constant('!')
      });

      fc.assert(
        fc.property(warningBadgeArbitrary, (statusBadge) => {
          // Render the status badge
          const badgeElement = renderStatusBadge(statusBadge);

          // Verify it's a span element
          expect(badgeElement.tagName).toBe('SPAN');

          // Verify it has the correct warning color classes
          expect(badgeElement.classList.contains('bg-yellow-100')).toBe(true);
          expect(badgeElement.classList.contains('text-yellow-800')).toBe(true);

          // Verify the badge contains the label and icon
          expect(badgeElement.textContent).toContain(statusBadge.label);
          expect(badgeElement.textContent).toContain(statusBadge.icon);
        }),
        { numRuns: 100 }
      );
    });

    it('should use #EF4444 for danger status badges', async () => {
      // Import UI module functions
      const { renderStatusBadge } = await import('../js/ui.js');
      
      // Generator for danger status badges
      const dangerBadgeArbitrary = fc.record({
        label: fc.constant('Overdue'),
        color: fc.constant('#EF4444'),
        icon: fc.constant('⚠')
      });

      fc.assert(
        fc.property(dangerBadgeArbitrary, (statusBadge) => {
          // Render the status badge
          const badgeElement = renderStatusBadge(statusBadge);

          // Verify it's a span element
          expect(badgeElement.tagName).toBe('SPAN');

          // Verify it has the correct danger color classes
          expect(badgeElement.classList.contains('bg-red-100')).toBe(true);
          expect(badgeElement.classList.contains('text-red-800')).toBe(true);

          // Verify the badge contains the label and icon
          expect(badgeElement.textContent).toContain(statusBadge.label);
          expect(badgeElement.textContent).toContain(statusBadge.icon);
        }),
        { numRuns: 100 }
      );
    });

    it('should consistently map color codes to CSS classes', async () => {
      // Import UI module functions
      const { renderStatusBadge } = await import('../js/ui.js');
      
      // Generator for all possible status badge colors
      const statusBadgeArbitrary = fc.oneof(
        fc.record({
          label: fc.string({ minLength: 1, maxLength: 20 }),
          color: fc.constant('#10B981'),
          icon: fc.string({ minLength: 1, maxLength: 2 })
        }),
        fc.record({
          label: fc.string({ minLength: 1, maxLength: 20 }),
          color: fc.constant('#F59E0B'),
          icon: fc.string({ minLength: 1, maxLength: 2 })
        }),
        fc.record({
          label: fc.string({ minLength: 1, maxLength: 20 }),
          color: fc.constant('#EF4444'),
          icon: fc.string({ minLength: 1, maxLength: 2 })
        })
      );

      fc.assert(
        fc.property(statusBadgeArbitrary, (statusBadge) => {
          // Render the status badge
          const badgeElement = renderStatusBadge(statusBadge);

          // Verify color mapping is consistent
          if (statusBadge.color === '#10B981') {
            expect(badgeElement.classList.contains('bg-green-100')).toBe(true);
            expect(badgeElement.classList.contains('text-green-800')).toBe(true);
            expect(badgeElement.classList.contains('bg-yellow-100')).toBe(false);
            expect(badgeElement.classList.contains('bg-red-100')).toBe(false);
          } else if (statusBadge.color === '#F59E0B') {
            expect(badgeElement.classList.contains('bg-yellow-100')).toBe(true);
            expect(badgeElement.classList.contains('text-yellow-800')).toBe(true);
            expect(badgeElement.classList.contains('bg-green-100')).toBe(false);
            expect(badgeElement.classList.contains('bg-red-100')).toBe(false);
          } else if (statusBadge.color === '#EF4444') {
            expect(badgeElement.classList.contains('bg-red-100')).toBe(true);
            expect(badgeElement.classList.contains('text-red-800')).toBe(true);
            expect(badgeElement.classList.contains('bg-green-100')).toBe(false);
            expect(badgeElement.classList.contains('bg-yellow-100')).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should apply correct color classes for all status types', async () => {
      // Import UI module functions
      const { renderStatusBadge } = await import('../js/ui.js');
      
      // Test all status types with their expected colors
      const statusTypes = [
        { label: 'Paid', color: '#10B981', icon: '✓', expectedClasses: ['bg-green-100', 'text-green-800'] },
        { label: 'Not Due', color: '#10B981', icon: '○', expectedClasses: ['bg-green-100', 'text-green-800'] },
        { label: 'Due Soon', color: '#F59E0B', icon: '!', expectedClasses: ['bg-yellow-100', 'text-yellow-800'] },
        { label: 'Overdue', color: '#EF4444', icon: '⚠', expectedClasses: ['bg-red-100', 'text-red-800'] }
      ];

      statusTypes.forEach(statusBadge => {
        const badgeElement = renderStatusBadge(statusBadge);

        // Verify all expected classes are present
        statusBadge.expectedClasses.forEach(className => {
          expect(badgeElement.classList.contains(className)).toBe(true);
        });

        // Verify content
        expect(badgeElement.textContent).toContain(statusBadge.label);
        expect(badgeElement.textContent).toContain(statusBadge.icon);
      });
    });

    it('should handle unknown colors with default gray styling', async () => {
      // Import UI module functions
      const { renderStatusBadge } = await import('../js/ui.js');
      
      // Generator for status badges with non-standard colors
      const unknownColorBadgeArbitrary = fc.record({
        label: fc.string({ minLength: 1, maxLength: 20 }),
        color: fc.string({ minLength: 7, maxLength: 7 }).filter(s => 
          s !== '#10B981' && s !== '#F59E0B' && s !== '#EF4444'
        ),
        icon: fc.string({ minLength: 1, maxLength: 2 })
      });

      fc.assert(
        fc.property(unknownColorBadgeArbitrary, (statusBadge) => {
          // Render the status badge
          const badgeElement = renderStatusBadge(statusBadge);

          // Should use default gray styling for unknown colors
          expect(badgeElement.classList.contains('bg-gray-100')).toBe(true);
          expect(badgeElement.classList.contains('text-gray-800')).toBe(true);

          // Should not have success, warning, or danger colors
          expect(badgeElement.classList.contains('bg-green-100')).toBe(false);
          expect(badgeElement.classList.contains('bg-yellow-100')).toBe(false);
          expect(badgeElement.classList.contains('bg-red-100')).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: invoice-guard, Property 28: Late Fee Display**
   * **Validates: Requirements 10.3**
   * 
   * For any overdue invoice, the displayed invoice information should include
   * both the original amount and the calculated late fee amount.
   */
  describe('Property 28: Late Fee Display', () => {
    it('should display both original amount and late fee for overdue invoices', async () => {
      // We'll test this by checking the invoice table rendering
      // Import the necessary functions
      const { renderInvoiceTable } = await import('../js/ui.js');
      const { formatCurrency } = await import('../js/formatter.js');

      // Generator for overdue invoices with late fees
      const overdueInvoiceArbitrary = fc.record({
        id: fc.uuid(),
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 50 }),
        amount: fc.double({ min: 100, max: 100000, noNaN: true }),
        dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        status: fc.constant('pending'),
        notes: fc.string({ maxLength: 500 }),
        createdDate: fc.date().map(d => d.toISOString()),
        reminderSent: fc.boolean(),
        lateFee: fc.double({ min: 10, max: 10000, noNaN: true }),
        statusBadge: fc.record({
          label: fc.constant('Overdue'),
          color: fc.constant('#EF4444'),
          icon: fc.constant('⚠')
        }),
        daysOverdue: fc.integer({ min: 1, max: 365 })
      });

      fc.assert(
        fc.property(
          fc.array(overdueInvoiceArbitrary, { minLength: 1, maxLength: 5 }),
          (invoices) => {
            // Render the invoice table
            renderInvoiceTable(invoices);

            // Get the table body
            const tableBody = document.getElementById('invoicesTableBody');
            expect(tableBody).not.toBeNull();

            // Check each invoice row
            const rows = tableBody.querySelectorAll('tr');
            expect(rows.length).toBe(invoices.length);

            invoices.forEach((invoice, index) => {
              const row = rows[index];
              
              // Find the amount cell (3rd cell)
              const amountCell = row.cells[2];
              expect(amountCell).not.toBeUndefined();

              const amountCellHTML = amountCell.innerHTML;

              // Verify original amount is displayed
              const formattedAmount = formatCurrency(invoice.amount);
              expect(amountCellHTML).toContain(formattedAmount);

              // If late fee > 0, verify it's displayed
              if (invoice.lateFee > 0) {
                const formattedLateFee = formatCurrency(invoice.lateFee);
                expect(amountCellHTML).toContain(formattedLateFee);
                expect(amountCellHTML).toContain('late fee');
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not display late fee for invoices with zero late fee', async () => {
      const { renderInvoiceTable } = await import('../js/ui.js');
      const { formatCurrency } = await import('../js/formatter.js');

      // Generator for invoices without late fees
      const noLateFeeInvoiceArbitrary = fc.record({
        id: fc.uuid(),
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 50 }),
        amount: fc.double({ min: 100, max: 100000, noNaN: true }),
        dueDate: fc.date().map(d => d.toISOString()),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        status: fc.constantFrom('pending', 'paid'),
        notes: fc.string({ maxLength: 500 }),
        createdDate: fc.date().map(d => d.toISOString()),
        reminderSent: fc.boolean(),
        lateFee: fc.constant(0),
        statusBadge: fc.record({
          label: fc.string({ minLength: 1, maxLength: 20 }),
          color: fc.constantFrom('#10B981', '#F59E0B', '#EF4444'),
          icon: fc.string({ minLength: 1, maxLength: 2 })
        }),
        daysOverdue: fc.constant(0)
      });

      fc.assert(
        fc.property(
          fc.array(noLateFeeInvoiceArbitrary, { minLength: 1, maxLength: 5 }),
          (invoices) => {
            // Render the invoice table
            renderInvoiceTable(invoices);

            // Get the table body
            const tableBody = document.getElementById('invoicesTableBody');
            expect(tableBody).not.toBeNull();

            // Check each invoice row
            const rows = tableBody.querySelectorAll('tr');
            expect(rows.length).toBe(invoices.length);

            invoices.forEach((invoice, index) => {
              const row = rows[index];
              
              // Find the amount cell (3rd cell)
              const amountCell = row.cells[2];
              expect(amountCell).not.toBeUndefined();

              const amountCellText = amountCell.textContent;

              // Verify original amount is displayed
              const formattedAmount = formatCurrency(invoice.amount);
              expect(amountCellText).toContain(formattedAmount);

              // Verify late fee is NOT mentioned
              expect(amountCellText).not.toContain('late fee');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display late fee with danger color styling', async () => {
      const { renderInvoiceTable } = await import('../js/ui.js');

      // Generator for overdue invoices with late fees
      const overdueInvoiceArbitrary = fc.record({
        id: fc.uuid(),
        clientName: fc.string({ minLength: 1, maxLength: 100 }),
        invoiceNumber: fc.string({ minLength: 1, maxLength: 50 }),
        amount: fc.double({ min: 100, max: 100000, noNaN: true }),
        dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
        paymentMethod: fc.constantFrom('UPI', 'Bank Transfer', 'PayPal', 'Other'),
        status: fc.constant('pending'),
        notes: fc.string({ maxLength: 500 }),
        createdDate: fc.date().map(d => d.toISOString()),
        reminderSent: fc.boolean(),
        lateFee: fc.double({ min: 10, max: 10000, noNaN: true }),
        statusBadge: fc.record({
          label: fc.constant('Overdue'),
          color: fc.constant('#EF4444'),
          icon: fc.constant('⚠')
        }),
        daysOverdue: fc.integer({ min: 1, max: 365 })
      });

      fc.assert(
        fc.property(
          fc.array(overdueInvoiceArbitrary, { minLength: 1, maxLength: 5 }),
          (invoices) => {
            // Render the invoice table
            renderInvoiceTable(invoices);

            // Get the table body
            const tableBody = document.getElementById('invoicesTableBody');
            expect(tableBody).not.toBeNull();

            // Check each invoice row
            const rows = tableBody.querySelectorAll('tr');

            invoices.forEach((invoice, index) => {
              if (invoice.lateFee > 0) {
                const row = rows[index];
                const amountCell = row.cells[2];
                
                // Check for danger color class in late fee text
                const lateFeeSpan = amountCell.querySelector('.text-danger');
                expect(lateFeeSpan).not.toBeNull();
                expect(lateFeeSpan.textContent).toContain('late fee');
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
