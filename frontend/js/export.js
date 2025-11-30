/**
 * Export Module - Export invoices to various formats
 */

import { formatCurrency, formatDate } from './formatter.js';

/**
 * Export invoices to CSV format
 * @param {Array} invoices - Array of invoices
 */
export function exportToCSV(invoices) {
  const headers = ['Invoice Number', 'Client Name', 'Amount (₹)', 'Due Date', 'Status', 'Payment Method', 'Notes', 'Created Date'];
  
  const rows = invoices.map(inv => [
    inv.invoiceNumber,
    inv.clientName,
    inv.amount,
    formatDate(inv.dueDate),
    inv.status,
    inv.paymentMethod,
    (inv.notes || '').replace(/,/g, ';'), // Replace commas to avoid CSV issues
    formatDate(inv.createdDate)
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  downloadFile(csvContent, `invoices-${getDateString()}.csv`, 'text/csv');
}

/**
 * Export invoices to JSON format
 * @param {Array} invoices - Array of invoices
 */
export function exportToJSON(invoices) {
  const jsonContent = JSON.stringify(invoices, null, 2);
  downloadFile(jsonContent, `invoices-${getDateString()}.json`, 'application/json');
}

/**
 * Export summary report
 * @param {Array} invoices - Array of invoices
 * @param {Object} summary - Summary statistics
 */
export function exportSummaryReport(invoices, summary) {
  const report = `
INVOICE GUARD - SUMMARY REPORT
Generated: ${new Date().toLocaleString()}
================================

FINANCIAL SUMMARY
-----------------
Total Outstanding: ${formatCurrency(summary.totalOutstanding)}
Overdue Amount: ${formatCurrency(summary.overdueAmount)}
Due This Week: ${summary.dueThisWeek} invoices
Total Invoices: ${summary.totalInvoices}
Paid Invoices: ${summary.paidInvoices}

INVOICE BREAKDOWN
-----------------
${invoices.map(inv => `
${inv.invoiceNumber} - ${inv.clientName}
Amount: ${formatCurrency(inv.amount)}
Due Date: ${formatDate(inv.dueDate)}
Status: ${inv.status.toUpperCase()}
${inv.notes ? 'Notes: ' + inv.notes : ''}
`).join('\n---\n')}

================================
End of Report
  `.trim();
  
  downloadFile(report, `invoice-report-${getDateString()}.txt`, 'text/plain');
}

/**
 * Import invoices from CSV
 * @param {File} file - CSV file
 * @returns {Promise<Array>} Parsed invoices
 */
export function importFromCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        
        const invoices = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',');
            return {
              id: crypto.randomUUID(),
              invoiceNumber: values[0],
              clientName: values[1],
              amount: parseFloat(values[2]),
              dueDate: values[3],
              status: values[4] || 'pending',
              paymentMethod: values[5] || 'Other',
              notes: values[6] || '',
              createdDate: values[7] || new Date().toISOString(),
              reminderSent: false,
              lateFee: 0
            };
          });
        
        resolve(invoices);
      } catch (error) {
        reject(new Error('Failed to parse CSV file: ' + error.message));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Import invoices from JSON
 * @param {File} file - JSON file
 * @returns {Promise<Array>} Parsed invoices
 */
export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const invoices = JSON.parse(e.target.result);
        
        // Validate structure
        if (!Array.isArray(invoices)) {
          throw new Error('Invalid JSON format: expected an array');
        }
        
        // Ensure all invoices have required fields
        const validInvoices = invoices.map(inv => ({
          id: inv.id || crypto.randomUUID(),
          invoiceNumber: inv.invoiceNumber,
          clientName: inv.clientName,
          amount: inv.amount,
          dueDate: inv.dueDate,
          status: inv.status || 'pending',
          paymentMethod: inv.paymentMethod || 'Other',
          notes: inv.notes || '',
          createdDate: inv.createdDate || new Date().toISOString(),
          reminderSent: inv.reminderSent || false,
          lateFee: inv.lateFee || 0
        }));
        
        resolve(validInvoices);
      } catch (error) {
        reject(new Error('Failed to parse JSON file: ' + error.message));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Download file helper
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get formatted date string for filenames
 * @returns {string} Date string (YYYY-MM-DD)
 */
function getDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Show export menu
 * @param {Array} invoices - Array of invoices
 * @param {Object} summary - Summary statistics
 */
export function showExportMenu(invoices, summary) {
  const menu = document.createElement('div');
  menu.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
  menu.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
      <h3 class="text-lg font-semibold mb-4 dark:text-white">Export Data</h3>
      <div class="space-y-3">
        <button id="exportCSVBtn" class="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          Export to CSV
        </button>
        <button id="exportJSONBtn" class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
          </svg>
          Export to JSON
        </button>
        <button id="exportReportBtn" class="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          Export Summary Report
        </button>
        <button id="closeExportBtn" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(menu);
  
  // Event listeners
  document.getElementById('exportCSVBtn').addEventListener('click', () => {
    exportToCSV(invoices);
    document.body.removeChild(menu);
  });
  
  document.getElementById('exportJSONBtn').addEventListener('click', () => {
    exportToJSON(invoices);
    document.body.removeChild(menu);
  });
  
  document.getElementById('exportReportBtn').addEventListener('click', () => {
    exportSummaryReport(invoices, summary);
    document.body.removeChild(menu);
  });
  
  document.getElementById('closeExportBtn').addEventListener('click', () => {
    document.body.removeChild(menu);
  });
  
  // Close on backdrop click
  menu.addEventListener('click', (e) => {
    if (e.target === menu) {
      document.body.removeChild(menu);
    }
  });
}
