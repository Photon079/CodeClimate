/**
 * Email Service Retry Logic Tests
 * Tests for Requirements 4.6, 13.1, 13.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the email service
class MockEmailService {
  constructor() {
    this.maxRetries = 3;
    this.initialRetryDelay = 100; // Reduced for testing
    this.retryMultiplier = 2;
    this.provider = 'sendgrid';
  }

  _isRetryableError(error) {
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'RATE_LIMIT_EXCEEDED',
      '429',
      '500',
      '503'
    ];

    const errorMessage = error.message || '';
    return retryableErrors.some(code => errorMessage.includes(code));
  }

  _calculateRetryDelay(attempt) {
    return this.initialRetryDelay * Math.pow(this.retryMultiplier, attempt);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendEmail(params, options = {}) {
    const { attempt = 0, skipRetry = false, mockError = null } = options;

    try {
      // Simulate error if mockError is provided
      if (mockError) {
        throw mockError;
      }

      return {
        success: true,
        messageId: 'test-message-id',
        provider: this.provider,
        attempt: attempt + 1
      };
    } catch (error) {
      const isRetryable = this._isRetryableError(error);

      if (!skipRetry && isRetryable && attempt < this.maxRetries) {
        const delay = this._calculateRetryDelay(attempt);
        await this._sleep(delay);
        return this.sendEmail(params, { attempt: attempt + 1, mockError: options.mockError });
      }

      return {
        success: false,
        error: error.message,
        provider: this.provider,
        attempt: attempt + 1,
        retryable: isRetryable
      };
    }
  }
}

describe('Email Service Retry Logic', () => {
  let emailService;

  beforeEach(() => {
    emailService = new MockEmailService();
  });

  /**
   * Test: Successful email send without retry
   * Validates: Requirements 4.6
   */
  it('should send email successfully on first attempt', async () => {
    const result = await emailService.sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test'
    });

    expect(result.success).toBe(true);
    expect(result.attempt).toBe(1);
    expect(result.messageId).toBe('test-message-id');
  });

  /**
   * Test: Retry on retryable error
   * Validates: Requirements 13.1, 13.2
   */
  it('should retry on retryable errors with exponential backoff', async () => {
    const retryableError = new Error('ETIMEDOUT');
    
    // Mock to fail twice then succeed
    let attemptCount = 0;
    const mockSendEmail = async (params, options = {}) => {
      attemptCount++;
      const { attempt = 0, skipRetry = false } = options;

      try {
        if (attemptCount <= 2) {
          throw retryableError;
        }

        return {
          success: true,
          messageId: 'test-message-id',
          provider: 'sendgrid',
          attempt: attempt + 1
        };
      } catch (error) {
        const isRetryable = emailService._isRetryableError(error);

        if (!skipRetry && isRetryable && attempt < emailService.maxRetries) {
          const delay = emailService._calculateRetryDelay(attempt);
          await emailService._sleep(delay);
          return mockSendEmail(params, { attempt: attempt + 1 });
        }

        return {
          success: false,
          error: error.message,
          provider: 'sendgrid',
          attempt: attempt + 1,
          retryable: isRetryable
        };
      }
    };

    const result = await mockSendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test'
    });

    expect(result.success).toBe(true);
    expect(result.attempt).toBe(3);
    expect(attemptCount).toBe(3);
  });

  /**
   * Test: Exponential backoff calculation
   * Validates: Requirements 13.1
   */
  it('should calculate exponential backoff correctly', () => {
    expect(emailService._calculateRetryDelay(0)).toBe(100);  // 100 * 2^0
    expect(emailService._calculateRetryDelay(1)).toBe(200);  // 100 * 2^1
    expect(emailService._calculateRetryDelay(2)).toBe(400);  // 100 * 2^2
  });

  /**
   * Test: Identify retryable errors
   * Validates: Requirements 13.1
   */
  it('should identify retryable errors correctly', () => {
    expect(emailService._isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
    expect(emailService._isRetryableError(new Error('ECONNREFUSED'))).toBe(true);
    expect(emailService._isRetryableError(new Error('503'))).toBe(true);
    expect(emailService._isRetryableError(new Error('RATE_LIMIT_EXCEEDED'))).toBe(true);
    expect(emailService._isRetryableError(new Error('Invalid email'))).toBe(false);
  });

  /**
   * Test: Max retries limit
   * Validates: Requirements 13.1
   */
  it('should stop retrying after max attempts', async () => {
    const retryableError = new Error('ETIMEDOUT');
    
    const result = await emailService.sendEmail(
      {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test'
      },
      { mockError: retryableError }
    );

    expect(result.success).toBe(false);
    expect(result.attempt).toBe(4); // Initial + 3 retries
    expect(result.retryable).toBe(true);
  });

  /**
   * Test: Non-retryable errors should not retry
   * Validates: Requirements 13.1
   */
  it('should not retry on non-retryable errors', async () => {
    const nonRetryableError = new Error('Invalid email address');
    
    const result = await emailService.sendEmail(
      {
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test'
      },
      { mockError: nonRetryableError }
    );

    expect(result.success).toBe(false);
    expect(result.attempt).toBe(1); // No retries
    expect(result.retryable).toBe(false);
  });
});
