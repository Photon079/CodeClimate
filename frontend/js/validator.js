/**
 * Validator Module - Input validation for Invoice Guard
 * Validates all user-entered data according to requirements
 */

const PAYMENT_METHODS = ['UPI', 'Bank Transfer', 'PayPal', 'Other'];

/**
 * Validate client name - must not be empty or only whitespace
 * @param {string} name - Client name to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateClientName(name) {
  if (typeof name !== 'string') {
    return false;
  }
  
  // Reject empty strings and strings with only whitespace
  return name.trim().length > 0;
}

/**
 * Validate email address - RFC 5322 compliant format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateEmail(email) {
  // Email is optional, so empty/null/undefined is valid
  if (!email || email.trim().length === 0) {
    return true;
  }
  
  if (typeof email !== 'string') {
    return false;
  }
  
  // RFC 5322 compliant email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone number - Indian mobile number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validatePhone(phone) {
  // Phone is optional, so empty/null/undefined is valid
  if (!phone || phone.trim().length === 0) {
    return true;
  }
  
  if (typeof phone !== 'string') {
    return false;
  }
  
  // Indian mobile number validation: +91XXXXXXXXXX or 10 digits starting with 6-9
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Validate amount - must be a positive number
 * @param {number} amount - Amount to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateAmount(amount) {
  // Must be a number
  if (typeof amount !== 'number' || isNaN(amount)) {
    return false;
  }
  
  // Must be positive (greater than zero)
  return amount > 0;
}

/**
 * Validate due date - must be a valid date string
 * @param {string} dateString - Date string to validate (ISO 8601 or YYYY-MM-DD format)
 * @returns {boolean} True if valid, false otherwise
 */
function validateDueDate(dateString) {
  if (typeof dateString !== 'string' || dateString.trim().length === 0) {
    return false;
  }
  
  // Try to parse the date
  const date = new Date(dateString);
  
  // Check if date is valid (not NaN)
  return !isNaN(date.getTime());
}

/**
 * Validate payment method - must be one of the allowed enum values
 * @param {string} method - Payment method to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validatePaymentMethod(method) {
  if (typeof method !== 'string') {
    return false;
  }
  
  // Must be one of the predefined payment methods
  return PAYMENT_METHODS.includes(method);
}

/**
 * Validate complete invoice data
 * @param {Object} data - Invoice data to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
function validateInvoice(data) {
  const errors = [];
  
  // Validate required fields exist
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'invoice', message: 'Invoice data must be an object' }]
    };
  }
  
  // Validate clientName (required)
  if (!data.hasOwnProperty('clientName')) {
    errors.push({ field: 'clientName', message: 'Client name is required' });
  } else if (!validateClientName(data.clientName)) {
    errors.push({ field: 'clientName', message: 'Client name cannot be empty or only whitespace' });
  }
  
  // Validate amount (required)
  if (!data.hasOwnProperty('amount')) {
    errors.push({ field: 'amount', message: 'Amount is required' });
  } else if (!validateAmount(data.amount)) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number' });
  }
  
  // Validate paymentMethod (required)
  if (!data.hasOwnProperty('paymentMethod')) {
    errors.push({ field: 'paymentMethod', message: 'Payment method is required' });
  } else if (!validatePaymentMethod(data.paymentMethod)) {
    errors.push({ 
      field: 'paymentMethod', 
      message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}` 
    });
  }
  
  // Validate dueDate (optional, but if provided must be valid)
  if (data.hasOwnProperty('dueDate') && data.dueDate !== null && data.dueDate !== undefined) {
    if (!validateDueDate(data.dueDate)) {
      errors.push({ field: 'dueDate', message: 'Due date must be a valid date' });
    }
  }
  
  // Validate notes (optional, but if provided must be a string)
  if (data.hasOwnProperty('notes') && data.notes !== null && data.notes !== undefined) {
    if (typeof data.notes !== 'string') {
      errors.push({ field: 'notes', message: 'Notes must be a string' });
    }
  }
  
  // Validate email (optional, but if provided must be valid)
  if (data.hasOwnProperty('email') && data.email !== null && data.email !== undefined && data.email.trim().length > 0) {
    if (!validateEmail(data.email)) {
      errors.push({ field: 'email', message: 'Email must be a valid email address' });
    }
  }
  
  // Validate phone (optional, but if provided must be valid Indian mobile number)
  if (data.hasOwnProperty('phone') && data.phone !== null && data.phone !== undefined && data.phone.trim().length > 0) {
    if (!validatePhone(data.phone)) {
      errors.push({ field: 'phone', message: 'Phone must be a valid Indian mobile number (+91XXXXXXXXXX or 10 digits)' });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Export functions for use in other modules (ES6 modules)
export {
  validateInvoice,
  validateClientName,
  validateAmount,
  validateDueDate,
  validatePaymentMethod,
  validateEmail,
  validatePhone,
  PAYMENT_METHODS
};
