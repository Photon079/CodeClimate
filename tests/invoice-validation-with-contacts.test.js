/**
 * Invoice Validation with Contacts Tests
 * Tests that invoice validation properly handles email and phone fields
 */

import { describe, it, expect } from 'vitest';
import { validateInvoice } from '../frontend/js/validator.js';

describe('Invoice Validation with Contact Fields', () => {
  it('should validate invoice with valid email and phone', () => {
    const invoiceData = {
      clientName: 'Test Client',
      email: 'client@example.com',
      phone: '+919876543210',
      amount: 5000,
      paymentMethod: 'UPI',
      dueDate: '2024-12-31'
    };

    const result = validateInvoice(invoiceData);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate invoice with empty email and phone (optional fields)', () => {
    const invoiceData = {
      clientName: 'Test Client',
      email: '',
      phone: '',
      amount: 5000,
      paymentMethod: 'UPI',
      dueDate: '2024-12-31'
    };

    const result = validateInvoice(invoiceData);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invoice with invalid email', () => {
    const invoiceData = {
      clientName: 'Test Client',
      email: 'invalid-email',
      phone: '9876543210',
      amount: 5000,
      paymentMethod: 'UPI',
      dueDate: '2024-12-31'
    };

    const result = validateInvoice(invoiceData);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('email');
    expect(result.errors[0].message).toContain('valid email');
  });

  it('should reject invoice with invalid phone', () => {
    const invoiceData = {
      clientName: 'Test Client',
      email: 'client@example.com',
      phone: '1234567890', // Doesn't start with 6-9
      amount: 5000,
      paymentMethod: 'UPI',
      dueDate: '2024-12-31'
    };

    const result = validateInvoice(invoiceData);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('phone');
    expect(result.errors[0].message).toContain('Indian mobile number');
  });

  it('should reject invoice with both invalid email and phone', () => {
    const invoiceData = {
      clientName: 'Test Client',
      email: 'not-an-email',
      phone: '123',
      amount: 5000,
      paymentMethod: 'UPI',
      dueDate: '2024-12-31'
    };

    const result = validateInvoice(invoiceData);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    
    const emailError = result.errors.find(e => e.field === 'email');
    const phoneError = result.errors.find(e => e.field === 'phone');
    
    expect(emailError).toBeDefined();
    expect(phoneError).toBeDefined();
  });

  it('should validate invoice without email and phone fields (backward compatibility)', () => {
    const invoiceData = {
      clientName: 'Test Client',
      amount: 5000,
      paymentMethod: 'UPI',
      dueDate: '2024-12-31'
    };

    const result = validateInvoice(invoiceData);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
