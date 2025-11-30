/**
 * Contact Validation Tests
 * Tests for email and phone validation functions
 */

import { describe, it, expect } from 'vitest';
import { validateEmail, validatePhone } from '../frontend/js/validator.js';

describe('Email Validation', () => {
  it('should accept valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user@domain.co.in')).toBe(true);
    expect(validateEmail('name+tag@company.org')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user @domain.com')).toBe(false);
  });

  it('should accept empty email (optional field)', () => {
    expect(validateEmail('')).toBe(true);
    expect(validateEmail(null)).toBe(true);
    expect(validateEmail(undefined)).toBe(true);
  });
});

describe('Phone Validation', () => {
  it('should accept valid Indian mobile numbers', () => {
    expect(validatePhone('9876543210')).toBe(true);
    expect(validatePhone('+919876543210')).toBe(true);
    expect(validatePhone('8123456789')).toBe(true);
    expect(validatePhone('+918123456789')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validatePhone('1234567890')).toBe(false); // Doesn't start with 6-9
    expect(validatePhone('98765')).toBe(false); // Too short
    expect(validatePhone('98765432101')).toBe(false); // Too long
    expect(validatePhone('+91123456789')).toBe(false); // Doesn't start with 6-9
    expect(validatePhone('abcdefghij')).toBe(false); // Not a number
  });

  it('should accept empty phone (optional field)', () => {
    expect(validatePhone('')).toBe(true);
    expect(validatePhone(null)).toBe(true);
    expect(validatePhone(undefined)).toBe(true);
  });
});
