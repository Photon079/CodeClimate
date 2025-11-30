/**
 * Quick Actions Module - Command palette for quick actions
 */

/**
 * Show quick actions command palette
 * @param {Object} handlers - Action handlers
 */
export function showQuickActions(handlers) {
  const modal = document.createElement('div');
  modal.id = 'quickActionsModal';
  modal.className = 'fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black bg-opacity-50 backdrop-blur-sm';
  
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="relative">
          <svg class="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input 
            type="text" 
            id="quickActionsSearch"
            placeholder="Type a command or search..."
            class="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            autofocus
          />
        </div>
      </div>
      <div id="quickActionsResults" class="max-h-96 overflow-y-auto">
        <!-- Results will be inserted here -->
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const searchInput = document.getElementById('quickActionsSearch');
  const resultsContainer = document.getElementById('quickActionsResults');
  
  const actions = [
    { 
      id: 'new-invoice', 
      title: 'New Invoice', 
      description: 'Create a new invoice',
      icon: '➕',
      keywords: ['new', 'create', 'add', 'invoice'],
      handler: handlers.newInvoice
    },
    { 
      id: 'export-csv', 
      title: 'Export to CSV', 
      description: 'Export all invoices to CSV',
      icon: '📊',
      keywords: ['export', 'csv', 'download'],
      handler: handlers.exportCSV
    },
    { 
      id: 'export-json', 
      title: 'Export to JSON', 
      description: 'Export all invoices to JSON',
      icon: '📄',
      keywords: ['export', 'json', 'download'],
      handler: handlers.exportJSON
    },
    { 
      id: 'settings', 
      title: 'Settings', 
      description: 'Open settings',
      icon: '⚙️',
      keywords: ['settings', 'preferences', 'config'],
      handler: handlers.openSettings
    },
    { 
      id: 'dark-mode', 
      title: 'Toggle Dark Mode', 
      description: 'Switch between light and dark theme',
      icon: '🌓',
      keywords: ['dark', 'light', 'theme', 'mode'],
      handler: handlers.toggleTheme
    },
    { 
      id: 'filter-overdue', 
      title: 'Show Overdue Invoices', 
      description: 'Filter to show only overdue invoices',
      icon: '🔴',
      keywords: ['overdue', 'late', 'filter'],
      handler: handlers.filterOverdue
    },
    { 
      id: 'filter-paid', 
      title: 'Show Paid Invoices', 
      description: 'Filter to show only paid invoices',
      icon: '✅',
      keywords: ['paid', 'completed', 'filter'],
      handler: handlers.filterPaid
    },
    { 
      id: 'clear-filters', 
      title: 'Clear All Filters', 
      description: 'Reset all filters and show all invoices',
      icon: '🔄',
      keywords: ['clear', 'reset', 'all', 'filter'],
      handler: handlers.clearFilters
    },
    { 
      id: 'analytics', 
      title: 'View Analytics', 
      description: 'Show analytics and insights',
      icon: '📈',
      keywords: ['analytics', 'stats', 'insights', 'reports'],
      handler: handlers.showAnalytics
    },
    { 
      id: 'help', 
      title: 'Keyboard Shortcuts', 
      description: 'Show keyboard shortcuts',
      icon: '⌨️',
      keywords: ['help', 'shortcuts', 'keyboard'],
      handler: handlers.showHelp
    }
  ];
  
  function renderResults(query = '') {
    const filtered = query.trim() === '' 
      ? actions 
      : actions.filter(action => {
          const searchTerm = query.toLowerCase();
          return action.title.toLowerCase().includes(searchTerm) ||
                 action.description.toLowerCase().includes(searchTerm) ||
                 action.keywords.some(kw => kw.includes(searchTerm));
        });
    
    if (filtered.length === 0) {
      resultsContainer.innerHTML = `
        <div class="p-8 text-center text-gray-500 dark:text-gray-400">
          <p>No actions found</p>
        </div>
      `;
      return;
    }
    
    resultsContainer.innerHTML = filtered.map((action, index) => `
      <button 
        class="quick-action-item w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${index === 0 ? 'bg-gray-50 dark:bg-gray-700' : ''}"
        data-action-id="${action.id}"
      >
        <span class="text-2xl">${action.icon}</span>
        <div class="flex-1">
          <div class="font-medium text-gray-900 dark:text-white">${action.title}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">${action.description}</div>
        </div>
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
    `).join('');
    
    // Add click handlers
    resultsContainer.querySelectorAll('.quick-action-item').forEach(item => {
      item.addEventListener('click', () => {
        const actionId = item.dataset.actionId;
        const action = actions.find(a => a.id === actionId);
        if (action && action.handler) {
          action.handler();
          modal.remove();
        }
      });
    });
  }
  
  // Initial render
  renderResults();
  
  // Search on input
  searchInput.addEventListener('input', (e) => {
    renderResults(e.target.value);
  });
  
  // Keyboard navigation
  searchInput.addEventListener('keydown', (e) => {
    const items = resultsContainer.querySelectorAll('.quick-action-item');
    const currentIndex = Array.from(items).findIndex(item => 
      item.classList.contains('bg-gray-50') || item.classList.contains('dark:bg-gray-700')
    );
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(currentIndex + 1, items.length - 1);
      items[currentIndex]?.classList.remove('bg-gray-50', 'dark:bg-gray-700');
      items[nextIndex]?.classList.add('bg-gray-50', 'dark:bg-gray-700');
      items[nextIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(currentIndex - 1, 0);
      items[currentIndex]?.classList.remove('bg-gray-50', 'dark:bg-gray-700');
      items[prevIndex]?.classList.add('bg-gray-50', 'dark:bg-gray-700');
      items[prevIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[currentIndex]?.click();
    }
  });
  
  // Close on Escape or backdrop click
  const closeModal = () => modal.remove();
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

export default {
  showQuickActions
};
