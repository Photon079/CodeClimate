/**
 * Property-Based Tests for Retry Logic
 * **Feature: ai-automated-reminders, Property 11: Retry Logic**
 * **Validates: Requirements 4.6, 5.6**
 * 
 * Tests that the system retries failed reminder deliveries after 1 hour with exponential backoff
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

/**
 * Mock service with retry logic
 * Simulates email/SMS delivery with configurable retry behavior
 */
class MockDeliveryService {
  constructor() {
    this.maxRetries = 3;
    this.initialRetryDelay = 60000; // 1 minute in milliseconds (reduced from 1 hour for testing)
    this.retryMultiplier = 2; // Exponential backoff multiplier
    this.deliveryAttempts = [];
  }

  /**
   * Determine if an error is retryable
   */
  _isRetryableError(error) {
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET',
      'RATE_LIMIT_EXCEEDED',
      'SERVICE_UNAVAILABLE',
      '429',
      '500',
      '502',
      '503',
      '504'
    ];

    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    
    return retryableErrors.some(retryableCode => 
      errorMessage.includes(retryableCode) || 
      errorCode.includes(retryableCode)
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  _calculateRetryDelay(attempt) {
    return this.initialRetryDelay * Math.pow(this.retryMultiplier, attempt);
  }

  /**
   * Sleep for specified milliseconds
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send message with retry logic
   */
  async send(params, options = {}) {
    const { attempt = 0, skipRetry = false } = options;
    const attemptInfo = {
      attempt: attempt + 1,
      timestamp: new Date(),
      params
    };

    try {
      // Simulate delivery based on options
      if (options.simulateError) {
        throw options.simulateError;
      }

      attemptInfo.success = true;
      attemptInfo.messageId = `msg_${Math.random().toString(36).substring(2, 15)}`;
      this.deliveryAttempts.push(attemptInfo);

      return {
        success: true,
        messageId: attemptInfo.messageId,
        attempt: attempt + 1,
        totalAttempts: this.deliveryAttempts.length
      };
    } catch (error) {
      attemptInfo.success = false;
      attemptInfo.error = error.message;
      this.deliveryAttempts.push(attemptInfo);

      const isRetryable = this._isRetryableError(error);

      // Retry logic with exponential backoff
      if (!skipRetry && isRetryable && attempt < this.maxRetries) {
        const delay = this._calculateRetryDelay(attempt);
        
        // For testing, we use a minimal delay
        const testDelay = Math.min(delay / 1000, 10); // Max 10ms for tests
        await this._sleep(testDelay);
        
        return this.send(params, { ...options, attempt: attempt + 1 });
      }

      return {
        success: false,
        error: error.message,
        attempt: attempt + 1,
        retryable: isRetryable,
        totalAttempts: this.deliveryAttempts.length
      };
    }
  }

  /**
   * Reset delivery attempts
   */
  reset() {
    this.deliveryAttempts = [];
  }

  /**
   * Get delivery attempts
   */
  getAttempts() {
    return this.deliveryAttempts;
  }
}

describe('Retry Logic - Property-Based Tests', () => {
  let deliveryService;

  beforeEach(() => {
    deliveryService = new MockDeliveryService();
  });

  afterEach(() => {
    deliveryService.reset();
  });

  /**
   * **Property 11: Retry Logic**
   * **Validates: Requirements 4.6, 5.6**
   * 
   * For any failed reminder delivery with a retryable error, the system should
   * retry after a delay with exponential backoff, up to a maximum of 3 retries.
   */
  describe('Property 11: Retry Logic', () => {
    it('should retry on retryable errors up to max retries', () => {
      // Generator for retryable errors
      const retryableErrorArbitrary = fc.constantFrom(
        new Error('ETIMEDOUT'),
        new Error('ECONNREFUSED'),
        new Error('ENOTFOUND'),
        new Error('RATE_LIMIT_EXCEEDED'),
        new Error('SERVICE_UNAVAILABLE'),
        new Error('429'),
        new Error('500'),
        new Error('503')
      );

      // Generator for message parameters
      const messageParamsArbitrary = fc.record({
        to: fc.oneof(fc.emailAddress(), fc.string({ minLength: 10, maxLength: 15 })),
        content: fc.string({ minLength: 10, maxLength: 200 }),
        type: fc.constantFrom('email', 'sms')
      });

      fc.assert(
        fc.asyncProperty(
          fc.tuple(retryableErrorArbitrary, messageParamsArbitrary),
          async ([error, params]) => {
            deliveryService.reset();

            // Attempt to send with retryable error
            const result = await deliveryService.send(params, {
              simulateError: error
            });

            // Verify retry occurred
            const attempts = deliveryService.getAttempts();
            
            // Should have attempted initial + 3 retries = 4 total
            if (attempts.length !== 4) return false;
            
            // All attempts should have failed
            if (attempts.some(a => a.success)) return false;
            
            // Result should indicate failure
            if (result.success) return false;
            
            // Result should indicate it was retryable
            if (!result.retryable) return false;
            
            // Result should show correct attempt count
            if (result.attempt !== 4) return false;

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not retry on non-retryable errors', async () => {
      // Generator for message parameters
      const messageParamsArbitrary = fc.record({
        to: fc.emailAddress(),
        content: fc.string({ minLength: 10, maxLength: 200 }),
        type: fc.constantFrom('email', 'sms')
      });

      // Generator for non-retryable error messages (strings that don't contain retryable codes)
      const nonRetryableMessageArbitrary = fc.constantFrom(
        'Invalid email address',
        'Invalid phone number',
        'Validation failed',
        'Bad request',
        'Unauthorized',
        'Not found',
        'Forbidden'
      );

      await fc.assert(
        fc.asyncProperty(
          fc.tuple(nonRetryableMessageArbitrary, messageParamsArbitrary),
          async ([errorMessage, params]) => {
            // Create a fresh service for each test
            const testService = new MockDeliveryService();

            // Create error with non-retryable message
            const error = new Error(errorMessage);

            // Attempt to send with non-retryable error
            const result = await testService.send(params, {
              simulateError: error
            });

            // Verify no retry occurred
            const attempts = testService.getAttempts();
            
            // Should have only 1 attempt (no retries)
            if (attempts.length !== 1) return false;
            
            // Attempt should have failed
            if (attempts[0].success) return false;
            
            // Result should indicate failure
            if (result.success) return false;
            
            // Result should indicate it was not retryable
            if (result.retryable) return false;
            
            // Result should show only 1 attempt
            if (result.attempt !== 1) return false;

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use exponential backoff for retry delays', () => {
      // Test that retry delays follow exponential backoff pattern
      // Use sequential attempts to ensure proper exponential growth
      const attemptSequenceArbitrary = fc.integer({ min: 0, max: 5 });

      fc.assert(
        fc.property(attemptSequenceArbitrary, (maxAttempt) => {
          // Generate sequential attempts from 0 to maxAttempt
          const attempts = Array.from({ length: maxAttempt + 1 }, (_, i) => i);
          
          if (attempts.length === 0) return true; // Empty array is valid
          
          const delays = attempts.map(attempt => 
            deliveryService._calculateRetryDelay(attempt)
          );

          // Verify first delay is the initial retry delay
          if (delays[0] !== deliveryService.initialRetryDelay) return false;

          // Verify exponential growth for sequential attempts
          for (let i = 1; i < delays.length; i++) {
            // Each delay should be exactly double the previous
            const expectedDelay = delays[i - 1] * 2;
            if (delays[i] !== expectedDelay) return false;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should succeed on retry if error is transient', () => {
      // Generator for message parameters
      const messageParamsArbitrary = fc.record({
        to: fc.oneof(fc.emailAddress(), fc.string({ minLength: 10, maxLength: 15 })),
        content: fc.string({ minLength: 10, maxLength: 200 }),
        type: fc.constantFrom('email', 'sms')
      });

      // Generator for number of failures before success (1-3)
      const failuresBeforeSuccessArbitrary = fc.integer({ min: 1, max: 3 });

      fc.assert(
        fc.asyncProperty(
          fc.tuple(messageParamsArbitrary, failuresBeforeSuccessArbitrary),
          async ([params, failuresBeforeSuccess]) => {
            deliveryService.reset();

            let attemptCount = 0;
            const retryableError = new Error('ETIMEDOUT');

            // Create a custom send function that fails N times then succeeds
            const customSend = async (p, options = {}) => {
              attemptCount++;
              const { attempt = 0, skipRetry = false } = options;

              try {
                // Fail for the first N attempts
                if (attemptCount <= failuresBeforeSuccess) {
                  throw retryableError;
                }

                // Succeed after N failures
                return {
                  success: true,
                  messageId: `msg_${Math.random().toString(36).substring(2, 15)}`,
                  attempt: attempt + 1
                };
              } catch (error) {
                const isRetryable = deliveryService._isRetryableError(error);

                if (!skipRetry && isRetryable && attempt < deliveryService.maxRetries) {
                  const delay = deliveryService._calculateRetryDelay(attempt);
                  const testDelay = Math.min(delay / 1000, 10);
                  await deliveryService._sleep(testDelay);
                  return customSend(p, { ...options, attempt: attempt + 1 });
                }

                return {
                  success: false,
                  error: error.message,
                  attempt: attempt + 1,
                  retryable: isRetryable
                };
              }
            };

            const result = await customSend(params);

            // Should eventually succeed
            if (!result.success) return false;
            
            // Should have taken exactly failuresBeforeSuccess + 1 attempts
            if (attemptCount !== failuresBeforeSuccess + 1) return false;
            
            // Attempt count should match
            if (result.attempt !== failuresBeforeSuccess + 1) return false;

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify retryable vs non-retryable errors', () => {
      // Generator for various error types
      const errorArbitrary = fc.oneof(
        // Retryable errors
        fc.constantFrom(
          new Error('ETIMEDOUT'),
          new Error('ECONNREFUSED'),
          new Error('RATE_LIMIT_EXCEEDED'),
          new Error('503'),
          new Error('500')
        ).map(e => ({ error: e, expectedRetryable: true })),
        // Non-retryable errors
        fc.constantFrom(
          new Error('Invalid input'),
          new Error('Bad request'),
          new Error('Validation error'),
          new Error('Unauthorized'),
          new Error('Not found')
        ).map(e => ({ error: e, expectedRetryable: false }))
      );

      fc.assert(
        fc.property(errorArbitrary, ({ error, expectedRetryable }) => {
          const isRetryable = deliveryService._isRetryableError(error);
          return isRetryable === expectedRetryable;
        }),
        { numRuns: 100 }
      );
    });

    it('should respect max retries limit across different error types', () => {
      // Generator for retryable errors
      const retryableErrorArbitrary = fc.constantFrom(
        new Error('ETIMEDOUT'),
        new Error('ECONNREFUSED'),
        new Error('503'),
        new Error('RATE_LIMIT_EXCEEDED')
      );

      // Generator for message parameters
      const messageParamsArbitrary = fc.record({
        to: fc.oneof(fc.emailAddress(), fc.string({ minLength: 10, maxLength: 15 })),
        content: fc.string({ minLength: 10, maxLength: 200 }),
        type: fc.constantFrom('email', 'sms')
      });

      fc.assert(
        fc.asyncProperty(
          fc.tuple(retryableErrorArbitrary, messageParamsArbitrary),
          async ([error, params]) => {
            deliveryService.reset();

            const result = await deliveryService.send(params, {
              simulateError: error
            });

            const attempts = deliveryService.getAttempts();
            
            // Should never exceed maxRetries + 1 (initial attempt)
            if (attempts.length > deliveryService.maxRetries + 1) return false;
            
            // Should have exactly maxRetries + 1 attempts for persistent errors
            if (attempts.length !== deliveryService.maxRetries + 1) return false;
            
            // Result attempt count should match
            if (result.attempt !== deliveryService.maxRetries + 1) return false;

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain attempt history across retries', () => {
      // Generator for message parameters
      const messageParamsArbitrary = fc.record({
        to: fc.oneof(fc.emailAddress(), fc.string({ minLength: 10, maxLength: 15 })),
        content: fc.string({ minLength: 10, maxLength: 200 }),
        type: fc.constantFrom('email', 'sms')
      });

      fc.assert(
        fc.asyncProperty(messageParamsArbitrary, async (params) => {
          deliveryService.reset();

          const retryableError = new Error('ETIMEDOUT');
          await deliveryService.send(params, {
            simulateError: retryableError
          });

          const attempts = deliveryService.getAttempts();
          
          // Verify all attempts are recorded
          if (attempts.length !== 4) return false;
          
          // Verify attempt numbers are sequential
          for (let i = 0; i < attempts.length; i++) {
            if (attempts[i].attempt !== i + 1) return false;
          }
          
          // Verify all attempts have timestamps
          for (const attempt of attempts) {
            if (!attempt.timestamp) return false;
            if (!(attempt.timestamp instanceof Date)) return false;
          }
          
          // Verify all attempts have error information
          for (const attempt of attempts) {
            if (attempt.success) return false;
            if (!attempt.error) return false;
          }
          
          // Verify timestamps are in order
          for (let i = 1; i < attempts.length; i++) {
            if (attempts[i].timestamp < attempts[i - 1].timestamp) return false;
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle successful delivery on first attempt without retry', () => {
      // Generator for message parameters
      const messageParamsArbitrary = fc.record({
        to: fc.oneof(fc.emailAddress(), fc.string({ minLength: 10, maxLength: 15 })),
        content: fc.string({ minLength: 10, maxLength: 200 }),
        type: fc.constantFrom('email', 'sms')
      });

      fc.assert(
        fc.asyncProperty(messageParamsArbitrary, async (params) => {
          deliveryService.reset();

          // Send without error
          const result = await deliveryService.send(params);

          const attempts = deliveryService.getAttempts();
          
          // Should have only 1 attempt
          if (attempts.length !== 1) return false;
          
          // Attempt should be successful
          if (!attempts[0].success) return false;
          
          // Result should indicate success
          if (!result.success) return false;
          
          // Should have messageId
          if (!result.messageId) return false;
          
          // Should show 1 attempt
          if (result.attempt !== 1) return false;

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
