/**
 * Property-Based Tests for SMS Service
 * **Feature: ai-automated-reminders, Property 10: SMS Character Limit**
 * **Validates: Requirements 5.2**
 * 
 * Tests SMS service with generated data to verify universal properties
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { SMSService } from '../backend/services/smsService.js';

// Mock dependencies
vi.mock('twilio', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        sid: 'test_sid',
        status: 'queued'
      })
    },
    api: {
      accounts: vi.fn(() => ({
        fetch: vi.fn().mockResolvedValue({
          balance: '100.00',
          status: 'active'
        })
      }))
    }
  }))
}));

vi.mock('../backend/models/ServiceConfig.js', () => ({
  ServiceConfig: {
    findOne: vi.fn().mockResolvedValue({
      service: 'sms',
      isActive: true,
      settings: {
        accountSid: 'test_sid',
        authToken: 'test_token',
        phoneNumber: '+1234567890'
      }
    })
  }
}));

describe('SMS Service - Property-Based Tests', () => {
  let smsService;
  
  beforeEach(() => {
    smsService = new SMSService();
    vi.clearAllMocks();
  });

  describe('Property 10: SMS Character Limit', () => {
    it('should never exceed 160 characters after truncation', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          (message) => {
            const truncated = smsService.truncateMessage(message);
            
            // Property: truncated message should never exceed 160 characters
            expect(truncated.length).toBeLessThanOrEqual(160);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve messages under 160 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 160 }),
          (message) => {
            const truncated = smsService.truncateMessage(message);
            
            // Property: messages under limit should remain unchanged
            expect(truncated).toBe(message);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should add ellipsis to truncated messages', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 161, maxLength: 500 }),
          (message) => {
            const truncated = smsService.truncateMessage(message);
            
            // Property: truncated messages should end with ...
            expect(truncated).toMatch(/\.\.\.$/);
            expect(truncated.length).toBe(160);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Phone Number Validation Properties', () => {
    it('should handle any string input without crashing', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (phoneNumber) => {
            const result = smsService.validatePhoneNumber(phoneNumber);
            
            // Property: should always return an object with isValid property
            expect(result).toHaveProperty('isValid');
            expect(typeof result.isValid).toBe('boolean');
            
            if (result.isValid) {
              expect(result).toHaveProperty('number');
              expect(result.number).toMatch(/^\+\d+$/);
            } else {
              expect(result).toHaveProperty('error');
              expect(typeof result.error).toBe('string');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should validate that formatted numbers start with +', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^\d+$/.test(s)),
          (digits) => {
            const result = smsService.validatePhoneNumber(digits);
            
            // Property: valid formatted numbers should start with +
            if (result.isValid) {
              expect(result.number).toMatch(/^\+/);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should consistently validate the same phone number', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (phoneNumber) => {
            const result1 = smsService.validatePhoneNumber(phoneNumber);
            const result2 = smsService.validatePhoneNumber(phoneNumber);
            
            // Property: validation should be deterministic
            expect(result1.isValid).toBe(result2.isValid);
            if (result1.isValid) {
              expect(result1.number).toBe(result2.number);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Rate Limiting Properties', () => {
    it('should never allow more than the limit', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 15 }).map(s => '+91' + s.replace(/\D/g, '').slice(0, 10)),
          fc.integer({ min: 1, max: 20 }),
          (phoneNumber, attempts) => {
            // Reset rate limits
            smsService.rateLimits.clear();
            
            const maxLimit = 10;
            let allowedCount = 0;
            
            for (let i = 0; i < attempts; i++) {
              if (smsService.checkRateLimit(phoneNumber)) {
                smsService.updateRateLimit(phoneNumber);
                allowedCount++;
              }
            }
            
            // Property: allowed count should never exceed limit
            expect(allowedCount).toBeLessThanOrEqual(maxLimit);
          }
        ),
        { numRuns: 30 }
      );
    });
    
    it('should maintain separate limits for different numbers', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 15 }).map(s => '+91' + s.replace(/\D/g, '').slice(0, 10)),
          fc.string({ minLength: 10, maxLength: 15 }).map(s => '+91' + s.replace(/\D/g, '').slice(0, 10)),
          (phoneNumber1, phoneNumber2) => {
            // Skip if numbers are the same
            if (phoneNumber1 === phoneNumber2) return;
            
            // Reset rate limits
            smsService.rateLimits.clear();
            
            // Fill limit for phoneNumber1
            for (let i = 0; i < 10; i++) {
              if (smsService.checkRateLimit(phoneNumber1)) {
                smsService.updateRateLimit(phoneNumber1);
              }
            }
            
            // Property: phoneNumber2 should still be available
            const canSend = smsService.checkRateLimit(phoneNumber2);
            expect(canSend).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Message ID Generation Properties', () => {
    it('should generate unique IDs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (count) => {
            const ids = new Set();
            
            for (let i = 0; i < count; i++) {
              const id = smsService.generateMessageId();
              
              // Property: IDs should be unique
              expect(ids.has(id)).toBe(false);
              ids.add(id);
            }
            
            expect(ids.size).toBe(count);
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should generate IDs with consistent format', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          (count) => {
            for (let i = 0; i < count; i++) {
              const id = smsService.generateMessageId();
              
              // Property: IDs should match expected format
              expect(id).toMatch(/^sms_\d+_[a-z0-9]+$/);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Cost Calculation Properties', () => {
    it('should calculate non-negative costs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 15 }).map(s => '+' + s.replace(/\D/g, '').slice(0, 12)),
          fc.string({ minLength: 1, maxLength: 1000 }),
          (phoneNumber, message) => {
            const cost = smsService.calculateCost(phoneNumber, message);
            
            // Property: cost should always be non-negative
            expect(cost).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 50 }
      );
    });
    
    it('should calculate higher costs for longer messages', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 15 }).map(s => '+' + s.replace(/\D/g, '').slice(0, 12)),
          fc.string({ minLength: 1, maxLength: 160 }),
          fc.string({ minLength: 161, maxLength: 320 }),
          (phoneNumber, shortMessage, longMessage) => {
            const shortCost = smsService.calculateCost(phoneNumber, shortMessage);
            const longCost = smsService.calculateCost(phoneNumber, longMessage);
            
            // Property: longer messages should cost more or equal
            expect(longCost).toBeGreaterThanOrEqual(shortCost);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should calculate costs proportional to segments', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 15 }).map(s => '+91' + s.replace(/\D/g, '').slice(0, 10)),
          fc.integer({ min: 1, max: 5 }),
          (phoneNumber, segments) => {
            const messageLength = segments * 160;
            const message = 'A'.repeat(messageLength);
            const cost = smsService.calculateCost(phoneNumber, message);
            
            // Property: cost should be proportional to segments
            const expectedCost = segments * 0.0050; // Indian rate
            expect(cost).toBe(expectedCost);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Statistics Properties', () => {
    it('should maintain consistent statistics', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              messageId: fc.string({ minLength: 5, maxLength: 20 }),
              status: fc.constantFrom('sent', 'failed', 'pending'),
              cost: fc.float({ min: 0, max: 1 })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (messages) => {
            // Clear existing data
            smsService.deliveryStatus.clear();
            
            // Add test data
            messages.forEach(msg => {
              smsService.deliveryStatus.set(msg.messageId, {
                status: msg.status,
                metadata: { cost: msg.cost }
              });
            });
            
            const stats = smsService.getStatistics();
            
            // Property: total should match input
            expect(stats.total).toBe(messages.length);
            
            // Property: status counts should sum to total
            const statusSum = (stats.sent || 0) + (stats.failed || 0) + (stats.pending || 0);
            expect(statusSum).toBe(messages.length);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Twilio Status Mapping Properties', () => {
    it('should always return a valid status', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (twilioStatus) => {
            const mappedStatus = smsService.mapTwilioStatus(twilioStatus);
            
            // Property: should always return one of the valid statuses
            const validStatuses = ['pending', 'sent', 'delivered', 'failed', 'unknown'];
            expect(validStatuses).toContain(mappedStatus);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should be deterministic', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (twilioStatus) => {
            const result1 = smsService.mapTwilioStatus(twilioStatus);
            const result2 = smsService.mapTwilioStatus(twilioStatus);
            
            // Property: same input should always produce same output
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
