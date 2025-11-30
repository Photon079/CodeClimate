/**
 * Invoice Module - Core business logic for Invoice Guard
 * Handles invoice operations, calculations, and status management
 */

// Import performance utilities for memoization
import { memoizeLRU } from './performance.js';

/**
 * Generate a UUID v4 identifier
 * @returns {string} UUID v4 string
 */
function generateUUID() {
  // Use crypto API if available, otherwise fallback to timestamp-based ID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate invoice number in format INV-YYYYMM-XXX
 * @param {Array} existingInvoices - Array of existing invoices
 * @returns {string} Generated invoice number
 */
function generateInvoiceNumber(existingInvoices) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}-`;
  
  // Find all invoices with the same year-month prefix
  const sameMonthInvoices = existingInvoices.filter(inv => 
    inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)
  );
  
  // Extract sequence numbers and find the highest
  let maxSequence = 0;
  sameMonthInvoices.forEach(inv => {
    const parts = inv.invoiceNumber.split('-');
    if (parts.length === 3) {
      const sequence = parseInt(parts[2], 10);
      if (!isNaN(sequence) && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }
  });
  
  // Increment and format with leading zeros
  const nextSequence = String(maxSequence + 1).padStart(3, '0');
  return `${prefix}${nextSequence}`;
}

/**
 * Create a new invoice with auto-generated fields and defaults
 * @param {Object} data - Invoice input data
 * @param {Array} existingInvoices - Array of existing invoices for number generation
 * @returns {Object} Complete invoice object
 */
function createInvoice(data, existingInvoices = []) {
  const now = new Date();
  
  // Calculate default due date (14 days from now) if not provided
  let dueDate;
  if (data.dueDate) {
    dueDate = new Date(data.dueDate).toISOString();
  } else {
    const defaultDueDate = new Date(now);
    defaultDueDate.setDate(defaultDueDate.getDate() + 14);
    dueDate = defaultDueDate.toISOString();
  }
  
  return {
    id: generateUUID(),
    clientName: data.clientName,
    email: data.email || '',
    phone: data.phone || '',
    invoiceNumber: generateInvoiceNumber(existingInvoices),
    amount: data.amount,
    dueDate: dueDate,
    paymentMethod: data.paymentMethod,
    status: 'pending',
    notes: data.notes || '',
    createdDate: now.toISOString(),
    reminderSent: false,
    lateFee: 0
  };
}

/**
 * Update an existing invoice with field immutability checks
 * @param {Object} invoice - Original invoice object
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated invoice object
 */
function updateInvoice(invoice, updates) {
  // Create a copy of the invoice
  const updated = { ...invoice };
  
  // Apply updates, but preserve immutable fields
  Object.keys(updates).forEach(key => {
    // Preserve id and createdDate (immutable)
    if (key !== 'id' && key !== 'createdDate') {
      updated[key] = updates[key];
    }
  });
  
  return updated;
}

/**
 * Delete an invoice from the array
 * @param {Array} invoices - Array of invoices
 * @param {string} id - ID of invoice to delete
 * @returns {Array} New array with invoice removed
 */
function deleteInvoice(invoices, id) {
  return invoices.filter(invoice => invoice.id !== id);
}

/**
 * Calculate status badge for an invoice (internal, non-memoized)
 * @param {Object} invoice - Invoice object
 * @returns {Object} Status badge object with label, color, and icon
 */
function _calculateStatusInternal(invoice) {
  // If paid, return paid status
  if (invoice.status === 'paid') {
    return {
      label: 'Paid',
      color: '#10B981',
      icon: '✓'
    };
  }
  
  // If cancelled, return cancelled status
  if (invoice.status === 'cancelled') {
    return {
      label: 'Cancelled',
      color: '#6B7280',
      icon: '✕'
    };
  }
  
  // For pending invoices, calculate based on due date
  const dueDate = new Date(invoice.dueDate);
  const today = new Date();
  
  // Set to midnight for accurate comparison
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate - today;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 1) {
    // More than 1 day in the future - Not Due
    return {
      label: 'Not Due',
      color: '#10B981',
      icon: '○'
    };
  } else if (diffDays >= 0) {
    // Due today or tomorrow - Due Soon
    return {
      label: 'Due Soon',
      color: '#F59E0B',
      icon: '!'
    };
  } else {
    // More than 1 day in the past - Overdue
    return {
      label: 'Overdue',
      color: '#EF4444',
      icon: '⚠'
    };
  }
}

/**
 * Calculate status badge for an invoice (memoized for performance)
 * @param {Object} invoice - Invoice object
 * @returns {Object} Status badge object with label, color, and icon
 */
const calculateStatus = memoizeLRU(
  _calculateStatusInternal,
  100,
  (invoice) => `${invoice.status}-${invoice.dueDate}-${new Date().toDateString()}`
);

/**
 * Calculate late fee for an overdue invoice (internal, non-memoized)
 * @param {Object} invoice - Invoice object
 * @param {Object} config - Late fee configuration
 * @returns {number} Calculated late fee amount
 */
function _calculateLateFeeInternal(invoice, config) {
  // If late fees are disabled, return 0
  if (!config.enabled) {
    return 0;
  }
  
  // Only calculate for pending invoices
  if (invoice.status !== 'pending') {
    return 0;
  }
  
  const dueDate = new Date(invoice.dueDate);
  const today = new Date();
  
  // Set to midnight for accurate comparison
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = today - dueDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Only calculate if overdue
  if (diffDays <= 0) {
    return 0;
  }
  
  // Calculate complete weeks overdue
  const weeksOverdue = Math.floor(diffDays / 7);
  
  // Calculate late fee: amount * percentage * weeks
  const lateFee = invoice.amount * (config.percentagePerWeek / 100) * weeksOverdue;
  
  return lateFee;
}

/**
 * Calculate late fee for an overdue invoice (memoized for performance)
 * @param {Object} invoice - Invoice object
 * @param {Object} config - Late fee configuration
 * @returns {number} Calculated late fee amount
 */
const calculateLateFee = memoizeLRU(
  _calculateLateFeeInternal,
  100,
  (invoice, config) => `${invoice.id}-${invoice.amount}-${invoice.dueDate}-${invoice.status}-${config.enabled}-${config.percentagePerWeek}-${new Date().toDateString()}`
);

/**
 * Get all invoices with calculated status and enriched data
 * @param {Array} invoices - Array of invoice objects
 * @param {Object} config - Late fee configuration
 * @returns {Array} Array of invoices with status badges and calculated fields
 */
function getInvoicesWithStatus(invoices, config = { enabled: true, percentagePerWeek: 1.0 }) {
  return invoices.map(invoice => {
    const statusBadge = calculateStatus(invoice);
    const lateFee = calculateLateFee(invoice, config);
    
    // Calculate days overdue
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = today - dueDate;
    const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    return {
      ...invoice,
      statusBadge,
      lateFee,
      daysOverdue
    };
  });
}

/**
 * Calculate summary statistics for dashboard
 * @param {Array} invoices - Array of invoice objects
 * @returns {Object} Summary statistics
 */
function calculateSummary(invoices) {
  let totalOutstanding = 0;
  let overdueAmount = 0;
  let dueThisWeek = 0;
  let paidInvoices = 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const oneWeekFromNow = new Date(today);
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
  
  invoices.forEach(invoice => {
    // Count paid invoices
    if (invoice.status === 'paid') {
      paidInvoices++;
      return; // Skip paid invoices for other calculations
    }
    
    // Skip cancelled invoices
    if (invoice.status === 'cancelled') {
      return;
    }
    
    // Add to total outstanding (pending invoices only)
    if (invoice.status === 'pending') {
      totalOutstanding += invoice.amount;
      
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      // Check if overdue
      if (dueDate < today) {
        overdueAmount += invoice.amount;
      }
      
      // Check if due this week (today to 7 days from now)
      if (dueDate >= today && dueDate <= oneWeekFromNow) {
        dueThisWeek++;
      }
    }
  });
  
  return {
    totalOutstanding,
    overdueAmount,
    dueThisWeek,
    totalInvoices: invoices.length,
    paidInvoices
  };
}

// Export functions for use in other modules (ES6 modules)
export {
  generateUUID,
  generateInvoiceNumber,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  calculateStatus,
  calculateLateFee,
  getInvoicesWithStatus,
  calculateSummary,
  _calculateStatusInternal,
  _calculateLateFeeInternal
};
