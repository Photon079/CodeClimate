/**
 * Reminder History Module
 * Handles reminder history viewing, filtering, and display
 */

import { formatCurrency, formatDate, formatDateTime } from './formatter.js';
import { showToast, showLoading, hideLoading } from './ui.js';

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Fetch reminder logs from the backend
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of reminder logs
 */
async function fetchReminderLogs(filters = {}) {
  try {
    const params = new URLSearchParams();
    
    if (filters.channel) params.append('channel', filters.channel);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const response = await fetch(`${API_BASE_URL}/reminder-logs?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch reminder logs: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching reminder logs:', error);
    throw error;
  }
}

/**
 * Fetch reminder logs for a specific invoice
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object>} Reminder logs with summary
 */
async function fetchInvoiceReminderLogs(invoiceId) {
  try {
    const response = await fetch(`${API_BASE_URL}/reminder-logs/${invoiceId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch invoice reminder logs: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching invoice reminder logs:', error);
    throw error;
  }
}

/**
 * Show the reminder history modal
 */
function showReminderHistoryModal() {
  const modal = document.getElementById('reminderHistoryModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    
    // Load initial data
    loadReminderHistory();
  }
}

/**
 * Hide the reminder history modal
 */
function hideReminderHistoryModal() {
  const modal = document.getElementById('reminderHistoryModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }
}

/**
 * Load and display reminder history
 * @param {Object} filters - Filter options
 */
async function loadReminderHistory(filters = {}) {
  const tableBody = document.getElementById('reminderHistoryTableBody');
  const emptyState = document.getElementById('reminderHistoryEmptyState');
  
  if (!tableBody) return;
  
  try {
    showLoading('Loading reminder history...');
    
    const logs = await fetchReminderLogs(filters);
    
    hideLoading();
    
    if (logs.length === 0) {
      tableBody.innerHTML = '';
      if (emptyState) {
        emptyState.classList.remove('hidden');
      }
    } else {
      if (emptyState) {
        emptyState.classList.add('hidden');
      }
      renderReminderHistoryTable(logs);
    }
  } catch (error) {
    hideLoading();
    showToast('Failed to load reminder history', 'error');
    console.error('Error loading reminder history:', error);
  }
}

/**
 * Render reminder history table
 * @param {Array} logs - Array of reminder logs
 */
function renderReminderHistoryTable(logs) {
  const tableBody = document.getElementById('reminderHistoryTableBody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  logs.forEach(log => {
    const row = createReminderHistoryRow(log);
    tableBody.appendChild(row);
  });
}

/**
 * Create a reminder history table row
 * @param {Object} log - Reminder log object
 * @returns {HTMLElement} Table row element
 */
function createReminderHistoryRow(log) {
  const row = document.createElement('tr');
  row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
  
  // Date/Time
  const dateCell = document.createElement('td');
  dateCell.className = 'px-4 py-3 text-sm text-gray-900 dark:text-gray-100';
  dateCell.textContent = formatDateTime(log.sentAt);
  row.appendChild(dateCell);
  
  // Invoice ID (shortened)
  const invoiceCell = document.createElement('td');
  invoiceCell.className = 'px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono';
  invoiceCell.textContent = log.invoiceId.substring(0, 8) + '...';
  invoiceCell.title = log.invoiceId;
  row.appendChild(invoiceCell);
  
  // Channel
  const channelCell = document.createElement('td');
  channelCell.className = 'px-4 py-3 text-sm';
  const channelBadge = document.createElement('span');
  channelBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    log.channel === 'email' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  }`;
  channelBadge.textContent = log.channel === 'email' ? '📧 Email' : '📱 SMS';
  channelCell.appendChild(channelBadge);
  row.appendChild(channelCell);
  
  // Status
  const statusCell = document.createElement('td');
  statusCell.className = 'px-4 py-3 text-sm';
  const statusBadge = document.createElement('span');
  let statusClass = '';
  let statusText = '';
  
  switch (log.status) {
    case 'sent':
      statusClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      statusText = '✓ Sent';
      break;
    case 'failed':
      statusClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      statusText = '✗ Failed';
      break;
    case 'pending':
      statusClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      statusText = '⏳ Pending';
      break;
    default:
      statusClass = 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      statusText = log.status;
  }
  
  statusBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`;
  statusBadge.textContent = statusText;
  statusCell.appendChild(statusBadge);
  row.appendChild(statusCell);
  
  // Escalation Level
  const escalationCell = document.createElement('td');
  escalationCell.className = 'px-4 py-3 text-sm';
  const escalationBadge = document.createElement('span');
  let escalationClass = '';
  let escalationText = '';
  
  switch (log.escalationLevel) {
    case 'gentle':
      escalationClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      escalationText = '😊 Gentle';
      break;
    case 'firm':
      escalationClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      escalationText = '📋 Firm';
      break;
    case 'urgent':
      escalationClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      escalationText = '🚨 Urgent';
      break;
    default:
      escalationClass = 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      escalationText = log.escalationLevel;
  }
  
  escalationBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${escalationClass}`;
  escalationBadge.textContent = escalationText;
  escalationCell.appendChild(escalationBadge);
  row.appendChild(escalationCell);
  
  // Cost
  const costCell = document.createElement('td');
  costCell.className = 'px-4 py-3 text-sm text-gray-900 dark:text-gray-100';
  costCell.textContent = log.cost ? formatCurrency(log.cost) : '-';
  row.appendChild(costCell);
  
  // Actions
  const actionsCell = document.createElement('td');
  actionsCell.className = 'px-4 py-3 text-sm text-right';
  
  const viewBtn = document.createElement('button');
  viewBtn.className = 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium';
  viewBtn.textContent = 'View';
  viewBtn.onclick = () => showReminderMessageModal(log);
  
  actionsCell.appendChild(viewBtn);
  row.appendChild(actionsCell);
  
  return row;
}

/**
 * Show reminder message in a modal
 * @param {Object} log - Reminder log object
 */
function showReminderMessageModal(log) {
  const modal = document.getElementById('reminderMessageModal');
  const messageContent = document.getElementById('reminderMessageContent');
  const messageMetadata = document.getElementById('reminderMessageMetadata');
  
  if (!modal || !messageContent) return;
  
  // Set message content
  messageContent.textContent = log.message;
  
  // Set metadata
  if (messageMetadata) {
    const metadata = `
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="font-semibold">Channel:</span> ${log.channel === 'email' ? '📧 Email' : '📱 SMS'}
        </div>
        <div>
          <span class="font-semibold">Status:</span> ${log.status}
        </div>
        <div>
          <span class="font-semibold">Sent:</span> ${formatDateTime(log.sentAt)}
        </div>
        <div>
          <span class="font-semibold">Escalation:</span> ${log.escalationLevel}
        </div>
        ${log.deliveredAt ? `<div><span class="font-semibold">Delivered:</span> ${formatDateTime(log.deliveredAt)}</div>` : ''}
        ${log.cost ? `<div><span class="font-semibold">Cost:</span> ${formatCurrency(log.cost)}</div>` : ''}
        ${log.error ? `<div class="col-span-2"><span class="font-semibold text-red-600">Error:</span> ${log.error}</div>` : ''}
      </div>
    `;
    messageMetadata.innerHTML = metadata;
  }
  
  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

/**
 * Hide reminder message modal
 */
function hideReminderMessageModal() {
  const modal = document.getElementById('reminderMessageModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

/**
 * Apply filters to reminder history
 */
function applyReminderHistoryFilters() {
  const channelFilter = document.getElementById('reminderChannelFilter')?.value;
  const statusFilter = document.getElementById('reminderStatusFilter')?.value;
  const startDate = document.getElementById('reminderStartDate')?.value;
  const endDate = document.getElementById('reminderEndDate')?.value;
  
  const filters = {};
  
  if (channelFilter && channelFilter !== 'all') {
    filters.channel = channelFilter;
  }
  
  if (statusFilter && statusFilter !== 'all') {
    filters.status = statusFilter;
  }
  
  if (startDate) {
    filters.startDate = startDate;
  }
  
  if (endDate) {
    filters.endDate = endDate;
  }
  
  loadReminderHistory(filters);
}

/**
 * Clear all filters
 */
function clearReminderHistoryFilters() {
  const channelFilter = document.getElementById('reminderChannelFilter');
  const statusFilter = document.getElementById('reminderStatusFilter');
  const startDate = document.getElementById('reminderStartDate');
  const endDate = document.getElementById('reminderEndDate');
  
  if (channelFilter) channelFilter.value = 'all';
  if (statusFilter) statusFilter.value = 'all';
  if (startDate) startDate.value = '';
  if (endDate) endDate.value = '';
  
  loadReminderHistory();
}

/**
 * Setup event listeners for reminder history
 */
function setupReminderHistoryListeners() {
  // Open reminder history button
  const openBtn = document.getElementById('reminderHistoryBtn');
  if (openBtn) {
    openBtn.addEventListener('click', showReminderHistoryModal);
  }
  
  // Close buttons
  const closeBtn = document.getElementById('closeReminderHistoryBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideReminderHistoryModal);
  }
  
  const cancelBtn = document.getElementById('cancelReminderHistoryBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideReminderHistoryModal);
  }
  
  // Close message modal buttons
  const closeMessageBtn = document.getElementById('closeReminderMessageBtn');
  if (closeMessageBtn) {
    closeMessageBtn.addEventListener('click', hideReminderMessageModal);
  }
  
  // Filter buttons
  const applyFiltersBtn = document.getElementById('applyReminderFiltersBtn');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', applyReminderHistoryFilters);
  }
  
  const clearFiltersBtn = document.getElementById('clearReminderFiltersBtn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearReminderHistoryFilters);
  }
  
  // Close on backdrop click
  const modal = document.getElementById('reminderHistoryModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideReminderHistoryModal();
      }
    });
  }
  
  const messageModal = document.getElementById('reminderMessageModal');
  if (messageModal) {
    messageModal.addEventListener('click', (e) => {
      if (e.target === messageModal) {
        hideReminderMessageModal();
      }
    });
  }
}

export {
  fetchReminderLogs,
  fetchInvoiceReminderLogs,
  showReminderHistoryModal,
  hideReminderHistoryModal,
  loadReminderHistory,
  setupReminderHistoryListeners
};
