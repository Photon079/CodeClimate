/**
 * Input Sanitization Middleware
 * Protects against XSS, SQL injection, and other injection attacks
 */

import validator from 'validator';

/**
 * Sanitize string input to prevent XSS attacks
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Escape HTML entities
  let sanitized = validator.escape(str);
  
  // Remove any script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  return sanitized;
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  return obj;
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeBody = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

/**
 * Middleware to sanitize query parameters
 */
export const sanitizeQuery = (req, res, next) => {
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
};

/**
 * Middleware to sanitize all inputs
 */
export const sanitizeAll = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

/**
 * Validate and sanitize email
 */
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  
  const normalized = validator.normalizeEmail(email);
  if (!normalized || !validator.isEmail(normalized)) {
    return null;
  }
  
  return normalized;
};

/**
 * Validate and sanitize phone number
 */
export const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Indian phone numbers
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = '+' + cleaned;
  } else if (cleaned.length === 10) {
    cleaned = '+91' + cleaned;
  } else if (cleaned.startsWith('+91')) {
    // Already formatted
  } else {
    return null; // Invalid format
  }
  
  // Validate it's a valid phone number
  if (!validator.isMobilePhone(cleaned, 'en-IN')) {
    return null;
  }
  
  return cleaned;
};

/**
 * Validate and sanitize URL
 */
export const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  if (!validator.isURL(url, { protocols: ['http', 'https'], require_protocol: true })) {
    return null;
  }
  
  return url;
};

/**
 * Sanitize invoice data
 */
export const sanitizeInvoiceData = (data) => {
  const sanitized = { ...data };
  
  // Sanitize string fields
  if (sanitized.clientName) {
    sanitized.clientName = sanitizeString(sanitized.clientName);
  }
  if (sanitized.description) {
    sanitized.description = sanitizeString(sanitized.description);
  }
  if (sanitized.notes) {
    sanitized.notes = sanitizeString(sanitized.notes);
  }
  
  // Sanitize email
  if (sanitized.email) {
    sanitized.email = sanitizeEmail(sanitized.email);
  }
  
  // Sanitize phone
  if (sanitized.phone) {
    sanitized.phone = sanitizePhone(sanitized.phone);
  }
  
  // Validate numeric fields
  if (sanitized.amount !== undefined) {
    sanitized.amount = parseFloat(sanitized.amount);
    if (isNaN(sanitized.amount) || sanitized.amount < 0) {
      sanitized.amount = 0;
    }
  }
  
  return sanitized;
};

/**
 * Prevent NoSQL injection
 */
export const preventNoSQLInjection = (req, res, next) => {
  const checkForInjection = (obj) => {
    if (obj === null || obj === undefined) return false;
    
    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        // Check for MongoDB operators
        if (key.startsWith('$')) {
          return true;
        }
        if (checkForInjection(value)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  if (checkForInjection(req.body) || checkForInjection(req.query) || checkForInjection(req.params)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Potentially malicious input detected'
    });
  }
  
  next();
};

export default {
  sanitizeBody,
  sanitizeQuery,
  sanitizeAll,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeInvoiceData,
  preventNoSQLInjection
};
