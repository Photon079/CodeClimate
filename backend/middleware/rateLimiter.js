/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and DDoS attacks
 */

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * Limits requests per IP address
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again later'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * Strict rate limiter for sensitive operations
 * Used for authentication, password reset, etc.
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many attempts',
    message: 'Please try again later'
  },
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many attempts',
      message: 'You have exceeded the maximum number of attempts. Please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * Reminder sending rate limiter
 * Prevents abuse of reminder sending functionality
 */
export const reminderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 reminder sends per hour
  message: {
    error: 'Too many reminders sent',
    message: 'You have exceeded the hourly reminder limit'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many reminders',
      message: 'You have exceeded the hourly reminder limit. Please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

/**
 * Test endpoint rate limiter
 * Limits test message generation and sending
 */
export const testLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 test requests per hour
  message: {
    error: 'Too many test requests',
    message: 'You have exceeded the hourly test limit'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many test requests',
      message: 'You have exceeded the hourly test limit. Please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

export default {
  apiLimiter,
  strictLimiter,
  reminderLimiter,
  testLimiter
};
