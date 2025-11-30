/**
 * Unit Tests for SMS Service
 * Tests SMS sending, retry logic, rate limiting, and message truncation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SMSService } from '../backend/services/smsService.js';

// Mock Twilio
vi.mock('twilio', () => {
  return {
    default: vi.fn(() => ({
      messages: {
        create: vi.fn()
      },
      api: {
        accounts: vi.fn(() => ({
          fetch: vi.fn()
        }))
      }
    }))
  };
});

// Mock ServiceConfig
vi.mock('../backend/models/ServiceConfig.js', () => {
  return {
    ServiceConfig: {
      findOne: vi.fn()
    }
  };
});

describe('SMS Service - Unit Tests', () => {
  let smsService;
  
  beforeEach(() => {
    smsService = new SMSService();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Phone Number Validation', () => {
    it('should validate and format Indian phone numbers', () => {
      const result = smsService.validatePhoneNumber('9876543210');
      
      expect(result.isValid).toBe(true);
      expect(result.number).toBe('+919876543210');
    });
    
    it('should handle phone numbers with country code', () => {
      const result = smsService.validatePhoneNumber('+919876543210');
      
      expect(result.isValid).toBe(true);
      expect(result.number).toBe('+919876543210');
    });
    
    it('should reject invalid phone numbers', () => {
      const result = smsService.validatePhoneNumber('123');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be between 10-15 digits');
    });
    
    it('should handle phone numbers with formatting', () => {
      const result = smsService.validatePhoneNumber('(987) 654-3210');
      
      expect(result.isValid).toBe(true);
      expect(result.number).toBe('+919876543210');
    });

    it('should reject empty phone numbers', () => {
      const result = smsService.validatePhoneNumber('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    it('should reject null phone numbers', () => {
      const result = smsService.validatePhoneNumber(null);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });
  });

  describe('Message Truncation', () => {
    it('should not truncate messages under 160 characters', () => {
      const message = 'Short message';
      const result = smsService.truncateMessage(message);
      
      expect(result).toBe(message);
      expect(result.length).toBeLessThanOrEqual(160);
    });
    
    it('should truncate messages over 160 characters', () => {
      const message = 'A'.repeat(200);
      const result = smsService.truncateMessage(message);
      
      expect(result.length).toBe(160);
      expect(result).toMatch(/\.\.\.$/);
    });
    
    it('should truncate exactly at 160 characters including ellipsis', () => {
      const message = 'B'.repeat(200);
      const result = smsService.truncateMessage(message);
      
      expect(result.length).toBe(160);
      expect(result.substring(157)).toBe('...');
    });

    it('should handle messages exactly 160 characters', () => {
      const message = 'C'.repeat(160);
      const result = smsService.truncateMessage(message);
      
      expect(result).toBe(message);
      expect(result.length).toBe(160);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow messages within rate limit', () => {
      const phoneNumber = '+919876543210';
      
      const canSend = smsService.checkRateLimit(phoneNumber);
      expect(canSend).toBe(true);
    });
    
    it('should block messages exceeding rate limit', () => {
      const phoneNumber = '+919876543210';
      
      // Simulate sending max messages (10)
      for (let i = 0; i < 10; i++) {
        smsService.updateRateLimit(phoneNumber);
      }
      
      const canSend = smsService.checkRateLimit(phoneNumber);
      expect(canSend).toBe(false);
    });
    
    it('should have separate limits for different phone numbers', () => {
      const phoneNumber1 = '+919876543210';
      const phoneNumber2 = '+919876543211';
      
      // Fill limit for phoneNumber1
      for (let i = 0; i < 10; i++) {
        smsService.updateRateLimit(phoneNumber1);
      }
      
      // phoneNumber2 should still be available
      const canSend = smsService.checkRateLimit(phoneNumber2);
      expect(canSend).toBe(true);
    });

    it('should reset rate limit after time window', () => {
      const phoneNumber = '+919876543210';
      
      // Manually set old timestamps
      smsService.rateLimits.set(phoneNumber, [
        Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
      ]);
      
      const canSend = smsService.checkRateLimit(phoneNumber);
      expect(canSend).toBe(true);
    });
  });

  describe('Message ID Generation', () => {
    it('should generate unique message IDs', () => {
      const id1 = smsService.generateMessageId();
      const id2 = smsService.generateMessageId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^sms_\d+_[a-z0-9]+$/);
    });

    it('should generate IDs with consistent format', () => {
      const id = smsService.generateMessageId();
      
      expect(id).toMatch(/^sms_\d+_[a-z0-9]+$/);
      expect(id.startsWith('sms_')).toBe(true);
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate costs for Indian numbers', () => {
      const cost = smsService.calculateCost('+919876543210', 'Short message');
      expect(cost).toBe(0.0050); // Single segment, Indian rate
    });
    
    it('should calculate higher costs for international numbers', () => {
      const cost = smsService.calculateCost('+1234567890', 'Short message');
      expect(cost).toBe(0.0075); // Single segment, international rate
    });
    
    it('should calculate multi-segment message costs', () => {
      const longMessage = 'A'.repeat(320); // 2 segments
      const cost = smsService.calculateCost('+919876543210', longMessage);
      expect(cost).toBe(0.0100); // 2 segments * 0.0050
    });

    it('should calculate costs for exactly 160 characters', () => {
      const message = 'B'.repeat(160);
      const cost = smsService.calculateCost('+919876543210', message);
      expect(cost).toBe(0.0050); // 1 segment
    });

    it('should calculate costs for 161 characters as 2 segments', () => {
      const message = 'C'.repeat(161);
      const cost = smsService.calculateCost('+919876543210', message);
      expect(cost).toBe(0.0100); // 2 segments
    });
  });

  describe('Delivery Status', () => {
    it('should store and retrieve delivery status', () => {
      const messageId = 'test_message_123';
      const status = {
        status: 'sent',
        timestamp: new Date()
      };
      
      smsService.deliveryStatus.set(messageId, status);
      
      const retrieved = smsService.getDeliveryStatus(messageId);
      expect(retrieved.status).toBe('sent');
    });
    
    it('should return unknown status for non-existent message', () => {
      const status = smsService.getDeliveryStatus('non_existent');
      expect(status.status).toBe('unknown');
      expect(status.error).toBe('Message ID not found');
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics correctly', () => {
      // Add some test data
      smsService.deliveryStatus.set('msg1', {
        status: 'sent',
        metadata: { cost: 0.0050 }
      });
      
      smsService.deliveryStatus.set('msg2', {
        status: 'failed',
        metadata: { cost: 0 }
      });
      
      const stats = smsService.getStatistics();
      
      expect(stats.total).toBe(2);
      expect(stats.sent).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should calculate total cost correctly', () => {
      smsService.deliveryStatus.set('msg1', {
        status: 'sent',
        metadata: { cost: 0.0050 }
      });
      
      smsService.deliveryStatus.set('msg2', {
        status: 'sent',
        metadata: { cost: 0.0075 }
      });
      
      const stats = smsService.getStatistics();
      expect(stats.totalCost).toBe(0.0125);
    });
  });

  describe('Twilio Status Mapping', () => {
    it('should map Twilio statuses correctly', () => {
      expect(smsService.mapTwilioStatus('queued')).toBe('pending');
      expect(smsService.mapTwilioStatus('sending')).toBe('pending');
      expect(smsService.mapTwilioStatus('sent')).toBe('sent');
      expect(smsService.mapTwilioStatus('delivered')).toBe('delivered');
      expect(smsService.mapTwilioStatus('undelivered')).toBe('failed');
      expect(smsService.mapTwilioStatus('failed')).toBe('failed');
      expect(smsService.mapTwilioStatus('unknown_status')).toBe('unknown');
    });
  });

  describe('Webhook Handling', () => {
    it('should handle Twilio webhooks correctly', () => {
      const messageId = 'test_message_123';
      
      // Set initial status
      smsService.deliveryStatus.set(messageId, {
        status: 'pending',
        timestamp: new Date()
      });
      
      // Simulate webhook
      const webhookPayload = {
        MessageSid: messageId,
        MessageStatus: 'delivered',
        ErrorMessage: null
      };
      
      smsService.handleDeliveryWebhook(webhookPayload);
      
      const status = smsService.getDeliveryStatus(messageId);
      expect(status.status).toBe('delivered');
    });

    it('should handle webhook errors', () => {
      const messageId = 'test_message_456';
      
      smsService.deliveryStatus.set(messageId, {
        status: 'pending',
        timestamp: new Date()
      });
      
      const webhookPayload = {
        MessageSid: messageId,
        MessageStatus: 'failed',
        ErrorMessage: 'Invalid phone number'
      };
      
      smsService.handleDeliveryWebhook(webhookPayload);
      
      const status = smsService.getDeliveryStatus(messageId);
      expect(status.status).toBe('failed');
      expect(status.error).toBe('Invalid phone number');
    });
  });

  describe('Error Handling', () => {
    it('should handle uninitialized service', async () => {
      smsService.client = null;
      
      await expect(
        smsService.attemptSend({
          messageId: 'test',
          to: '+919876543210',
          message: 'Test',
          priority: 'normal',
          metadata: {}
        })
      ).rejects.toThrow('SMS service not initialized');
    });
  });
});
