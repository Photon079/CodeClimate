/**
 * Invoice Contact Fields Tests
 * Tests that invoices properly store email and phone information
 */

import { describe, it, expect } from 'vitest';
import { createInvoice } from '../frontend/js/invoice.js';

describe('Invoice Contact Fields', () => {
  it('should include email and phone fields when creating an invoice', () => {
    const invoiceData = {
      clientName: 'Test Client',
      email: 'client@example.com',
      phone: '+919876543210',
      amount: 5000,
      paymentMethod: 'UPI',
      notes: 'Test invoice'
    };

    const invoice = createInvoice(invoiceData, []);

    expect(invoice).toHaveProperty('email');
    expect(invoice).toHaveProperty('phone');
    expect(invoice.email).toBe('client@example.com');
    expect(invoice.phone).toBe('+919876543210');
  });

  it('should handle empty email and phone fields', () => {
    const invoiceData = {
      clientName: 'Test Client',
      email: '',
      phone: '',
      amount: 5000,
      paymentMethod: 'UPI'
    };

    const invoice = createInvoice(invoiceData, []);

    expect(invoice.email).toBe('');
    expect(invoice.phone).toBe('');
  });

  it('should handle missing email and phone fields', () => {
    const invoiceData = {
      clientName: 'Test Client',
      amount: 5000,
      paymentMethod: 'UPI'
    };

    const invoice = createInvoice(invoiceData, []);

    expect(invoice.email).toBe('');
    expect(invoice.phone).toBe('');
  });

  it('should preserve all other invoice fields', () => {
    const invoiceData = {
      clientName: 'Test Client',
      email: 'client@example.com',
      phone: '9876543210',
      amount: 5000,
      paymentMethod: 'UPI',
      notes: 'Test notes'
    };

    const invoice = createInvoice(invoiceData, []);

    expect(invoice.clientName).toBe('Test Client');
    expect(invoice.amount).toBe(5000);
    expect(invoice.paymentMethod).toBe('UPI');
    expect(invoice.notes).toBe('Test notes');
    expect(invoice).toHaveProperty('id');
    expect(invoice).toHaveProperty('invoiceNumber');
    expect(invoice).toHaveProperty('dueDate');
    expect(invoice).toHaveProperty('status');
  });
});
