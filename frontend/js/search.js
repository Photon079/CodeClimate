/**
 * Search and Filter Module - Search and filter invoices
 */

/**
 * Search invoices by query string
 * @param {Array} invoices - Array of invoices
 * @param {string} query - Search query
 * @returns {Array} Filtered invoices
 */
export function searchInvoices(invoices, query) {
  if (!query || query.trim() === '') {
    return invoices;
  }

  const searchTerm = query.toLowerCase().trim();

  return invoices.filter(invoice => {
    return (
      invoice.clientName.toLowerCase().includes(searchTerm) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm) ||
      invoice.amount.toString().includes(searchTerm) ||
      (invoice.notes && invoice.notes.toLowerCase().includes(searchTerm))
    );
  });
}

/**
 * Filter invoices by status
 * @param {Array} invoices - Array of invoices with status
 * @param {string} statusFilter - Status to filter by ('all', 'paid', 'pending', 'overdue', 'due-soon')
 * @returns {Array} Filtered invoices
 */
export function filterByStatus(invoices, statusFilter) {
  if (!statusFilter || statusFilter === 'all') {
    return invoices;
  }

  return invoices.filter(invoice => {
    const status = invoice.statusBadge?.label?.toLowerCase() || '';
    
    switch (statusFilter) {
      case 'paid':
        return invoice.status === 'paid';
      case 'overdue':
        return status.includes('overdue');
      case 'due-soon':
        return status.includes('due soon');
      case 'not-due':
        return status.includes('not due');
      case 'pending':
        return invoice.status === 'pending';
      default:
        return true;
    }
  });
}

/**
 * Filter invoices by date range
 * @param {Array} invoices - Array of invoices
 * @param {string} startDate - Start date (ISO string)
 * @param {string} endDate - End date (ISO string)
 * @returns {Array} Filtered invoices
 */
export function filterByDateRange(invoices, startDate, endDate) {
  if (!startDate && !endDate) {
    return invoices;
  }

  return invoices.filter(invoice => {
    const dueDate = new Date(invoice.dueDate);
    
    if (startDate && endDate) {
      return dueDate >= new Date(startDate) && dueDate <= new Date(endDate);
    } else if (startDate) {
      return dueDate >= new Date(startDate);
    } else {
      return dueDate <= new Date(endDate);
    }
  });
}

/**
 * Sort invoices by field
 * @param {Array} invoices - Array of invoices
 * @param {string} field - Field to sort by
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Array} Sorted invoices
 */
export function sortInvoices(invoices, field, direction = 'asc') {
  const sorted = [...invoices].sort((a, b) => {
    let aVal, bVal;

    switch (field) {
      case 'client':
        aVal = a.clientName.toLowerCase();
        bVal = b.clientName.toLowerCase();
        break;
      case 'amount':
        aVal = a.amount;
        bVal = b.amount;
        break;
      case 'dueDate':
        aVal = new Date(a.dueDate);
        bVal = new Date(b.dueDate);
        break;
      case 'invoiceNumber':
        aVal = a.invoiceNumber;
        bVal = b.invoiceNumber;
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Apply all filters and search
 * @param {Array} invoices - Array of invoices
 * @param {Object} filters - Filter options
 * @returns {Array} Filtered and sorted invoices
 */
export function applyFilters(invoices, filters = {}) {
  let result = invoices;

  // Apply search
  if (filters.search) {
    result = searchInvoices(result, filters.search);
  }

  // Apply status filter
  if (filters.status) {
    result = filterByStatus(result, filters.status);
  }

  // Apply date range filter
  if (filters.startDate || filters.endDate) {
    result = filterByDateRange(result, filters.startDate, filters.endDate);
  }

  // Apply sorting
  if (filters.sortBy) {
    result = sortInvoices(result, filters.sortBy, filters.sortDirection);
  }

  return result;
}
