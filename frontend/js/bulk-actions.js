/**
 * Bulk Actions Module - Perform actions on multiple invoices
 */

import { updateInvoice, deleteInvoice } from './invoice.js';
import { saveInvoices } from './storage.js';
import { showToast, showConfirmDialog } from './ui.js';

/**
 * Bulk mark invoices as paid
 * @param {Array} invoices - All invoices
 * @param {Array} selectedIds - IDs of invoices to mark as paid
 * @returns {Array} Updated invoices array
 */
export async function bulkMarkPaid(invoices, selectedIds) {
  if (selectedIds.length === 0) {
    showToast('No invoices selected', 'info');
    return invoices;
  }
  
  const confirmed = await showConfirmDialog(
    `Mark ${selectedIds.length} invoice(s) as paid?`
  );
  
  if (!confirmed) return invoices;
  
  let updatedInvoices = [...invoices];
  
  selectedIds.forEach(id => {
    const index = updatedInvoices.findIndex(inv => inv.id === id);
    if (index !== -1) {
      updatedInvoices[index] = updateInvoice(updatedInvoices[index], { 
        status: 'paid',
        paidDate: new Date().toISOString()
      });
    }
  });
  
  const result = saveInvoices(updatedInvoices);
  if (result.success) {
    showToast(`${selectedIds.length} invoice(s) marked as paid`, 'success');
    return updatedInvoices;
  } else {
    showToast('Failed to update invoices', 'error');
    return invoices;
  }
}

/**
 * Bulk delete invoices
 * @param {Array} invoices - All invoices
 * @param {Array} selectedIds - IDs of invoices to delete
 * @returns {Array} Updated invoices array
 */
export async function bulkDelete(invoices, selectedIds) {
  if (selectedIds.length === 0) {
    showToast('No invoices selected', 'info');
    return invoices;
  }
  
  const confirmed = await showConfirmDialog(
    `Delete ${selectedIds.length} invoice(s)? This action cannot be undone.`
  );
  
  if (!confirmed) return invoices;
  
  let updatedInvoices = [...invoices];
  
  selectedIds.forEach(id => {
    updatedInvoices = deleteInvoice(updatedInvoices, id);
  });
  
  const result = saveInvoices(updatedInvoices);
  if (result.success) {
    showToast(`${selectedIds.length} invoice(s) deleted`, 'success');
    return updatedInvoices;
  } else {
    showToast('Failed to delete invoices', 'error');
    return invoices;
  }
}

/**
 * Bulk send reminders
 * @param {Array} invoices - All invoices
 * @param {Array} selectedIds - IDs of invoices to send reminders for
 * @returns {Array} Updated invoices array
 */
export async function bulkSendReminders(invoices, selectedIds) {
  if (selectedIds.length === 0) {
    showToast('No invoices selected', 'info');
    return invoices;
  }
  
  const confirmed = await showConfirmDialog(
    `Send reminders for ${selectedIds.length} invoice(s)?`
  );
  
  if (!confirmed) return invoices;
  
  let updatedInvoices = [...invoices];
  
  selectedIds.forEach(id => {
    const index = updatedInvoices.findIndex(inv => inv.id === id);
    if (index !== -1) {
      updatedInvoices[index] = updateInvoice(updatedInvoices[index], { 
        reminderSent: true,
        lastReminderDate: new Date().toISOString()
      });
    }
  });
  
  const result = saveInvoices(updatedInvoices);
  if (result.success) {
    showToast(`Reminders sent for ${selectedIds.length} invoice(s)`, 'success');
    return updatedInvoices;
  } else {
    showToast('Failed to send reminders', 'error');
    return invoices;
  }
}

/**
 * Bulk update due dates
 * @param {Array} invoices - All invoices
 * @param {Array} selectedIds - IDs of invoices to update
 * @param {number} daysToAdd - Number of days to add to due date
 * @returns {Array} Updated invoices array
 */
export async function bulkUpdateDueDate(invoices, selectedIds, daysToAdd) {
  if (selectedIds.length === 0) {
    showToast('No invoices selected', 'info');
    return invoices;
  }
  
  const confirmed = await showConfirmDialog(
    `Extend due date by ${daysToAdd} days for ${selectedIds.length} invoice(s)?`
  );
  
  if (!confirmed) return invoices;
  
  let updatedInvoices = [...invoices];
  
  selectedIds.forEach(id => {
    const index = updatedInvoices.findIndex(inv => inv.id === id);
    if (index !== -1) {
      const currentDueDate = new Date(updatedInvoices[index].dueDate);
      currentDueDate.setDate(currentDueDate.getDate() + daysToAdd);
      
      updatedInvoices[index] = updateInvoice(updatedInvoices[index], { 
        dueDate: currentDueDate.toISOString()
      });
    }
  });
  
  const result = saveInvoices(updatedInvoices);
  if (result.success) {
    showToast(`Due dates updated for ${selectedIds.length} invoice(s)`, 'success');
    return updatedInvoices;
  } else {
    showToast('Failed to update due dates', 'error');
    return invoices;
  }
}

/**
 * Select all invoices matching filter
 * @param {Array} invoices - Filtered invoices
 * @returns {Array} Array of invoice IDs
 */
export function selectAll(invoices) {
  return invoices.map(inv => inv.id);
}

/**
 * Deselect all invoices
 * @returns {Array} Empty array
 */
export function deselectAll() {
  return [];
}

/**
 * Toggle invoice selection
 * @param {Array} selectedIds - Currently selected IDs
 * @param {string} id - ID to toggle
 * @returns {Array} Updated selected IDs
 */
export function toggleSelection(selectedIds, id) {
  if (selectedIds.includes(id)) {
    return selectedIds.filter(selectedId => selectedId !== id);
  } else {
    return [...selectedIds, id];
  }
}

export default {
  bulkMarkPaid,
  bulkDelete,
  bulkSendReminders,
  bulkUpdateDueDate,
  selectAll,
  deselectAll,
  toggleSelection
};
