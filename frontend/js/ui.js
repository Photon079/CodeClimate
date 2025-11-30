/**
 * UI Module - DOM manipulation and rendering for Invoice Guard
 * Handles all user interface updates and interactions
 */

// Import formatter functions for module environment
import { formatCurrency, formatDate, formatDateForInput } from './formatter.js';
// Import performance utilities
import { batchDOMUpdate, debounce } from './performance.js';

/**
 * Show loading overlay with optional message
 * @param {string} message - Loading message to display
 */
function showLoading(message = 'Loading...') {
  const overlay = document.getElementById('loadingOverlay');
  const messageEl = document.getElementById('loadingMessage');
  
  if (overlay) {
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-busy', 'true');
    
    if (messageEl) {
      messageEl.textContent = message;
    }
    overlay.classList.remove('hidden');
  }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  
  if (overlay) {
    overlay.setAttribute('aria-busy', 'false');
    overlay.classList.add('hidden');
  }
}

/**
 * Show skeleton screen for initial load
 */
function showSkeletonScreen() {
  const skeleton = document.getElementById('skeletonScreen');
  const summarySection = document.getElementById('summarySection');
  const invoicesSection = document.getElementById('invoicesSection');
  
  if (skeleton) {
    skeleton.classList.remove('hidden');
  }
  
  // Hide actual content
  if (summarySection) {
    summarySection.classList.add('hidden');
  }
  if (invoicesSection) {
    invoicesSection.classList.add('hidden');
  }
}

/**
 * Hide skeleton screen and show actual content
 */
function hideSkeletonScreen() {
  const skeleton = document.getElementById('skeletonScreen');
  const summarySection = document.getElementById('summarySection');
  const invoicesSection = document.getElementById('invoicesSection');
  
  if (skeleton) {
    skeleton.classList.add('hidden');
  }
  
  // Show actual content with fade-in
  if (summarySection) {
    summarySection.classList.remove('hidden');
    summarySection.classList.add('fade-in');
  }
  if (invoicesSection) {
    invoicesSection.classList.remove('hidden');
    invoicesSection.classList.add('fade-in');
  }
}

/**
 * Set button loading state
 * @param {HTMLElement} button - Button element
 * @param {boolean} loading - Whether button is loading
 */
function setButtonLoading(button, loading) {
  if (!button) return;
  
  if (loading) {
    button.classList.add('loading');
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    button.disabled = false;
  }
}

/**
 * Render the complete dashboard with invoices and summary
 * @param {Array} invoices - Array of invoices with status
 * @param {Object} summary - Summary statistics object
 */
function renderDashboard(invoices, summary) {
  renderSummaryCards(summary);
  
  if (invoices.length === 0) {
    renderEmptyState();
  } else {
    renderInvoiceTable(invoices);
  }
}

/**
 * Render summary cards with formatted statistics
 * @param {Object} summary - Summary statistics object
 */
function renderSummaryCards(summary) {
  const totalOutstandingEl = document.getElementById('totalOutstanding');
  const overdueAmountEl = document.getElementById('overdueAmount');
  const dueThisWeekEl = document.getElementById('dueThisWeek');
  
  if (totalOutstandingEl) {
    totalOutstandingEl.textContent = formatCurrency(summary.totalOutstanding);
  }
  
  if (overdueAmountEl) {
    overdueAmountEl.textContent = formatCurrency(summary.overdueAmount);
  }
  
  if (dueThisWeekEl) {
    dueThisWeekEl.textContent = summary.dueThisWeek.toString();
  }
}

/**
 * Create a single invoice row element
 * @param {Object} invoice - Invoice object with status
 * @returns {HTMLElement} Table row element
 */
function createInvoiceRow(invoice) {
  const row = document.createElement('tr');
  row.className = 'hover:bg-gray-50 transition-colors';
  row.setAttribute('role', 'row');
  
  // Client Name
  const clientCell = document.createElement('td');
  clientCell.className = 'px-4 py-3 text-sm font-medium text-gray-900';
  clientCell.setAttribute('data-label', 'Client');
  clientCell.setAttribute('role', 'cell');
  clientCell.textContent = invoice.clientName;
  row.appendChild(clientCell);
  
  // Invoice Number
  const invoiceNumCell = document.createElement('td');
  invoiceNumCell.className = 'px-4 py-3 text-sm text-gray-700';
  invoiceNumCell.setAttribute('data-label', 'Invoice #');
  invoiceNumCell.setAttribute('role', 'cell');
  invoiceNumCell.textContent = invoice.invoiceNumber;
  row.appendChild(invoiceNumCell);
  
  // Amount (with late fee if applicable)
  const amountCell = document.createElement('td');
  amountCell.className = 'px-4 py-3 text-sm text-gray-900';
  amountCell.setAttribute('data-label', 'Amount');
  amountCell.setAttribute('role', 'cell');
  const amountText = formatCurrency(invoice.amount);
  
  if (invoice.lateFee > 0) {
    const lateFeeText = formatCurrency(invoice.lateFee);
    amountCell.innerHTML = `
      <div class="flex flex-col">
        <span class="font-medium">${amountText}</span>
        <span class="text-xs text-danger" aria-label="Plus ${lateFeeText} late fee">+ ${lateFeeText} late fee</span>
      </div>
    `;
    amountCell.setAttribute('aria-label', `${amountText} plus ${lateFeeText} late fee`);
  } else {
    amountCell.textContent = amountText;
  }
  row.appendChild(amountCell);
  
  // Due Date
  const dueDateCell = document.createElement('td');
  dueDateCell.className = 'px-4 py-3 text-sm text-gray-700';
  dueDateCell.setAttribute('data-label', 'Due Date');
  dueDateCell.setAttribute('role', 'cell');
  const formattedDate = formatDate(invoice.dueDate);
  
  if (invoice.daysOverdue > 0) {
    dueDateCell.innerHTML = `
      <div class="flex flex-col">
        <span>${formattedDate}</span>
        <span class="text-xs text-danger" aria-label="${invoice.daysOverdue} days overdue">${invoice.daysOverdue} days overdue</span>
      </div>
    `;
    dueDateCell.setAttribute('aria-label', `${formattedDate}, ${invoice.daysOverdue} days overdue`);
  } else {
    dueDateCell.innerHTML = `
      <div class="flex flex-col">
        <span>${formattedDate}</span>
      </div>
    `;
  }
  row.appendChild(dueDateCell);
  
  // Status Badge
  const statusCell = document.createElement('td');
  statusCell.className = 'px-4 py-3 text-sm';
  statusCell.setAttribute('data-label', 'Status');
  statusCell.setAttribute('role', 'cell');
  statusCell.appendChild(renderStatusBadge(invoice.statusBadge));
  row.appendChild(statusCell);
  
  // Actions
  const actionsCell = document.createElement('td');
  actionsCell.className = 'px-4 py-3 text-sm';
  actionsCell.setAttribute('data-label', 'Actions');
  actionsCell.setAttribute('role', 'cell');
  actionsCell.appendChild(renderActionButtons(invoice));
  row.appendChild(actionsCell);
  
  return row;
}

/**
 * Render invoice table with all columns and action buttons (optimized)
 * @param {Array} invoices - Array of invoices with status
 */
function renderInvoiceTable(invoices) {
  const tableBody = document.getElementById('invoicesTableBody');
  const emptyState = document.getElementById('emptyState');
  const table = document.getElementById('invoicesTable');
  
  if (!tableBody) return;
  
  // Hide empty state, show table
  if (emptyState) {
    emptyState.classList.add('hidden');
  }
  if (table) {
    table.classList.remove('hidden');
  }
  
  // Use batch DOM update for better performance
  batchDOMUpdate(() => {
    // Check if document is available (for test environment compatibility)
    if (typeof document === 'undefined') return;
    
    // Use document fragment for batch insertion
    const fragment = document.createDocumentFragment();
    
    // Create all rows
    invoices.forEach((invoice) => {
      const row = createInvoiceRow(invoice);
      fragment.appendChild(row);
    });
    
    // Clear and append in one operation
    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);
  });
}

/**
 * Render status badge with correct colors
 * @param {Object} statusBadge - Status badge object
 * @returns {HTMLElement} Badge element
 */
function renderStatusBadge(statusBadge) {
  const badge = document.createElement('span');
  badge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-label', `Status: ${statusBadge.label}`);
  
  // Apply color based on status badge color
  if (statusBadge.color === '#10B981') {
    badge.classList.add('bg-green-100', 'text-green-800');
  } else if (statusBadge.color === '#F59E0B') {
    badge.classList.add('bg-yellow-100', 'text-yellow-800');
  } else if (statusBadge.color === '#EF4444') {
    badge.classList.add('bg-red-100', 'text-red-800');
  } else {
    badge.classList.add('bg-gray-100', 'text-gray-800');
  }
  
  badge.innerHTML = `<span aria-hidden="true">${statusBadge.icon}</span> ${statusBadge.label}`;
  
  return badge;
}

/**
 * Render action buttons for an invoice
 * @param {Object} invoice - Invoice object
 * @returns {HTMLElement} Actions container
 */
function renderActionButtons(invoice) {
  const container = document.createElement('div');
  container.className = 'flex items-center gap-2';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', `Actions for invoice ${invoice.invoiceNumber}`);
  
  // Only show action buttons for pending invoices
  if (invoice.status === 'pending') {
    // Send Reminder Now button (manual trigger)
    const sendNowBtn = document.createElement('button');
    sendNowBtn.className = 'text-blue-600 hover:text-blue-800 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
    sendNowBtn.setAttribute('aria-label', `Send reminder now for invoice ${invoice.invoiceNumber}`);
    sendNowBtn.setAttribute('title', 'Send Reminder Now');
    sendNowBtn.setAttribute('data-action', 'sendNow');
    sendNowBtn.setAttribute('data-id', invoice.id);
    sendNowBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
      </svg>
    `;
    container.appendChild(sendNowBtn);
    
    // Pause/Resume Reminders button (toggle based on pause state)
    const pauseResumeBtn = document.createElement('button');
    const isPaused = invoice.remindersPaused || false;
    
    if (isPaused) {
      // Resume button
      pauseResumeBtn.className = 'text-green-600 hover:text-green-800 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2';
      pauseResumeBtn.setAttribute('aria-label', `Resume reminders for invoice ${invoice.invoiceNumber}`);
      pauseResumeBtn.setAttribute('title', 'Resume Reminders');
      pauseResumeBtn.setAttribute('data-action', 'resumeReminders');
      pauseResumeBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `;
    } else {
      // Pause button
      pauseResumeBtn.className = 'text-orange-600 hover:text-orange-800 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2';
      pauseResumeBtn.setAttribute('aria-label', `Pause reminders for invoice ${invoice.invoiceNumber}`);
      pauseResumeBtn.setAttribute('title', 'Pause Reminders');
      pauseResumeBtn.setAttribute('data-action', 'pauseReminders');
      pauseResumeBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `;
    }
    pauseResumeBtn.setAttribute('data-id', invoice.id);
    container.appendChild(pauseResumeBtn);
    
    // Reminder button (only for overdue) - kept for backward compatibility
    if (invoice.daysOverdue > 0) {
      const reminderBtn = document.createElement('button');
      reminderBtn.className = 'text-primary hover:text-blue-700 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2';
      reminderBtn.setAttribute('aria-label', `Send reminder for invoice ${invoice.invoiceNumber} to ${invoice.clientName}`);
      reminderBtn.setAttribute('title', 'Generate Reminder Message');
      reminderBtn.setAttribute('data-action', 'reminder');
      reminderBtn.setAttribute('data-id', invoice.id);
      reminderBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
      `;
      container.appendChild(reminderBtn);
    }
    
    // Mark Paid button
    const paidBtn = document.createElement('button');
    paidBtn.className = 'text-success hover:text-green-700 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2';
    paidBtn.setAttribute('aria-label', `Mark invoice ${invoice.invoiceNumber} as paid`);
    paidBtn.setAttribute('title', 'Mark as Paid');
    paidBtn.setAttribute('data-action', 'markPaid');
    paidBtn.setAttribute('data-id', invoice.id);
    paidBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `;
    container.appendChild(paidBtn);
    
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'text-gray-600 hover:text-gray-900 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2';
    editBtn.setAttribute('aria-label', `Edit invoice ${invoice.invoiceNumber}`);
    editBtn.setAttribute('title', 'Edit Invoice');
    editBtn.setAttribute('data-action', 'edit');
    editBtn.setAttribute('data-id', invoice.id);
    editBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
      </svg>
    `;
    container.appendChild(editBtn);
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'text-danger hover:text-red-700 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2';
    deleteBtn.setAttribute('aria-label', `Delete invoice ${invoice.invoiceNumber}`);
    deleteBtn.setAttribute('title', 'Delete Invoice');
    deleteBtn.setAttribute('data-action', 'delete');
    deleteBtn.setAttribute('data-id', invoice.id);
    deleteBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
      </svg>
    `;
    container.appendChild(deleteBtn);
  } else {
    // For paid/cancelled invoices, show view-only indicator
    const viewText = document.createElement('span');
    viewText.className = 'text-xs text-gray-500';
    viewText.textContent = 'No actions';
    viewText.setAttribute('aria-label', 'No actions available for this invoice');
    container.appendChild(viewText);
  }
  
  return container;
}

/**
 * Render empty state when no invoices exist
 */
function renderEmptyState() {
  const tableBody = document.getElementById('invoicesTableBody');
  const emptyState = document.getElementById('emptyState');
  const table = document.getElementById('invoicesTable');
  
  if (tableBody) {
    tableBody.innerHTML = '';
  }
  
  if (table) {
    table.classList.add('hidden');
  }
  
  if (emptyState) {
    emptyState.classList.remove('hidden');
  }
}

/**
 * Show add/edit invoice modal
 * @param {Object} invoice - Invoice object for editing (optional)
 */
function showInvoiceModal(invoice = null) {
  const modal = document.getElementById('invoiceModal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('invoiceForm');
  
  if (!modal || !form) return;
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
  
  // Set modal title
  if (modalTitle) {
    modalTitle.textContent = invoice ? '✏️ Edit Invoice' : '✨ Create New Invoice';
  }
  
  // Pre-fill form if editing
  if (invoice) {
    document.getElementById('clientName').value = invoice.clientName || '';
    document.getElementById('clientEmail').value = invoice.email || '';
    document.getElementById('clientPhone').value = invoice.phone || '';
    document.getElementById('amount').value = invoice.amount || '';
    document.getElementById('dueDate').value = formatDateForInput(invoice.dueDate) || '';
    document.getElementById('paymentMethod').value = invoice.paymentMethod || '';
    document.getElementById('notes').value = invoice.notes || '';
    
    // Store invoice ID for editing
    form.setAttribute('data-edit-id', invoice.id);
  } else {
    // Reset form for new invoice
    form.reset();
    form.removeAttribute('data-edit-id');
    
    // Set default due date to +14 days
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 14);
    document.getElementById('dueDate').value = formatDateForInput(defaultDueDate.toISOString());
  }
  
  // Clear any error messages
  clearFormErrors();
  
  // Show modal with fade-in animation
  modal.classList.remove('hidden');
  
  // Add fade-in animation to modal content
  const modalContent = modal.querySelector('.inline-block');
  if (modalContent) {
    modalContent.classList.add('fade-in-scale');
  }
  
  // Set up keyboard navigation
  setupModalKeyboardNavigation(modal);
  
  // Focus first input
  setTimeout(() => {
    document.getElementById('clientName')?.focus();
  }, 100);
}

/**
 * Hide invoice modal
 */
function hideInvoiceModal() {
  const modal = document.getElementById('invoiceModal');
  const form = document.getElementById('invoiceForm');
  const modalContent = modal?.querySelector('.inline-block');
  
  // Restore body scroll
  document.body.style.overflow = '';
  
  // Remove animation class
  if (modalContent) {
    modalContent.classList.remove('fade-in-scale');
  }
  
  if (modal) {
    modal.classList.add('hidden');
    // Remove keyboard navigation handler
    removeModalKeyboardNavigation(modal);
  }
  
  if (form) {
    form.reset();
    form.removeAttribute('data-edit-id');
  }
  
  clearFormErrors();
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
}

/**
 * Show reminder modal with generated message
 * @param {string} reminderText - Generated reminder message
 */
function showReminderModal(reminderText) {
  const modal = document.getElementById('reminderModal');
  const textarea = document.getElementById('reminderText');
  
  if (!modal || !textarea) return;
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
  
  textarea.value = reminderText;
  modal.classList.remove('hidden');
  
  // Add fade-in animation to modal content
  const modalContent = modal.querySelector('.inline-block');
  if (modalContent) {
    modalContent.classList.add('fade-in-scale');
  }
  
  // Set up keyboard navigation
  setupModalKeyboardNavigation(modal);
  
  // Focus the copy button
  setTimeout(() => {
    document.getElementById('copyReminderBtn')?.focus();
  }, 100);
}

/**
 * Hide reminder modal
 */
function hideReminderModal() {
  const modal = document.getElementById('reminderModal');
  const modalContent = modal?.querySelector('.inline-block');
  
  // Restore body scroll
  document.body.style.overflow = '';
  
  // Remove animation class
  if (modalContent) {
    modalContent.classList.remove('fade-in-scale');
  }
  
  if (modal) {
    modal.classList.add('hidden');
    // Remove keyboard navigation handler
    removeModalKeyboardNavigation(modal);
  }
}

/**
 * Show confirmation dialog
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
function showConfirmDialog(message) {
  return new Promise((resolve) => {
    const confirmed = confirm(message);
    resolve(confirmed);
  });
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type: 'success', 'error', or 'info'
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-x-0 opacity-100';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  // Set color based on type
  if (type === 'success') {
    toast.classList.add('bg-success');
  } else if (type === 'error') {
    toast.classList.add('bg-danger');
  } else {
    toast.classList.add('bg-primary');
  }
  
  // Add icon based on type
  let icon = '';
  let iconLabel = '';
  if (type === 'success') {
    iconLabel = 'Success';
    icon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>`;
  } else if (type === 'error') {
    iconLabel = 'Error';
    icon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>`;
  } else {
    iconLabel = 'Information';
    icon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>`;
  }
  
  toast.innerHTML = `
    <span aria-label="${iconLabel}">${icon}</span>
    <span class="flex-1">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(400px)';
    toast.style.opacity = '0';
    
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

/**
 * Copy text to clipboard with user feedback
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function copyToClipboard(text) {
  try {
    // Try using modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!', 'success');
      return true;
    }
    
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    if (success) {
      showToast('Copied to clipboard!', 'success');
      return true;
    } else {
      // Show manual copy instructions if clipboard API fails
      showManualCopyInstructions(text);
      return false;
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    // Show manual copy instructions if an error occurs
    showManualCopyInstructions(text);
    return false;
  }
}

/**
 * Show manual copy instructions when clipboard API is unavailable
 * @param {string} text - Text that needs to be copied
 */
function showManualCopyInstructions(text) {
  showToast('Please manually select and copy the text (Ctrl+C or Cmd+C)', 'info');
}

/**
 * Set up keyboard navigation for modal (ESC to close, focus trapping)
 * @param {HTMLElement} modal - Modal element
 */
function setupModalKeyboardNavigation(modal) {
  if (!modal) return;
  
  // Store the element that had focus before modal opened
  modal._previousFocus = document.activeElement;
  
  // ESC key handler
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      
      // Determine which modal this is and call appropriate hide function
      if (modal.id === 'invoiceModal') {
        hideInvoiceModal();
      } else if (modal.id === 'reminderModal') {
        hideReminderModal();
      } else if (modal.id === 'settingsModal') {
        hideSettingsModal();
      }
    }
  };
  
  // Focus trap handler
  const focusTrapHandler = (e) => {
    if (e.key !== 'Tab') return;
    
    const modalContent = modal.querySelector('.inline-block');
    if (!modalContent) return;
    
    // Get all focusable elements within the modal
    const focusableElements = modalContent.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    // If shift+tab on first element, go to last
    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    }
    // If tab on last element, go to first
    else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  };
  
  // Store handlers on modal for later removal
  modal._escHandler = escHandler;
  modal._focusTrapHandler = focusTrapHandler;
  
  // Add event listeners
  document.addEventListener('keydown', escHandler);
  document.addEventListener('keydown', focusTrapHandler);
}

/**
 * Remove keyboard navigation handlers from modal
 * @param {HTMLElement} modal - Modal element
 */
function removeModalKeyboardNavigation(modal) {
  if (!modal) return;
  
  // Remove event listeners
  if (modal._escHandler) {
    document.removeEventListener('keydown', modal._escHandler);
    modal._escHandler = null;
  }
  
  if (modal._focusTrapHandler) {
    document.removeEventListener('keydown', modal._focusTrapHandler);
    modal._focusTrapHandler = null;
  }
  
  // Restore focus to previous element
  if (modal._previousFocus && typeof modal._previousFocus.focus === 'function') {
    modal._previousFocus.focus();
    modal._previousFocus = null;
  }
}

/**
 * Show settings modal with current settings
 * @param {Object} paymentSettings - Current payment settings
 * @param {Object} lateFeeConfig - Current late fee configuration
 */
function showSettingsModal(paymentSettings, lateFeeConfig) {
  const modal = document.getElementById('settingsModal');
  const form = document.getElementById('settingsForm');
  
  if (!modal || !form) return;
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
  
  // Pre-fill form with current settings
  document.getElementById('userName').value = paymentSettings.userName || '';
  document.getElementById('upiId').value = paymentSettings.upiId || '';
  document.getElementById('bankDetails').value = paymentSettings.bankDetails || '';
  document.getElementById('paypalEmail').value = paymentSettings.paypalEmail || '';
  
  document.getElementById('lateFeeEnabled').checked = lateFeeConfig.enabled !== false;
  document.getElementById('lateFeePercentage').value = lateFeeConfig.percentagePerWeek || 1.0;
  
  // Show modal with fade-in animation
  modal.classList.remove('hidden');
  
  // Add fade-in animation to modal content
  const modalContent = modal.querySelector('.inline-block');
  if (modalContent) {
    modalContent.classList.add('fade-in-scale');
  }
  
  // Set up keyboard navigation
  setupModalKeyboardNavigation(modal);
  
  // Focus first input
  setTimeout(() => {
    document.getElementById('userName')?.focus();
  }, 100);
}

/**
 * Hide settings modal
 */
function hideSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const form = document.getElementById('settingsForm');
  const modalContent = modal?.querySelector('.inline-block');
  
  // Restore body scroll
  document.body.style.overflow = '';
  
  // Remove animation class
  if (modalContent) {
    modalContent.classList.remove('fade-in-scale');
  }
  
  if (modal) {
    modal.classList.add('hidden');
    // Remove keyboard navigation handler
    removeModalKeyboardNavigation(modal);
  }
  
  if (form) {
    form.reset();
  }
}

// Export functions for use in other modules (ES6 modules)
export {
  renderDashboard,
  renderSummaryCards,
  renderInvoiceTable,
  renderEmptyState,
  renderStatusBadge,
  createInvoiceRow,
  showInvoiceModal,
  hideInvoiceModal,
  showReminderModal,
  hideReminderModal,
  showSettingsModal,
  hideSettingsModal,
  showConfirmDialog,
  showToast,
  copyToClipboard,
  showManualCopyInstructions,
  showLoading,
  hideLoading,
  showSkeletonScreen,
  hideSkeletonScreen,
  setButtonLoading,
  setupModalKeyboardNavigation,
  removeModalKeyboardNavigation
};
