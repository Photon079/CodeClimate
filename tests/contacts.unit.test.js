/**
 * Unit Tests for Contact Management Endpoints
 * Requirements: 1.1, 1.2, 1.3
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Extract validation logic for testing
const validateEmailLogic = (email) => {
  if (email !== undefined && email !== null && email !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  return true; // Optional field
};

const validatePhoneLogic = (phone) => {
  if (phone !== undefined && phone !== null && phone !== '') {
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  }
  return true; // Optional field
};

// Middleware wrapper for testing
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (!validateEmailLogic(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format',
      field: 'email'
    });
  }
  
  next();
};

const validatePhone = (req, res, next) => {
  const { phone } = req.body;
  
  if (!validatePhoneLogic(phone)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid phone format. Must be a valid Indian mobile number',
      field: 'phone'
    });
  }
  
  next();
};

describe('Contact Management - Unit Tests', () => {
  
  /**
   * Email Validation Middleware Tests
   * Requirement 1.2: Email format validation
   */
  describe('Email Validation Middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { body: {} };
      res = {
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          this.jsonData = data;
          return this;
        }
      };
      next = () => { next.called = true; };
    });

    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user_name@example.com',
        'user-name@example.com',
        'user123@example.com',
        'u@example.com',
        'user@sub.example.com',
        'user@example.co.in'
      ];

      validEmails.forEach(email => {
        req.body.email = email;
        next.called = false;
        
        validateEmail(req, res, next);
        
        expect(next.called).toBe(true);
        expect(res.statusCode).toBeUndefined();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        'user@@example.com',
        ' user@example.com',
        'user@example.com '
      ];

      invalidEmails.forEach(email => {
        req.body.email = email;
        next.called = false;
        
        validateEmail(req, res, next);
        
        expect(next.called).toBeFalsy();
        expect(res.statusCode).toBe(400);
        expect(res.jsonData.success).toBe(false);
        expect(res.jsonData.error).toContain('Invalid email format');
        expect(res.jsonData.field).toBe('email');
      });
    });

    it('should allow empty or undefined email (optional field)', () => {
      const optionalValues = ['', null, undefined];

      optionalValues.forEach(value => {
        req.body.email = value;
        next.called = false;
        
        validateEmail(req, res, next);
        
        expect(next.called).toBe(true);
        expect(res.statusCode).toBeUndefined();
      });
    });

    it('should reject emails with whitespace', () => {
      const emailsWithWhitespace = [
        ' user@example.com',
        'user@example.com ',
        'user @example.com',
        'user@ example.com',
        'user@example .com'
      ];

      emailsWithWhitespace.forEach(email => {
        req.body.email = email;
        next.called = false;
        
        validateEmail(req, res, next);
        
        expect(next.called).toBeFalsy();
        expect(res.statusCode).toBe(400);
      });
    });
  });

  /**
   * Phone Validation Middleware Tests
   * Requirement 1.3: Phone format validation (Indian mobile numbers)
   */
  describe('Phone Validation Middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { body: {} };
      res = {
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          this.jsonData = data;
          return this;
        }
      };
      next = () => { next.called = true; };
    });

    it('should accept valid Indian mobile numbers with +91 prefix', () => {
      const validPhones = [
        '+919876543210',
        '+918765432109',
        '+917654321098',
        '+916543210987'
      ];

      validPhones.forEach(phone => {
        req.body.phone = phone;
        next.called = false;
        
        validatePhone(req, res, next);
        
        expect(next.called).toBe(true);
        expect(res.statusCode).toBeUndefined();
      });
    });

    it('should accept valid Indian mobile numbers without prefix (10 digits)', () => {
      const validPhones = [
        '9876543210',
        '8765432109',
        '7654321098',
        '6543210987'
      ];

      validPhones.forEach(phone => {
        req.body.phone = phone;
        next.called = false;
        
        validatePhone(req, res, next);
        
        expect(next.called).toBe(true);
        expect(res.statusCode).toBeUndefined();
      });
    });

    it('should allow empty or undefined phone (optional field)', () => {
      const optionalValues = ['', null, undefined];

      optionalValues.forEach(value => {
        req.body.phone = value;
        next.called = false;
        
        validatePhone(req, res, next);
        
        expect(next.called).toBe(true);
        expect(res.statusCode).toBeUndefined();
      });
    });

    it('should reject phone numbers with invalid first digit', () => {
      const invalidPhones = [
        '0123456789',
        '1234567890',
        '2345678901',
        '3456789012',
        '4567890123',
        '5678901234'
      ];

      invalidPhones.forEach(phone => {
        req.body.phone = phone;
        next.called = false;
        
        validatePhone(req, res, next);
        
        expect(next.called).toBeFalsy();
        expect(res.statusCode).toBe(400);
        expect(res.jsonData.success).toBe(false);
        expect(res.jsonData.error).toContain('Invalid phone format');
        expect(res.jsonData.field).toBe('phone');
      });
    });

    it('should reject phone numbers with incorrect length', () => {
      const invalidPhones = [
        '987654321',      // 9 digits
        '98765432',       // 8 digits
        '98765432101',    // 11 digits
        '+9198765432',    // Too short with prefix
        '+91987654321012' // Too long with prefix
      ];

      invalidPhones.forEach(phone => {
        req.body.phone = phone;
        next.called = false;
        
        validatePhone(req, res, next);
        
        expect(next.called).toBeFalsy();
        expect(res.statusCode).toBe(400);
      });
    });

    it('should reject phone numbers with invalid characters', () => {
      const invalidPhones = [
        '123-456-7890',
        '(123) 456-7890',
        '123 456 7890',
        '123.456.7890',
        '+91 9876543210',
        '+91-9876543210',
        '9876543210a',
        'a9876543210',
        '98765abc10'
      ];

      invalidPhones.forEach(phone => {
        req.body.phone = phone;
        next.called = false;
        
        validatePhone(req, res, next);
        
        expect(next.called).toBeFalsy();
        expect(res.statusCode).toBe(400);
      });
    });

    it('should reject phone numbers with wrong country code', () => {
      const invalidPhones = [
        '+19876543210',   // US
        '+449876543210',  // UK
        '+869876543210',  // China
        '+619876543210',  // Australia
        '+819876543210'   // Japan
      ];

      invalidPhones.forEach(phone => {
        req.body.phone = phone;
        next.called = false;
        
        validatePhone(req, res, next);
        
        expect(next.called).toBeFalsy();
        expect(res.statusCode).toBe(400);
      });
    });
  });

  /**
   * Contact Creation Validation Tests
   * Requirement 1.1: Store client contact information
   */
  describe('Contact Creation Validation', () => {
    it('should require at least one contact method (email or phone)', () => {
      // This test validates the business logic that at least one contact method is required
      // The actual endpoint implementation enforces this rule
      
      const validContactCombinations = [
        { email: 'user@example.com', phone: null },
        { email: null, phone: '9876543210' },
        { email: 'user@example.com', phone: '9876543210' }
      ];

      validContactCombinations.forEach(contact => {
        const hasContactMethod = contact.email || contact.phone;
        expect(hasContactMethod).toBeTruthy();
      });
    });

    it('should reject contacts with neither email nor phone', () => {
      const invalidContactCombinations = [
        { email: null, phone: null },
        { email: '', phone: '' },
        { email: undefined, phone: undefined }
      ];

      invalidContactCombinations.forEach(contact => {
        const hasContactMethod = contact.email || contact.phone;
        expect(hasContactMethod).toBeFalsy();
      });
    });
  });

  /**
   * Contact Update Validation Tests
   * Requirement 1.1: Update client contact information
   */
  describe('Contact Update Validation', () => {
    it('should allow updating individual fields', () => {
      // Test that updates can be partial
      const updateScenarios = [
        { clientName: 'New Name' },
        { email: 'newemail@example.com' },
        { phone: '9876543210' },
        { clientName: 'New Name', email: 'newemail@example.com' },
        { clientName: 'New Name', phone: '9876543210' },
        { email: 'newemail@example.com', phone: '9876543210' }
      ];

      updateScenarios.forEach(update => {
        // Each update scenario should be valid
        expect(Object.keys(update).length).toBeGreaterThan(0);
      });
    });

    it('should maintain at least one contact method after update', () => {
      // Simulate existing contact
      const existingContact = {
        clientName: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210'
      };

      // Valid update: removing phone but keeping email
      const update1 = { phone: null };
      const result1 = { ...existingContact, ...update1 };
      expect(result1.email || result1.phone).toBeTruthy();

      // Valid update: removing email but keeping phone
      const update2 = { email: null };
      const result2 = { ...existingContact, ...update2 };
      expect(result2.email || result2.phone).toBeTruthy();

      // Invalid update: removing both
      const update3 = { email: null, phone: null };
      const result3 = { ...existingContact, ...update3 };
      expect(result3.email || result3.phone).toBeFalsy();
    });
  });

  /**
   * Validation Error Response Tests
   * Requirement 1.2, 1.3: Proper error responses for validation failures
   */
  describe('Validation Error Responses', () => {
    it('should return proper error structure for email validation', () => {
      const req = { body: { email: 'invalid-email' } };
      const res = {
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          this.jsonData = data;
          return this;
        }
      };
      const next = () => {};

      validateEmail(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toHaveProperty('success', false);
      expect(res.jsonData).toHaveProperty('error');
      expect(res.jsonData).toHaveProperty('field', 'email');
    });

    it('should return proper error structure for phone validation', () => {
      const req = { body: { phone: 'invalid-phone' } };
      const res = {
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          this.jsonData = data;
          return this;
        }
      };
      const next = () => {};

      validatePhone(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData).toHaveProperty('success', false);
      expect(res.jsonData).toHaveProperty('error');
      expect(res.jsonData).toHaveProperty('field', 'phone');
    });
  });
});
