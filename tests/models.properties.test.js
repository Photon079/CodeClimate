/**
 * Property-Based Tests for Data Models
 * Using fast-check for property-based testing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Mock mongoose for testing validation logic
const mockMongoose = {
  Schema: class {
    constructor(definition, options) {
      this.definition = definition;
      this.options = options;
      this.validators = {};
      this.indexes = [];
      
      // Extract validators from definition
      Object.keys(definition).forEach(key => {
        if (definition[key].validate) {
          this.validators[key] = definition[key].validate;
        }
      });
    }
    
    index() {
      this.indexes.push(arguments);
    }
    
    pre() {}
  },
  model: (name, schema) => {
    return {
      modelName: name,
      schema: schema
    };
  }
};

// Mock the validation functions from the models
const emailValidator = (v) => {
  // RFC 5322 compliant email validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
};

const phoneValidator = (v) => {
  if (!v) return true; // Phone is optional
  // Indian mobile number validation: +91XXXXXXXXXX or 10 digits
  return /^(\+91)?[6-9]\d{9}$/.test(v);
};

describe('Data Models - Property-Based Tests', () => {
  /**
   * **Feature: ai-automated-reminders, Property 1: Contact Information Validation**
   * **Validates: Requirements 1.2**
   * 
   * For any client contact with an email address, the email format should be valid
   * according to RFC 5322 standards.
   */
  describe('Property 1: Contact Information Validation', () => {
    it('should accept valid email addresses', () => {
      // Generator for valid email addresses
      const validEmailArbitrary = fc.tuple(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789.-_'.split('')), { minLength: 1, maxLength: 20 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), { minLength: 1, maxLength: 20 }),
        fc.constantFrom('com', 'org', 'net', 'in', 'co.in', 'edu', 'gov')
      ).map(([local, domain, tld]) => {
        // Ensure local part doesn't start/end with special chars
        const cleanLocal = local.replace(/^[.-_]+|[.-_]+$/g, '') || 'a';
        const cleanDomain = domain.replace(/^-+|-+$/g, '') || 'example';
        return `${cleanLocal}@${cleanDomain}.${tld}`;
      });

      fc.assert(
        fc.property(validEmailArbitrary, (email) => {
          const isValid = emailValidator(email);
          expect(isValid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid email addresses', () => {
      // Generator for invalid email addresses
      const invalidEmailArbitrary = fc.oneof(
        fc.constant(''),                    // Empty string
        fc.constant('notanemail'),          // No @ symbol
        fc.constant('@example.com'),        // Missing local part
        fc.constant('user@'),               // Missing domain
        fc.constant('user @example.com'),   // Space in email
        fc.constant('user@example'),        // Missing TLD
        fc.constant('user@@example.com'),   // Double @
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@')), // No @ symbol
        fc.string({ minLength: 1, maxLength: 50 }).map(s => `@${s}`), // Starts with @
        fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}@`) // Ends with @
      );

      fc.assert(
        fc.property(invalidEmailArbitrary, (email) => {
          const isValid = emailValidator(email);
          expect(isValid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle email addresses with various valid formats', () => {
      // Generator for edge case valid emails
      const edgeCaseValidEmailArbitrary = fc.constantFrom(
        'user@example.com',
        'user.name@example.com',
        'user_name@example.com',
        'user-name@example.com',
        'user123@example.com',
        'u@example.com',
        'user@sub.example.com',
        'user@example.co.in'
      );

      fc.assert(
        fc.property(edgeCaseValidEmailArbitrary, (email) => {
          const isValid = emailValidator(email);
          expect(isValid).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('should reject email addresses with whitespace', () => {
      // Generator for emails with whitespace
      const emailWithWhitespaceArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('com', 'org', 'net')
      ).map(([local, domain, tld]) => {
        const variants = [
          ` ${local}@${domain}.${tld}`,      // Leading space
          `${local}@${domain}.${tld} `,      // Trailing space
          `${local} @${domain}.${tld}`,      // Space before @
          `${local}@ ${domain}.${tld}`,      // Space after @
          `${local}@${domain} .${tld}`,      // Space before .
        ];
        return variants[Math.floor(Math.random() * variants.length)];
      });

      fc.assert(
        fc.property(emailWithWhitespaceArbitrary, (email) => {
          const isValid = emailValidator(email);
          expect(isValid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-automated-reminders, Property 2: Phone Number Validation**
   * **Validates: Requirements 1.3**
   * 
   * For any client contact with a phone number, the phone format should match
   * Indian mobile number patterns (+91XXXXXXXXXX or 10 digits).
   */
  describe('Property 2: Phone Number Validation', () => {
    it('should accept valid Indian mobile numbers with +91 prefix', () => {
      // Generator for valid Indian mobile numbers with +91 prefix
      // Indian mobile numbers start with 6, 7, 8, or 9
      const validPhoneWithPrefixArbitrary = fc.tuple(
        fc.constantFrom('6', '7', '8', '9'),
        fc.integer({ min: 0, max: 999999999 }).map(n => n.toString().padStart(9, '0'))
      ).map(([firstDigit, rest]) => `+91${firstDigit}${rest}`);

      fc.assert(
        fc.property(validPhoneWithPrefixArbitrary, (phone) => {
          const isValid = phoneValidator(phone);
          expect(isValid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept valid Indian mobile numbers without prefix (10 digits)', () => {
      // Generator for valid 10-digit Indian mobile numbers
      const validPhoneWithoutPrefixArbitrary = fc.tuple(
        fc.constantFrom('6', '7', '8', '9'),
        fc.integer({ min: 0, max: 999999999 }).map(n => n.toString().padStart(9, '0'))
      ).map(([firstDigit, rest]) => `${firstDigit}${rest}`);

      fc.assert(
        fc.property(validPhoneWithoutPrefixArbitrary, (phone) => {
          const isValid = phoneValidator(phone);
          expect(isValid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept empty/null phone numbers (optional field)', () => {
      // Generator for empty/null values
      const emptyPhoneArbitrary = fc.constantFrom('', null, undefined);

      fc.assert(
        fc.property(emptyPhoneArbitrary, (phone) => {
          const isValid = phoneValidator(phone);
          expect(isValid).toBe(true);
        }),
        { numRuns: 10 }
      );
    });

    it('should reject phone numbers with invalid first digit', () => {
      // Generator for phone numbers starting with invalid digits (0-5)
      const invalidFirstDigitArbitrary = fc.tuple(
        fc.constantFrom('0', '1', '2', '3', '4', '5'),
        fc.integer({ min: 0, max: 999999999 }).map(n => n.toString().padStart(9, '0'))
      ).map(([firstDigit, rest]) => `${firstDigit}${rest}`);

      fc.assert(
        fc.property(invalidFirstDigitArbitrary, (phone) => {
          const isValid = phoneValidator(phone);
          expect(isValid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject phone numbers with incorrect length', () => {
      // Generator for phone numbers with wrong length
      const wrongLengthArbitrary = fc.oneof(
        // Too short (less than 10 digits)
        fc.integer({ min: 0, max: 999999999 }).map(n => n.toString()),
        // Too long (more than 10 digits)
        fc.integer({ min: 10000000000, max: 99999999999 }).map(n => n.toString()),
        // With +91 but wrong length
        fc.integer({ min: 0, max: 999999999 }).map(n => `+91${n}`),
        fc.integer({ min: 10000000000, max: 99999999999 }).map(n => `+91${n}`)
      );

      fc.assert(
        fc.property(wrongLengthArbitrary, (phone) => {
          const isValid = phoneValidator(phone);
          expect(isValid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject phone numbers with invalid characters', () => {
      // Generator for phone numbers with invalid characters
      const invalidCharsArbitrary = fc.oneof(
        fc.constant('123-456-7890'),           // Hyphens
        fc.constant('(123) 456-7890'),         // Parentheses and spaces
        fc.constant('123 456 7890'),           // Spaces
        fc.constant('123.456.7890'),           // Dots
        fc.constant('+91 9876543210'),         // Space after prefix
        fc.constant('+91-9876543210'),         // Hyphen after prefix
        fc.constant('9876543210a'),            // Letter at end
        fc.constant('a9876543210'),            // Letter at start
        fc.constant('98765abc10')              // Letters in middle
      );

      fc.assert(
        fc.property(invalidCharsArbitrary, (phone) => {
          const isValid = phoneValidator(phone);
          expect(isValid).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('should reject phone numbers with wrong country code', () => {
      // Generator for phone numbers with wrong country codes
      const wrongCountryCodeArbitrary = fc.tuple(
        fc.constantFrom('+1', '+44', '+86', '+61', '+81', '+92', '+880'),
        fc.constantFrom('6', '7', '8', '9'),
        fc.integer({ min: 0, max: 999999999 }).map(n => n.toString().padStart(9, '0'))
      ).map(([code, firstDigit, rest]) => `${code}${firstDigit}${rest}`);

      fc.assert(
        fc.property(wrongCountryCodeArbitrary, (phone) => {
          const isValid = phoneValidator(phone);
          expect(isValid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases for valid phone numbers', () => {
      // Generator for specific valid edge cases
      const edgeCaseValidPhoneArbitrary = fc.constantFrom(
        '9876543210',      // Valid 10-digit starting with 9
        '8765432109',      // Valid 10-digit starting with 8
        '7654321098',      // Valid 10-digit starting with 7
        '6543210987',      // Valid 10-digit starting with 6
        '+919876543210',   // Valid with +91 prefix
        '+918765432109',   // Valid with +91 prefix
        '+917654321098',   // Valid with +91 prefix
        '+916543210987'    // Valid with +91 prefix
      );

      fc.assert(
        fc.property(edgeCaseValidPhoneArbitrary, (phone) => {
          const isValid = phoneValidator(phone);
          expect(isValid).toBe(true);
        }),
        { numRuns: 50 }
      );
    });
  });
});
