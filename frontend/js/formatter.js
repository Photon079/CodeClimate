/**
 * Formatter Module - Display formatting utilities for Invoice Guard
 * Handles currency, date, and relative date formatting
 */

/**
 * Format amount as Indian currency with ₹ symbol and proper thousand separators
 * Uses Indian numbering system (lakhs and crores)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string (e.g., "₹1,23,456.00")
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0.00';
  }
  
  // Format to 2 decimal places
  const fixedAmount = amount.toFixed(2);
  const [integerPart, decimalPart] = fixedAmount.split('.');
  
  // Apply Indian numbering system
  // First 3 digits from right, then groups of 2
  let formatted = '';
  let count = 0;
  
  for (let i = integerPart.length - 1; i >= 0; i--) {
    if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
      formatted = ',' + formatted;
    }
    formatted = integerPart[i] + formatted;
    count++;
  }
  
  return `₹${formatted}.${decimalPart}`;
}

/**
 * Format date for display in DD/MM/YYYY format
 * @param {string} dateString - ISO 8601 date string
 * @returns {string} Formatted date string (e.g., "25/12/2024")
 */
function formatDate(dateString) {
  if (!dateString) {
    return '';
  }
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format date for input fields in YYYY-MM-DD format
 * @param {string} dateString - ISO 8601 date string or Date object
 * @returns {string} Formatted date string for input (e.g., "2024-12-25")
 */
function formatDateForInput(dateString) {
  if (!dateString) {
    return '';
  }
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
}

/**
 * Calculate and format days overdue for unpaid invoices
 * @param {string} dueDateString - ISO 8601 date string of due date
 * @returns {string} Formatted days overdue (e.g., "5 days overdue", "Not overdue")
 */
function formatDaysOverdue(dueDateString) {
  if (!dueDateString) {
    return 'Not overdue';
  }
  
  try {
    const dueDate = new Date(dueDateString);
    const today = new Date();
    
    if (isNaN(dueDate.getTime())) {
      return 'Invalid date';
    }
    
    // Set time to midnight for accurate day comparison
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = today - dueDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return 'Not overdue';
    } else if (diffDays === 1) {
      return '1 day overdue';
    } else {
      return `${diffDays} days overdue`;
    }
  } catch (error) {
    console.error('Error calculating days overdue:', error);
    return 'Error';
  }
}

/**
 * Format relative date for display (Today, Tomorrow, X days, etc.)
 * @param {string} dateString - ISO 8601 date string
 * @returns {string} Relative date string (e.g., "Today", "Tomorrow", "In 5 days", "3 days ago")
 */
function formatRelativeDate(dateString) {
  if (!dateString) {
    return '';
  }
  
  try {
    const targetDate = new Date(dateString);
    const today = new Date();
    
    if (isNaN(targetDate.getTime())) {
      return '';
    }
    
    // Set time to midnight for accurate day comparison
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate - today;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays === -1) {
      return 'Yesterday';
    } else if (diffDays > 1) {
      return `In ${diffDays} days`;
    } else {
      return `${Math.abs(diffDays)} days ago`;
    }
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return '';
  }
}

/**
 * Format date and time for display in DD/MM/YYYY HH:MM format
 * @param {string} dateString - ISO 8601 date string
 * @returns {string} Formatted date and time string (e.g., "25/12/2024 14:30")
 */
function formatDateTime(dateString) {
  if (!dateString) {
    return '';
  }
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date time:', error);
    return '';
  }
}

// Export functions for use in other modules (ES6 modules)
export {
  formatCurrency,
  formatDate,
  formatDateForInput,
  formatDaysOverdue,
  formatRelativeDate,
  formatDateTime
};
