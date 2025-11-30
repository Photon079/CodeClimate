/**
 * Storage Module - localStorage wrapper with error handling
 * Handles all data persistence for Invoice Guard
 */

const STORAGE_KEYS = {
  INVOICES: 'invoiceGuard_invoices',
  PAYMENT_SETTINGS: 'invoiceGuard_paymentSettings',
  LATE_FEE_CONFIG: 'invoiceGuard_lateFeeConfig'
};

/**
 * Load all invoices from localStorage
 * @returns {Array} Array of invoice objects, empty array if none exist or on error
 */
function loadInvoices() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    
    if (!data) {
      return [];
    }
    
    const invoices = JSON.parse(data);
    
    // Validate that we got an array
    if (!Array.isArray(invoices)) {
      console.error('Corrupted invoice data: expected array');
      return [];
    }
    
    return invoices;
  } catch (error) {
    // Handle corrupted data or JSON parse errors
    console.error('Error loading invoices:', error);
    return [];
  }
}

/**
 * Save invoices array to localStorage
 * @param {Array} invoices - Array of invoice objects
 * @returns {Object} Result object with success flag and error details
 */
function saveInvoices(invoices) {
  try {
    const data = JSON.stringify(invoices);
    localStorage.setItem(STORAGE_KEYS.INVOICES, data);
    return { success: true, error: null };
  } catch (error) {
    // Handle QuotaExceededError or other storage errors
    if (error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Please delete old invoices.');
      return { 
        success: false, 
        error: 'QUOTA_EXCEEDED',
        message: 'Storage limit reached. Please delete some old invoices to continue.'
      };
    } else {
      console.error('Error saving invoices:', error);
      return { 
        success: false, 
        error: 'STORAGE_ERROR',
        message: 'Failed to save data. Please try again.'
      };
    }
  }
}

/**
 * Get user payment settings
 * @returns {Object} Payment settings object with defaults
 */
function getPaymentSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENT_SETTINGS);
    
    if (!data) {
      // Return default empty settings
      return {
        upiId: '',
        bankDetails: '',
        paypalEmail: '',
        userName: ''
      };
    }
    
    const parsed = JSON.parse(data);
    
    // Validate that parsed data is an object with expected structure
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.error('Invalid payment settings data structure');
      return {
        upiId: '',
        bankDetails: '',
        paypalEmail: '',
        userName: ''
      };
    }
    
    return parsed;
  } catch (error) {
    console.error('Error loading payment settings:', error);
    return {
      upiId: '',
      bankDetails: '',
      paypalEmail: '',
      userName: ''
    };
  }
}

/**
 * Save user payment settings
 * @param {Object} settings - Payment settings object
 * @returns {Object} Result object with success flag and error details
 */
function savePaymentSettings(settings) {
  try {
    const data = JSON.stringify(settings);
    localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, data);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error saving payment settings:', error);
    if (error.name === 'QuotaExceededError') {
      return { 
        success: false, 
        error: 'QUOTA_EXCEEDED',
        message: 'Storage limit reached. Please clear some data.'
      };
    }
    return { 
      success: false, 
      error: 'STORAGE_ERROR',
      message: 'Failed to save settings. Please try again.'
    };
  }
}

/**
 * Get late fee configuration
 * @returns {Object} Late fee config with defaults
 */
function getLateFeeConfig() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LATE_FEE_CONFIG);
    
    if (!data) {
      // Return default configuration
      return {
        enabled: true,
        percentagePerWeek: 1.0
      };
    }
    
    const parsed = JSON.parse(data);
    
    // Validate that parsed data is an object with expected structure
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.error('Invalid late fee config data structure');
      return {
        enabled: true,
        percentagePerWeek: 1.0
      };
    }
    
    return parsed;
  } catch (error) {
    console.error('Error loading late fee config:', error);
    return {
      enabled: true,
      percentagePerWeek: 1.0
    };
  }
}

/**
 * Save late fee configuration
 * @param {Object} config - Late fee configuration object
 * @returns {Object} Result object with success flag and error details
 */
function saveLateFeeConfig(config) {
  try {
    const data = JSON.stringify(config);
    localStorage.setItem(STORAGE_KEYS.LATE_FEE_CONFIG, data);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error saving late fee config:', error);
    if (error.name === 'QuotaExceededError') {
      return { 
        success: false, 
        error: 'QUOTA_EXCEEDED',
        message: 'Storage limit reached. Please clear some data.'
      };
    }
    return { 
      success: false, 
      error: 'STORAGE_ERROR',
      message: 'Failed to save configuration. Please try again.'
    };
  }
}

/**
 * Clear all data from localStorage (for testing/reset)
 */
function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    localStorage.removeItem(STORAGE_KEYS.PAYMENT_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.LATE_FEE_CONFIG);
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

// Export functions for use in other modules (ES6 modules)
export {
  loadInvoices,
  saveInvoices,
  getPaymentSettings,
  savePaymentSettings,
  getLateFeeConfig,
  saveLateFeeConfig,
  clearAllData,
  STORAGE_KEYS
};
