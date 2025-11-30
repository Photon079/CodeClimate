/**
 * Application Controller - Main application logic for Invoice Guard
 * Handles event binding, state management, and orchestrates all modules
 */

// Import required modules
import { loadInvoices, saveInvoices, getLateFeeConfig, getPaymentSettings, saveLateFeeConfig, savePaymentSettings } from './storage.js';
import { createInvoice, updateInvoice, deleteInvoice, getInvoicesWithStatus, calculateSummary } from './invoice.js';
import { validateInvoice } from './validator.js';
import { generateReminder } from './reminder.js';
import { 
  renderDashboard, 
  showInvoiceModal, 
  hideInvoiceModal, 
  showReminderModal, 
  hideReminderModal,
  showSettingsModal,
  hideSettingsModal,
  showConfirmDialog,
  showToast,
  copyToClipboard,
  showLoading,
  hideLoading,
  showSkeletonScreen,
  hideSkeletonScreen,
  setButtonLoading
} from './ui.js';
import { debounce } from './performance.js';
import { applyFilters } from './search.js';
import { initTheme, toggleTheme } from './theme.js';
import { showExportMenu } from './export.js';
import { generateDemoData, hasDemoData } from './demo.js';
import { 
  loadReminderConfig, 
  saveReminderConfig, 
  populateReminderSettingsForm, 
  extractReminderSettingsFromForm,
  validateReminderSettings,
  setupReminderSettingsListeners
} from './reminder-settings.js';
import {
  loadServiceConfigs,
  saveServiceConfig,
  testServiceConnection,
  populateAIServiceForm,
  populateEmailServiceForm,
  populateSMSServiceForm,
  extractAIServiceConfig,
  extractEmailServiceConfig,
  extractSMSServiceConfig,
  validateAIServiceConfig,
  validateEmailServiceConfig,
  validateSMSServiceConfig,
  setupServiceConfigListeners
} from './service-config.js';
import {
  setupReminderHistoryListeners
} from './reminder-history.js';
import {
  setupCostDashboardListeners
} from './cost-dashboard.js';
import {
  showTestPreviewModal,
  setupTestPreviewListeners
} from './test-preview.js';

// Global state
let currentFilters = {
  search: '',
  status: 'all',
  sortBy: null,
  sortDirection: 'asc'
};

// Global state
let invoices = [];

// Cache for enriched invoices to avoid recalculation
let enrichedInvoicesCache = null;
let lastInvoicesHash = null;

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise} Result of the function
 */
async function retryWithBackoff(fn, maxRetries = 3, delay = 500) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt + 1} failed:`, error);
      
      // Don't retry on the last attempt
      if (attempt < maxRetries - 1) {
        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
}

/**
 * Initialize the application
 */
function initApp() {
  // Show skeleton screen for initial load
  showSkeletonScreen();
  
  // Simulate async loading (even though localStorage is sync, this provides better UX)
  setTimeout(() => {
    try {
      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        throw new Error('localStorage is not available');
      }
      
      // Test localStorage access
      try {
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
      } catch (e) {
        throw new Error('localStorage is disabled or unavailable');
      }
      
      // Load invoices from storage
      invoices = loadInvoices();
      
      // Hide skeleton and render initial dashboard
      hideSkeletonScreen();
      refreshDashboard();
      
      // Set up event listeners
      setupEventListeners();
      
    } catch (error) {
      console.error('Error initializing app:', error);
      
      // Hide skeleton screen
      hideSkeletonScreen();
      
      // Show error message to user
      if (error.message.includes('localStorage')) {
        showToast('Warning: Local storage is unavailable. Your data will not be saved.', 'error');
        
        // Initialize with empty array
        invoices = [];
        refreshDashboard();
        setupEventListeners();
      } else {
        showToast('Error loading application. Please refresh the page.', 'error');
      }
    }
  }, 300); // Small delay to show skeleton screen
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Add Invoice button
  const addInvoiceBtn = document.getElementById('addInvoiceBtn');
  if (addInvoiceBtn) {
    addInvoiceBtn.addEventListener('click', () => {
      showInvoiceModal();
    });
  }
  
  // Empty state add button
  const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
  if (emptyStateAddBtn) {
    emptyStateAddBtn.addEventListener('click', () => {
      showInvoiceModal();
    });
  }
  
  // Invoice form submission
  const invoiceForm = document.getElementById('invoiceForm');
  if (invoiceForm) {
    invoiceForm.addEventListener('submit', handleInvoiceFormSubmit);
  }
  
  // Real-time validation for amount field
  const amountInput = document.getElementById('amount');
  if (amountInput) {
    amountInput.addEventListener('input', handleAmountValidation);
    amountInput.addEventListener('blur', handleAmountValidation);
  }
  
  // Real-time validation for email field
  const emailInput = document.getElementById('clientEmail');
  if (emailInput) {
    emailInput.addEventListener('blur', handleEmailValidation);
  }
  
  // Real-time validation for phone field
  const phoneInput = document.getElementById('clientPhone');
  if (phoneInput) {
    phoneInput.addEventListener('blur', handlePhoneValidation);
  }
  
  // Contact autocomplete for client name
  const clientNameInput = document.getElementById('clientName');
  if (clientNameInput) {
    clientNameInput.addEventListener('input', handleClientNameInput);
    clientNameInput.addEventListener('change', handleClientNameSelect);
  }
  
  // Modal close buttons
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  if (cancelModalBtn) {
    cancelModalBtn.addEventListener('click', () => {
      hideInvoiceModal();
    });
  }
  
  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      hideInvoiceModal();
    });
  }
  
  const closeReminderBtn = document.getElementById('closeReminderBtn');
  if (closeReminderBtn) {
    closeReminderBtn.addEventListener('click', () => {
      hideReminderModal();
    });
  }
  
  // Copy reminder button
  const copyReminderBtn = document.getElementById('copyReminderBtn');
  if (copyReminderBtn) {
    copyReminderBtn.addEventListener('click', handleCopyReminder);
  }
  
  // Service Configuration button
  const serviceConfigBtn = document.getElementById('serviceConfigBtn');
  if (serviceConfigBtn) {
    serviceConfigBtn.addEventListener('click', handleOpenServiceConfig);
  }
  
  // Settings button
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', handleOpenSettings);
  }
  
  // Settings form submission
  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) {
    settingsForm.addEventListener('submit', handleSettingsFormSubmit);
  }
  
  // Settings modal close buttons
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  if (cancelSettingsBtn) {
    cancelSettingsBtn.addEventListener('click', () => {
      hideSettingsModal();
    });
  }
  
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      hideSettingsModal();
    });
  }
  
  // Event delegation for invoice table actions
  const tableBody = document.getElementById('invoicesTableBody');
  if (tableBody) {
    tableBody.addEventListener('click', handleTableAction);
  }
  
  // Close modals on backdrop click
  const invoiceModal = document.getElementById('invoiceModal');
  if (invoiceModal) {
    invoiceModal.addEventListener('click', (e) => {
      if (e.target === invoiceModal) {
        hideInvoiceModal();
      }
    });
  }
  
  const reminderModal = document.getElementById('reminderModal');
  if (reminderModal) {
    reminderModal.addEventListener('click', (e) => {
      if (e.target === reminderModal) {
        hideReminderModal();
      }
    });
  }
  
  const settingsModal = document.getElementById('settingsModal');
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        hideSettingsModal();
      }
    });
  }
  
  // Service configuration modal close buttons
  const closeServiceConfigBtn = document.getElementById('closeServiceConfigBtn');
  if (closeServiceConfigBtn) {
    closeServiceConfigBtn.addEventListener('click', hideServiceConfigModal);
  }
  
  const cancelServiceConfigBtn = document.getElementById('cancelServiceConfigBtn');
  if (cancelServiceConfigBtn) {
    cancelServiceConfigBtn.addEventListener('click', hideServiceConfigModal);
  }
  
  const serviceConfigModal = document.getElementById('serviceConfigModal');
  if (serviceConfigModal) {
    serviceConfigModal.addEventListener('click', (e) => {
      if (e.target === serviceConfigModal) {
        hideServiceConfigModal();
      }
    });
  }
  
  // Service configuration form submissions
  const aiServiceForm = document.getElementById('aiServiceForm');
  if (aiServiceForm) {
    aiServiceForm.addEventListener('submit', handleAIServiceFormSubmit);
  }
  
  const emailServiceForm = document.getElementById('emailServiceForm');
  if (emailServiceForm) {
    emailServiceForm.addEventListener('submit', handleEmailServiceFormSubmit);
  }
  
  const smsServiceForm = document.getElementById('smsServiceForm');
  if (smsServiceForm) {
    smsServiceForm.addEventListener('submit', handleSMSServiceFormSubmit);
  }
  
  // Test connection buttons
  const testAIBtn = document.getElementById('testAIBtn');
  if (testAIBtn) {
    testAIBtn.addEventListener('click', handleTestAIConnection);
  }
  
  const testEmailBtn = document.getElementById('testEmailBtn');
  if (testEmailBtn) {
    testEmailBtn.addEventListener('click', handleTestEmailConnection);
  }
  
  const testSMSBtn = document.getElementById('testSMSBtn');
  if (testSMSBtn) {
    testSMSBtn.addEventListener('click', handleTestSMSConnection);
  }
  
  // NEW FEATURES: Search, Filter, Export, Theme, Demo Data, Reminder History
  
  // Initialize theme
  initTheme();
  
  // Setup reminder history listeners
  setupReminderHistoryListeners();
  
  // Setup cost dashboard listeners
  setupCostDashboardListeners();
  
  // Setup test preview listeners
  setupTestPreviewListeners();
  
  // Test Preview button
  const testPreviewBtn = document.getElementById('testPreviewBtn');
  if (testPreviewBtn) {
    testPreviewBtn.addEventListener('click', () => {
      showTestPreviewModal();
    });
  }
  
  // Theme toggle button
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const newTheme = toggleTheme();
      const message = newTheme === 'dark' ? '🌙 Dark mode enabled' : '☀️ Light mode enabled';
      showToast(message, 'success');
    });
  }
  
  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      currentFilters.search = e.target.value;
      refreshDashboard();
    }, 300));
  }
  
  // Status filter
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentFilters.status = e.target.value;
      refreshDashboard();
    });
  }
  
  // Sort buttons
  const sortButtons = document.querySelectorAll('.sort-btn');
  sortButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sortBy = e.target.dataset.sort;
      if (currentFilters.sortBy === sortBy) {
        // Toggle direction
        currentFilters.sortDirection = currentFilters.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        currentFilters.sortBy = sortBy;
        currentFilters.sortDirection = 'asc';
      }
      
      // Update button states
      sortButtons.forEach(b => b.classList.remove('bg-primary', 'text-white'));
      e.target.classList.add('bg-primary', 'text-white');
      
      refreshDashboard();
    });
  });
  
  // Clear filters button
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      currentFilters = {
        search: '',
        status: 'all',
        sortBy: null,
        sortDirection: 'asc'
      };
      
      // Reset UI
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = 'all';
      sortButtons.forEach(b => b.classList.remove('bg-primary', 'text-white'));
      
      refreshDashboard();
      showToast('Filters cleared', 'success');
    });
  }
  
  // Export button
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (invoices.length === 0) {
        showToast('No invoices to export', 'info');
        return;
      }
      const summary = calculateSummary(invoices);
      showExportMenu(invoices, summary);
    });
  }
  
  // Demo data button (create if doesn't exist)
  let loadDemoBtn = document.getElementById('loadDemoBtn');
  if (!loadDemoBtn && !hasDemoData(invoices)) {
    loadDemoBtn = document.createElement('button');
    loadDemoBtn.id = 'loadDemoBtn';
    loadDemoBtn.className = 'fixed bottom-4 left-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors z-40';
    loadDemoBtn.setAttribute('aria-label', 'Load demo data');
    loadDemoBtn.innerHTML = '📊 Load Demo Data';
    document.body.appendChild(loadDemoBtn);
    
    loadDemoBtn.addEventListener('click', () => {
      if (hasDemoData(invoices)) {
        showToast('Demo data already loaded', 'info');
        return;
      }
      
      const demoInvoices = generateDemoData();
      invoices.push(...demoInvoices);
      saveInvoices(invoices);
      refreshDashboard();
      showToast(`Loaded ${demoInvoices.length} demo invoices!`, 'success');
      
      // Remove button after loading
      loadDemoBtn.remove();
    });
  }
}

/**
 * Handle invoice form submission (add or edit)
 * @param {Event} e - Form submit event
 */
function handleInvoiceFormSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const editId = form.getAttribute('data-edit-id');
  
  // Collect form data
  const formData = {
    clientName: document.getElementById('clientName').value.trim(),
    email: document.getElementById('clientEmail').value.trim(),
    phone: document.getElementById('clientPhone').value.trim(),
    amount: parseFloat(document.getElementById('amount').value),
    dueDate: document.getElementById('dueDate').value,
    paymentMethod: document.getElementById('paymentMethod').value,
    notes: document.getElementById('notes').value.trim()
  };
  
  // Validate the data
  const validation = validateInvoice(formData);
  
  if (!validation.valid) {
    // Display validation errors
    displayValidationErrors(validation.errors);
    return;
  }
  
  if (editId) {
    // Edit existing invoice
    handleEditInvoice(editId, formData);
  } else {
    // Add new invoice
    handleAddInvoice(formData);
  }
}

/**
 * Handle real-time validation for amount field
 * @param {Event} e - Input or blur event
 */
function handleAmountValidation(e) {
  const amountInput = e.target;
  const amountError = document.getElementById('amountError');
  
  if (!amountInput || !amountError) return;
  
  const value = amountInput.value.trim();
  
  // Clear error if field is empty (not yet filled)
  if (value === '') {
    amountError.classList.add('hidden');
    amountError.textContent = '';
    amountInput.classList.remove('border-red-500');
    amountInput.classList.add('border-gray-300');
    return;
  }
  
  const amount = parseFloat(value);
  
  // Validate amount
  if (isNaN(amount)) {
    amountError.textContent = 'Amount must be a valid number';
    amountError.classList.remove('hidden');
    amountInput.classList.add('border-red-500');
    amountInput.classList.remove('border-gray-300');
  } else if (amount <= 0) {
    amountError.textContent = 'Amount must be greater than zero';
    amountError.classList.remove('hidden');
    amountInput.classList.add('border-red-500');
    amountInput.classList.remove('border-gray-300');
  } else {
    amountError.textContent = '';
    amountError.classList.add('hidden');
    amountInput.classList.remove('border-red-500');
    amountInput.classList.add('border-gray-300');
  }
}

/**
 * Handle real-time validation for email field
 * @param {Event} e - Blur event
 */
function handleEmailValidation(e) {
  const emailInput = e.target;
  const emailError = document.getElementById('clientEmailError');
  
  if (!emailInput || !emailError) return;
  
  const value = emailInput.value.trim();
  
  // Clear error if field is empty (optional field)
  if (value === '') {
    emailError.classList.add('hidden');
    emailError.textContent = '';
    emailInput.classList.remove('border-red-500');
    emailInput.classList.add('border-gray-300');
    return;
  }
  
  // Import validateEmail from validator module
  import('./validator.js').then(({ validateEmail }) => {
    if (!validateEmail(value)) {
      emailError.textContent = 'Please enter a valid email address';
      emailError.classList.remove('hidden');
      emailInput.classList.add('border-red-500');
      emailInput.classList.remove('border-gray-300');
    } else {
      emailError.textContent = '';
      emailError.classList.add('hidden');
      emailInput.classList.remove('border-red-500');
      emailInput.classList.add('border-gray-300');
    }
  });
}

/**
 * Handle real-time validation for phone field
 * @param {Event} e - Blur event
 */
function handlePhoneValidation(e) {
  const phoneInput = e.target;
  const phoneError = document.getElementById('clientPhoneError');
  
  if (!phoneInput || !phoneError) return;
  
  const value = phoneInput.value.trim();
  
  // Clear error if field is empty (optional field)
  if (value === '') {
    phoneError.classList.add('hidden');
    phoneError.textContent = '';
    phoneInput.classList.remove('border-red-500');
    phoneInput.classList.add('border-gray-300');
    return;
  }
  
  // Import validatePhone from validator module
  import('./validator.js').then(({ validatePhone }) => {
    if (!validatePhone(value)) {
      phoneError.textContent = 'Please enter a valid Indian mobile number (+91XXXXXXXXXX or 10 digits)';
      phoneError.classList.remove('hidden');
      phoneInput.classList.add('border-red-500');
      phoneInput.classList.remove('border-gray-300');
    } else {
      phoneError.textContent = '';
      phoneError.classList.add('hidden');
      phoneInput.classList.remove('border-red-500');
      phoneInput.classList.add('border-gray-300');
    }
  });
}

/**
 * Get unique contacts from existing invoices
 * @returns {Array} Array of unique contact objects
 */
function getUniqueContacts() {
  const contactMap = new Map();
  
  invoices.forEach(invoice => {
    if (invoice.clientName) {
      const key = invoice.clientName.toLowerCase();
      if (!contactMap.has(key)) {
        contactMap.set(key, {
          clientName: invoice.clientName,
          email: invoice.email || '',
          phone: invoice.phone || ''
        });
      } else {
        // Update with most recent contact info if available
        const existing = contactMap.get(key);
        if (invoice.email && !existing.email) {
          existing.email = invoice.email;
        }
        if (invoice.phone && !existing.phone) {
          existing.phone = invoice.phone;
        }
      }
    }
  });
  
  return Array.from(contactMap.values());
}

/**
 * Handle client name input for autocomplete suggestions
 * @param {Event} e - Input event
 */
function handleClientNameInput(e) {
  const input = e.target;
  const value = input.value.trim().toLowerCase();
  const datalist = document.getElementById('clientNameSuggestions');
  
  if (!datalist) return;
  
  // Clear existing options
  datalist.innerHTML = '';
  
  // Don't show suggestions for very short input
  if (value.length < 2) return;
  
  // Get unique contacts
  const contacts = getUniqueContacts();
  
  // Filter contacts that match the input
  const matches = contacts.filter(contact => 
    contact.clientName.toLowerCase().includes(value)
  );
  
  // Add matching contacts to datalist
  matches.forEach(contact => {
    const option = document.createElement('option');
    option.value = contact.clientName;
    datalist.appendChild(option);
  });
}

/**
 * Handle client name selection to autofill contact info
 * @param {Event} e - Change event
 */
function handleClientNameSelect(e) {
  const input = e.target;
  const selectedName = input.value.trim();
  
  if (!selectedName) return;
  
  // Find matching contact
  const contacts = getUniqueContacts();
  const match = contacts.find(contact => 
    contact.clientName.toLowerCase() === selectedName.toLowerCase()
  );
  
  if (match) {
    // Autofill email and phone if available
    const emailInput = document.getElementById('clientEmail');
    const phoneInput = document.getElementById('clientPhone');
    
    if (emailInput && match.email && !emailInput.value) {
      emailInput.value = match.email;
    }
    
    if (phoneInput && match.phone && !phoneInput.value) {
      phoneInput.value = match.phone;
    }
  }
}

/**
 * Handle adding a new invoice
 * @param {Object} data - Invoice form data
 */
async function handleAddInvoice(data) {
  // Show loading state
  const submitBtn = document.querySelector('#invoiceForm button[type="submit"]');
  setButtonLoading(submitBtn, true);
  
  try {
    // Create new invoice
    const newInvoice = createInvoice(data, invoices);
    
    // Add to invoices array
    invoices.push(newInvoice);
    
    // Save to localStorage with retry logic
    const result = await retryWithBackoff(async () => {
      const saveResult = saveInvoices(invoices);
      if (!saveResult.success) {
        throw new Error(saveResult.message || 'Failed to save');
      }
      return saveResult;
    }, 2, 300);
    
    // Hide loading state
    setButtonLoading(submitBtn, false);
    
    // Reset form
    const form = document.getElementById('invoiceForm');
    if (form) {
      form.reset();
    }
    
    // Close modal and refresh UI
    hideInvoiceModal();
    refreshDashboard();
    showToast('Invoice created successfully!', 'success');
    
  } catch (error) {
    // Hide loading state
    setButtonLoading(submitBtn, false);
    
    // Remove the invoice from array since save failed
    invoices.pop();
    
    // Show appropriate error message
    console.error('Error adding invoice:', error);
    
    if (error.message && error.message.includes('Storage limit')) {
      showToast('Storage limit reached. Please delete some old invoices to continue.', 'error');
    } else {
      showToast('Failed to save invoice after multiple attempts. Please try again.', 'error');
    }
  }
}

/**
 * Handle editing an existing invoice
 * @param {string} id - Invoice ID
 * @param {Object} updates - Updated invoice data
 */
async function handleEditInvoice(id, updates) {
  // Show loading state
  const submitBtn = document.querySelector('#invoiceForm button[type="submit"]');
  setButtonLoading(submitBtn, true);
  
  let originalInvoice = null;
  
  try {
    // Find the invoice
    const index = invoices.findIndex(inv => inv.id === id);
    
    if (index === -1) {
      setButtonLoading(submitBtn, false);
      showToast('Invoice not found', 'error');
      return;
    }
    
    // Store original invoice for rollback
    originalInvoice = { ...invoices[index] };
    
    // Update the invoice (preserving id and createdDate)
    const updatedInvoice = updateInvoice(invoices[index], updates);
    invoices[index] = updatedInvoice;
    
    // Save to localStorage with retry logic
    const result = await retryWithBackoff(async () => {
      const saveResult = saveInvoices(invoices);
      if (!saveResult.success) {
        throw new Error(saveResult.message || 'Failed to save');
      }
      return saveResult;
    }, 2, 300);
    
    // Hide loading state
    setButtonLoading(submitBtn, false);
    
    // Reset form
    const form = document.getElementById('invoiceForm');
    if (form) {
      form.reset();
    }
    
    // Close modal and refresh UI
    hideInvoiceModal();
    refreshDashboard();
    showToast('Invoice updated successfully!', 'success');
    
  } catch (error) {
    // Hide loading state
    setButtonLoading(submitBtn, false);
    
    // Rollback the change
    const index = invoices.findIndex(inv => inv.id === id);
    if (index !== -1 && originalInvoice) {
      invoices[index] = originalInvoice;
    }
    
    // Show appropriate error message
    console.error('Error updating invoice:', error);
    
    if (error.message && error.message.includes('Storage limit')) {
      showToast('Storage limit reached. Please delete some old invoices to continue.', 'error');
    } else {
      showToast('Failed to update invoice after multiple attempts. Please try again.', 'error');
    }
  }
}

/**
 * Handle deleting an invoice with confirmation
 * @param {string} id - Invoice ID
 */
async function handleDeleteInvoice(id) {
  // Find the invoice for confirmation message
  const invoice = invoices.find(inv => inv.id === id);
  
  if (!invoice) {
    showToast('Invoice not found', 'error');
    return;
  }
  
  // Show confirmation dialog
  const confirmed = await showConfirmDialog(
    `Are you sure you want to delete invoice ${invoice.invoiceNumber} for ${invoice.clientName}?`
  );
  
  if (!confirmed) {
    return;
  }
  
  // Show loading overlay
  showLoading('Deleting invoice...');
  
  let originalInvoices = null;
  
  try {
    // Store original invoices for rollback
    originalInvoices = [...invoices];
    
    // Delete the invoice
    invoices = deleteInvoice(invoices, id);
    
    // Save to localStorage with retry logic
    const result = await retryWithBackoff(async () => {
      const saveResult = saveInvoices(invoices);
      if (!saveResult.success) {
        throw new Error(saveResult.message || 'Failed to save');
      }
      return saveResult;
    }, 2, 300);
    
    // Hide loading overlay
    hideLoading();
    
    // Refresh UI
    refreshDashboard();
    showToast('Invoice deleted successfully', 'success');
    
  } catch (error) {
    // Hide loading overlay
    hideLoading();
    
    // Rollback the deletion
    invoices = originalInvoices;
    
    // Show appropriate error message
    console.error('Error deleting invoice:', error);
    
    if (error.message && error.message.includes('Storage limit')) {
      showToast('Storage limit reached. Unable to save changes.', 'error');
    } else {
      showToast('Failed to delete invoice after multiple attempts. Please try again.', 'error');
    }
  }
}

/**
 * Handle marking an invoice as paid
 * @param {string} id - Invoice ID
 */
async function handleMarkPaid(id) {
  // Show loading overlay
  showLoading('Marking as paid...');
  
  let originalInvoice = null;
  
  try {
    // Find the invoice
    const index = invoices.findIndex(inv => inv.id === id);
    
    if (index === -1) {
      hideLoading();
      showToast('Invoice not found', 'error');
      return;
    }
    
    // Store original invoice for rollback
    originalInvoice = { ...invoices[index] };
    
    // Update status to paid
    invoices[index] = updateInvoice(invoices[index], { status: 'paid' });
    
    // Save to localStorage with retry logic
    const result = await retryWithBackoff(async () => {
      const saveResult = saveInvoices(invoices);
      if (!saveResult.success) {
        throw new Error(saveResult.message || 'Failed to save');
      }
      return saveResult;
    }, 2, 300);
    
    // Hide loading overlay
    hideLoading();
    
    // Refresh UI
    refreshDashboard();
    showToast('Invoice marked as paid!', 'success');
    
  } catch (error) {
    // Hide loading overlay
    hideLoading();
    
    // Rollback the change
    const index = invoices.findIndex(inv => inv.id === id);
    if (index !== -1 && originalInvoice) {
      invoices[index] = originalInvoice;
    }
    
    // Show appropriate error message
    console.error('Error marking invoice as paid:', error);
    
    if (error.message && error.message.includes('Storage limit')) {
      showToast('Storage limit reached. Unable to save changes.', 'error');
    } else {
      showToast('Failed to update invoice after multiple attempts. Please try again.', 'error');
    }
  }
}

/**
 * Handle sending a reminder (generate and show reminder modal)
 * @param {string} id - Invoice ID
 */
function handleSendReminder(id) {
  // Find the invoice
  const invoice = invoices.find(inv => inv.id === id);
  
  if (!invoice) {
    showToast('Invoice not found', 'error');
    return;
  }
  
  // Get late fee config and payment settings
  const lateFeeConfig = getLateFeeConfig();
  const paymentSettings = getPaymentSettings();
  
  // Enrich invoice with status and late fee
  const enrichedInvoices = getInvoicesWithStatus([invoice], lateFeeConfig);
  const enrichedInvoice = enrichedInvoices[0];
  
  // Generate reminder message
  const reminderText = generateReminder(enrichedInvoice, paymentSettings);
  
  // Show reminder modal
  showReminderModal(reminderText);
  
  // Update reminderSent flag
  const index = invoices.findIndex(inv => inv.id === id);
  if (index !== -1) {
    invoices[index] = updateInvoice(invoices[index], { reminderSent: true });
    saveInvoices(invoices);
  }
}

/**
 * Handle sending an immediate reminder (manual trigger)
 * @param {string} id - Invoice ID
 */
async function handleSendReminderNow(id) {
  // Find the invoice
  const invoice = invoices.find(inv => inv.id === id);
  
  if (!invoice) {
    showToast('Invoice not found', 'error');
    return;
  }
  
  // Show confirmation dialog
  const confirmed = await showConfirmDialog(
    `Send an immediate reminder for invoice ${invoice.invoiceNumber} to ${invoice.clientName}?`
  );
  
  if (!confirmed) {
    return;
  }
  
  // Show loading overlay
  showLoading('Sending reminder...');
  
  try {
    // Get late fee config and payment settings
    const lateFeeConfig = getLateFeeConfig();
    const paymentSettings = getPaymentSettings();
    
    // Enrich invoice with status and late fee
    const enrichedInvoices = getInvoicesWithStatus([invoice], lateFeeConfig);
    const enrichedInvoice = enrichedInvoices[0];
    
    // Calculate days overdue
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const daysOverdue = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));
    
    // Determine escalation level based on days overdue
    let escalationLevel = 'gentle';
    if (daysOverdue >= 8) {
      escalationLevel = 'urgent';
    } else if (daysOverdue >= 4) {
      escalationLevel = 'firm';
    }
    
    // Prepare invoice data for API
    const invoiceData = {
      clientName: invoice.clientName,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      paymentDetails: {
        upiId: paymentSettings.upiId || '',
        bankDetails: paymentSettings.bankDetails || '',
        paypalEmail: paymentSettings.paypalEmail || ''
      }
    };
    
    // Determine channel (both email and SMS if available)
    const channel = (invoice.email && invoice.phone) ? 'both' : 
                    invoice.email ? 'email' : 
                    invoice.phone ? 'sms' : null;
    
    if (!channel) {
      hideLoading();
      showToast('No contact information available for this invoice', 'error');
      return;
    }
    
    // Call backend API to send reminder
    const response = await fetch('http://localhost:3000/api/reminders/send-now', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoiceId: invoice.id,
        channel,
        invoiceData,
        escalationLevel,
        useAI: true
      })
    });
    
    const result = await response.json();
    
    // Hide loading overlay
    hideLoading();
    
    if (result.success || result.partial) {
      // Update reminderSent flag
      const index = invoices.findIndex(inv => inv.id === id);
      if (index !== -1) {
        invoices[index] = updateInvoice(invoices[index], { reminderSent: true });
        saveInvoices(invoices);
      }
      
      // Refresh dashboard
      refreshDashboard();
      
      const message = result.partial 
        ? 'Reminder partially sent (some channels failed)' 
        : 'Reminder sent successfully!';
      showToast(message, result.partial ? 'warning' : 'success');
    } else {
      showToast(result.error || 'Failed to send reminder', 'error');
    }
    
  } catch (error) {
    // Hide loading overlay
    hideLoading();
    
    console.error('Error sending immediate reminder:', error);
    showToast('Failed to send reminder. Please check your connection and try again.', 'error');
  }
}

/**
 * Handle pausing automated reminders for an invoice
 * @param {string} id - Invoice ID
 */
async function handlePauseReminders(id) {
  // Find the invoice
  const invoice = invoices.find(inv => inv.id === id);
  
  if (!invoice) {
    showToast('Invoice not found', 'error');
    return;
  }
  
  // Show confirmation dialog
  const confirmed = await showConfirmDialog(
    `Pause automated reminders for invoice ${invoice.invoiceNumber}? You can resume them later.`
  );
  
  if (!confirmed) {
    return;
  }
  
  // Show loading overlay
  showLoading('Pausing reminders...');
  
  try {
    // Call backend API to pause reminders
    const response = await fetch('http://localhost:3000/api/reminders/pause', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoiceId: invoice.id
      })
    });
    
    const result = await response.json();
    
    // Hide loading overlay
    hideLoading();
    
    if (result.success) {
      // Update invoice with paused flag
      const index = invoices.findIndex(inv => inv.id === id);
      if (index !== -1) {
        invoices[index] = updateInvoice(invoices[index], { remindersPaused: true });
        saveInvoices(invoices);
      }
      
      // Refresh dashboard
      refreshDashboard();
      
      showToast('Automated reminders paused for this invoice', 'success');
    } else {
      showToast(result.error || 'Failed to pause reminders', 'error');
    }
    
  } catch (error) {
    // Hide loading overlay
    hideLoading();
    
    console.error('Error pausing reminders:', error);
    showToast('Failed to pause reminders. Please check your connection and try again.', 'error');
  }
}

/**
 * Handle resuming automated reminders for an invoice
 * @param {string} id - Invoice ID
 */
async function handleResumeReminders(id) {
  // Find the invoice
  const invoice = invoices.find(inv => inv.id === id);
  
  if (!invoice) {
    showToast('Invoice not found', 'error');
    return;
  }
  
  // Show confirmation dialog
  const confirmed = await showConfirmDialog(
    `Resume automated reminders for invoice ${invoice.invoiceNumber}?`
  );
  
  if (!confirmed) {
    return;
  }
  
  // Show loading overlay
  showLoading('Resuming reminders...');
  
  try {
    // Call backend API to resume reminders
    const response = await fetch('http://localhost:3000/api/reminders/resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoiceId: invoice.id
      })
    });
    
    const result = await response.json();
    
    // Hide loading overlay
    hideLoading();
    
    if (result.success) {
      // Update invoice with paused flag removed
      const index = invoices.findIndex(inv => inv.id === id);
      if (index !== -1) {
        invoices[index] = updateInvoice(invoices[index], { remindersPaused: false });
        saveInvoices(invoices);
      }
      
      // Refresh dashboard
      refreshDashboard();
      
      showToast('Automated reminders resumed for this invoice', 'success');
    } else {
      showToast(result.error || 'Failed to resume reminders', 'error');
    }
    
  } catch (error) {
    // Hide loading overlay
    hideLoading();
    
    console.error('Error resuming reminders:', error);
    showToast('Failed to resume reminders. Please check your connection and try again.', 'error');
  }
}

/**
 * Handle table action button clicks (event delegation)
 * @param {Event} e - Click event
 */
function handleTableAction(e) {
  // Find the button that was clicked
  const button = e.target.closest('button[data-action]');
  
  if (!button) return;
  
  const action = button.getAttribute('data-action');
  const id = button.getAttribute('data-id');
  
  if (!id) return;
  
  switch (action) {
    case 'edit':
      const invoice = invoices.find(inv => inv.id === id);
      if (invoice) {
        showInvoiceModal(invoice);
      }
      break;
    
    case 'delete':
      handleDeleteInvoice(id);
      break;
    
    case 'markPaid':
      handleMarkPaid(id);
      break;
    
    case 'reminder':
      handleSendReminder(id);
      break;
    
    case 'sendNow':
      handleSendReminderNow(id);
      break;
    
    case 'pauseReminders':
      handlePauseReminders(id);
      break;
    
    case 'resumeReminders':
      handleResumeReminders(id);
      break;
  }
}

/**
 * Handle copying reminder text to clipboard
 */
function handleCopyReminder() {
  const textarea = document.getElementById('reminderText');
  
  if (!textarea) return;
  
  const text = textarea.value;
  copyToClipboard(text);
}

/**
 * Handle opening settings modal
 */
async function handleOpenSettings() {
  // Show loading state
  showLoading('Loading settings...');
  
  try {
    // Load current settings
    const paymentSettings = getPaymentSettings();
    const lateFeeConfig = getLateFeeConfig();
    
    // Load reminder configuration from backend
    const reminderConfig = await loadReminderConfig();
    
    // Hide loading state
    hideLoading();
    
    // Show settings modal with current values
    showSettingsModal(paymentSettings, lateFeeConfig);
    
    // Populate reminder settings form
    populateReminderSettingsForm(reminderConfig);
    
    // Setup reminder settings listeners
    setupReminderSettingsListeners();
  } catch (error) {
    // Hide loading state
    hideLoading();
    
    console.error('Error loading settings:', error);
    showToast('Failed to load reminder settings. Using defaults.', 'warning');
    
    // Show settings modal anyway with defaults
    const paymentSettings = getPaymentSettings();
    const lateFeeConfig = getLateFeeConfig();
    showSettingsModal(paymentSettings, lateFeeConfig);
    
    // Setup reminder settings listeners
    setupReminderSettingsListeners();
  }
}

/**
 * Handle settings form submission
 * @param {Event} e - Form submit event
 */
async function handleSettingsFormSubmit(e) {
  e.preventDefault();
  
  // Show loading state
  const submitBtn = document.querySelector('#settingsForm button[type="submit"]');
  setButtonLoading(submitBtn, true);
  
  try {
    // Collect payment settings
    const paymentSettings = {
      userName: document.getElementById('userName').value.trim(),
      upiId: document.getElementById('upiId').value.trim(),
      bankDetails: document.getElementById('bankDetails').value.trim(),
      paypalEmail: document.getElementById('paypalEmail').value.trim()
    };
    
    // Collect late fee configuration
    const lateFeeConfig = {
      enabled: document.getElementById('lateFeeEnabled').checked,
      percentagePerWeek: parseFloat(document.getElementById('lateFeePercentage').value) || 1.0
    };
    
    // Collect reminder settings
    const reminderSettings = extractReminderSettingsFromForm();
    
    // Validate reminder settings
    const validation = validateReminderSettings(reminderSettings);
    if (!validation.valid) {
      setButtonLoading(submitBtn, false);
      showToast(validation.errors.join('. '), 'error');
      return;
    }
    
    // Save settings with retry logic
    const paymentResult = await retryWithBackoff(async () => {
      const result = savePaymentSettings(paymentSettings);
      if (!result.success) {
        throw new Error(result.message || 'Failed to save payment settings');
      }
      return result;
    }, 2, 300);
    
    const lateFeeResult = await retryWithBackoff(async () => {
      const result = saveLateFeeConfig(lateFeeConfig);
      if (!result.success) {
        throw new Error(result.message || 'Failed to save late fee config');
      }
      return result;
    }, 2, 300);
    
    // Save reminder settings to backend
    const reminderResult = await retryWithBackoff(async () => {
      return await saveReminderConfig(reminderSettings);
    }, 2, 300);
    
    // Hide loading state
    setButtonLoading(submitBtn, false);
    
    // Close modal and show success message
    hideSettingsModal();
    showToast('Settings saved successfully!', 'success');
    
    // Refresh dashboard to apply late fee changes
    refreshDashboard();
    
  } catch (error) {
    // Hide loading state
    setButtonLoading(submitBtn, false);
    
    // Show appropriate error message
    console.error('Error saving settings:', error);
    
    if (error.message && error.message.includes('Storage limit')) {
      showToast('Storage limit reached. Please clear some data.', 'error');
    } else if (error.message && error.message.includes('reminder')) {
      showToast(`Failed to save reminder settings: ${error.message}`, 'error');
    } else {
      showToast('Failed to save settings after multiple attempts. Please try again.', 'error');
    }
  }
}

/**
 * Generate a simple hash for invoice array to detect changes
 * @param {Array} invoices - Array of invoices
 * @returns {string} Hash string
 */
function generateInvoicesHash(invoices) {
  return invoices.map(inv => `${inv.id}-${inv.status}-${inv.amount}-${inv.dueDate}`).join('|');
}

/**
 * Refresh the dashboard with current invoice data (optimized with caching)
 */
function refreshDashboard() {
  // Get late fee config
  const lateFeeConfig = getLateFeeConfig();
  
  // Generate hash to check if invoices have changed
  const currentHash = generateInvoicesHash(invoices);
  
  // Use cached enriched invoices if data hasn't changed
  let enrichedInvoices;
  if (currentHash === lastInvoicesHash && enrichedInvoicesCache) {
    enrichedInvoices = enrichedInvoicesCache;
  } else {
    // Get invoices with status and enriched data
    enrichedInvoices = getInvoicesWithStatus(invoices, lateFeeConfig);
    
    // Update cache
    enrichedInvoicesCache = enrichedInvoices;
    lastInvoicesHash = currentHash;
  }
  
  // Apply filters (search, status filter, sorting)
  const filteredInvoices = applyFilters(enrichedInvoices, currentFilters);
  
  // Calculate summary statistics (use unfiltered for accurate totals)
  const summary = calculateSummary(invoices);
  
  // Render dashboard with filtered invoices
  renderDashboard(filteredInvoices, summary);
}

/**
 * Debounced version of refreshDashboard for rapid updates
 */
const debouncedRefreshDashboard = debounce(refreshDashboard, 100);

/**
 * Create a debounced search/filter handler (for future use)
 * @param {Function} filterFn - Filter function to apply
 * @returns {Function} Debounced filter handler
 */
function createDebouncedFilter(filterFn) {
  return debounce((searchTerm) => {
    const filtered = filterFn(invoices, searchTerm);
    
    // Get late fee config
    const lateFeeConfig = getLateFeeConfig();
    
    // Get enriched invoices
    const enrichedInvoices = getInvoicesWithStatus(filtered, lateFeeConfig);
    
    // Calculate summary for filtered results
    const summary = calculateSummary(filtered);
    
    // Render dashboard with filtered data
    renderDashboard(enrichedInvoices, summary);
  }, 300);
}

/**
 * Display validation errors in the form
 * @param {Array} errors - Array of error objects
 */
function displayValidationErrors(errors) {
  // Clear previous errors
  clearFormErrors();
  
  // Display each error
  errors.forEach(error => {
    const errorEl = document.getElementById(`${error.field}Error`);
    const inputEl = document.getElementById(error.field);
    
    if (errorEl) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
    
    // Add error styling to input field
    if (inputEl) {
      inputEl.classList.add('border-red-500');
      inputEl.classList.remove('border-gray-300');
    }
  });
  
  // Show toast with general error message
  const errorCount = errors.length;
  const errorMessage = errorCount === 1 
    ? 'Please fix the validation error' 
    : `Please fix ${errorCount} validation errors`;
  showToast(errorMessage, 'error');
  
  // Focus on first error field
  if (errors.length > 0) {
    const firstErrorField = document.getElementById(errors[0].field);
    if (firstErrorField) {
      firstErrorField.focus();
    }
  }
}

/**
 * Clear form validation errors
 */
function clearFormErrors() {
  const errorElements = document.querySelectorAll('[id$="Error"]');
  errorElements.forEach(el => {
    el.classList.add('hidden');
    el.textContent = '';
  });
  
  // Remove error styling from input fields
  const inputElements = document.querySelectorAll('#invoiceForm input, #invoiceForm select, #invoiceForm textarea');
  inputElements.forEach(el => {
    el.classList.remove('border-red-500');
    el.classList.add('border-gray-300');
  });
}

/**
 * Show service configuration modal
 */
function showServiceConfigModal() {
  const modal = document.getElementById('serviceConfigModal');
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Hide service configuration modal
 */
function hideServiceConfigModal() {
  const modal = document.getElementById('serviceConfigModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

/**
 * Handle opening service configuration modal
 */
async function handleOpenServiceConfig() {
  // Show loading state
  showLoading('Loading service configurations...');
  
  try {
    // Load current service configurations
    const configs = await loadServiceConfigs();
    
    // Hide loading state
    hideLoading();
    
    // Show service config modal
    showServiceConfigModal();
    
    // Populate forms with current configurations
    populateAIServiceForm(configs.ai);
    populateEmailServiceForm(configs.email);
    populateSMSServiceForm(configs.sms);
    
    // Setup service config listeners
    setupServiceConfigListeners();
    
  } catch (error) {
    // Hide loading state
    hideLoading();
    
    console.error('Error loading service configurations:', error);
    showToast('Failed to load service configurations. Using defaults.', 'warning');
    
    // Show service config modal anyway with defaults
    showServiceConfigModal();
    
    // Populate forms with defaults
    populateAIServiceForm(null);
    populateEmailServiceForm(null);
    populateSMSServiceForm(null);
    
    // Setup service config listeners
    setupServiceConfigListeners();
  }
}

/**
 * Handle AI service form submission
 * @param {Event} e - Form submit event
 */
async function handleAIServiceFormSubmit(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);
  
  try {
    // Extract configuration from form
    const config = extractAIServiceConfig();
    
    // Validate configuration
    const validation = validateAIServiceConfig(config);
    if (!validation.valid) {
      setButtonLoading(submitBtn, false);
      showToast(validation.errors.join('. '), 'error');
      return;
    }
    
    // Save configuration
    const result = await saveServiceConfig(config);
    
    setButtonLoading(submitBtn, false);
    showToast('AI service configuration saved successfully!', 'success');
    
    // Update form with returned config ID
    const form = document.getElementById('aiServiceForm');
    if (form && result.config) {
      form.setAttribute('data-config-id', result.config.id);
    }
    
  } catch (error) {
    setButtonLoading(submitBtn, false);
    console.error('Error saving AI service configuration:', error);
    showToast(`Failed to save AI configuration: ${error.message}`, 'error');
  }
}

/**
 * Handle email service form submission
 * @param {Event} e - Form submit event
 */
async function handleEmailServiceFormSubmit(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);
  
  try {
    // Extract configuration from form
    const config = extractEmailServiceConfig();
    
    // Validate configuration
    const validation = validateEmailServiceConfig(config);
    if (!validation.valid) {
      setButtonLoading(submitBtn, false);
      showToast(validation.errors.join('. '), 'error');
      return;
    }
    
    // Save configuration
    const result = await saveServiceConfig(config);
    
    setButtonLoading(submitBtn, false);
    showToast('Email service configuration saved successfully!', 'success');
    
    // Update form with returned config ID
    const form = document.getElementById('emailServiceForm');
    if (form && result.config) {
      form.setAttribute('data-config-id', result.config.id);
    }
    
  } catch (error) {
    setButtonLoading(submitBtn, false);
    console.error('Error saving email service configuration:', error);
    showToast(`Failed to save email configuration: ${error.message}`, 'error');
  }
}

/**
 * Handle SMS service form submission
 * @param {Event} e - Form submit event
 */
async function handleSMSServiceFormSubmit(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);
  
  try {
    // Extract configuration from form
    const config = extractSMSServiceConfig();
    
    // Validate configuration
    const validation = validateSMSServiceConfig(config);
    if (!validation.valid) {
      setButtonLoading(submitBtn, false);
      showToast(validation.errors.join('. '), 'error');
      return;
    }
    
    // Save configuration
    const result = await saveServiceConfig(config);
    
    setButtonLoading(submitBtn, false);
    showToast('SMS service configuration saved successfully!', 'success');
    
    // Update form with returned config ID
    const form = document.getElementById('smsServiceForm');
    if (form && result.config) {
      form.setAttribute('data-config-id', result.config.id);
    }
    
  } catch (error) {
    setButtonLoading(submitBtn, false);
    console.error('Error saving SMS service configuration:', error);
    showToast(`Failed to save SMS configuration: ${error.message}`, 'error');
  }
}

/**
 * Handle testing AI connection
 */
async function handleTestAIConnection() {
  const testBtn = document.getElementById('testAIBtn');
  setButtonLoading(testBtn, true);
  
  try {
    // Extract configuration from form
    const config = extractAIServiceConfig();
    
    // Validate configuration
    const validation = validateAIServiceConfig(config);
    if (!validation.valid) {
      setButtonLoading(testBtn, false);
      showToast(validation.errors.join('. '), 'error');
      return;
    }
    
    // Test connection
    const testData = {
      serviceType: 'ai',
      provider: config.provider,
      apiKey: config.apiKey,
      config: config.config
    };
    
    const result = await testServiceConnection(testData);
    
    setButtonLoading(testBtn, false);
    
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
    
  } catch (error) {
    setButtonLoading(testBtn, false);
    console.error('Error testing AI connection:', error);
    showToast(`Connection test failed: ${error.message}`, 'error');
  }
}

/**
 * Handle testing email connection
 */
async function handleTestEmailConnection() {
  const testBtn = document.getElementById('testEmailBtn');
  setButtonLoading(testBtn, true);
  
  try {
    // Extract configuration from form
    const config = extractEmailServiceConfig();
    
    // Validate configuration
    const validation = validateEmailServiceConfig(config);
    if (!validation.valid) {
      setButtonLoading(testBtn, false);
      showToast(validation.errors.join('. '), 'error');
      return;
    }
    
    // Ask user for test email address
    const testEmail = prompt('Enter email address to send test email to:', config.config.senderEmail);
    
    if (!testEmail) {
      setButtonLoading(testBtn, false);
      return;
    }
    
    // Test connection
    const testData = {
      serviceType: 'email',
      provider: config.provider,
      apiKey: config.apiKey,
      config: config.config,
      testEmail
    };
    
    const result = await testServiceConnection(testData);
    
    setButtonLoading(testBtn, false);
    
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
    
  } catch (error) {
    setButtonLoading(testBtn, false);
    console.error('Error testing email connection:', error);
    showToast(`Connection test failed: ${error.message}`, 'error');
  }
}

/**
 * Handle testing SMS connection
 */
async function handleTestSMSConnection() {
  const testBtn = document.getElementById('testSMSBtn');
  setButtonLoading(testBtn, true);
  
  try {
    // Extract configuration from form
    const config = extractSMSServiceConfig();
    
    // Validate configuration
    const validation = validateSMSServiceConfig(config);
    if (!validation.valid) {
      setButtonLoading(testBtn, false);
      showToast(validation.errors.join('. '), 'error');
      return;
    }
    
    // Ask user for test phone number
    const testPhone = prompt('Enter phone number to send test SMS to (E.164 format, e.g., +1234567890):');
    
    if (!testPhone) {
      setButtonLoading(testBtn, false);
      return;
    }
    
    // Test connection
    const testData = {
      serviceType: 'sms',
      provider: config.provider,
      apiKey: config.apiKey,
      config: config.config,
      testPhone
    };
    
    const result = await testServiceConnection(testData);
    
    setButtonLoading(testBtn, false);
    
    if (result.success) {
      showToast(result.message, 'success');
    } else {
      showToast(result.message, 'error');
    }
    
  } catch (error) {
    setButtonLoading(testBtn, false);
    console.error('Error testing SMS connection:', error);
    showToast(`Connection test failed: ${error.message}`, 'error');
  }
}

// Initialize app when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

// Export functions for testing (ES6 modules)
export {
  handleAddInvoice,
  handleEditInvoice,
  handleDeleteInvoice,
  handleMarkPaid,
  handleSendReminder,
  handleAmountValidation,
  handleEmailValidation,
  handlePhoneValidation,
  handleClientNameInput,
  handleClientNameSelect,
  getUniqueContacts,
  handleOpenSettings,
  handleSettingsFormSubmit,
  handleOpenServiceConfig,
  handleAIServiceFormSubmit,
  handleEmailServiceFormSubmit,
  handleSMSServiceFormSubmit,
  handleTestAIConnection,
  handleTestEmailConnection,
  handleTestSMSConnection,
  showServiceConfigModal,
  hideServiceConfigModal,
  refreshDashboard,
  debouncedRefreshDashboard,
  createDebouncedFilter,
  generateInvoicesHash,
  initApp
};
