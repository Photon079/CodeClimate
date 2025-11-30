/**
 * Keyboard Shortcuts Module - Power user keyboard shortcuts
 */

/**
 * Initialize keyboard shortcuts
 * @param {Object} handlers - Object containing handler functions
 */
export function initKeyboardShortcuts(handlers) {
  document.addEventListener('keydown', (e) => {
    // Ignore if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    // Cmd/Ctrl + K - Quick search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      handlers.openSearch?.();
    }
    
    // Cmd/Ctrl + N - New invoice
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      handlers.newInvoice?.();
    }
    
    // Cmd/Ctrl + E - Export
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault();
      handlers.export?.();
    }
    
    // Cmd/Ctrl + , - Settings
    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault();
      handlers.openSettings?.();
    }
    
    // Cmd/Ctrl + D - Toggle dark mode
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
      e.preventDefault();
      handlers.toggleTheme?.();
    }
    
    // Cmd/Ctrl + A - Select all (when in table view)
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      const isInTable = document.activeElement.closest('table');
      if (isInTable) {
        e.preventDefault();
        handlers.selectAll?.();
      }
    }
    
    // ? - Show keyboard shortcuts help
    if (e.key === '?' && !e.shiftKey) {
      e.preventDefault();
      handlers.showHelp?.();
    }
    
    // Escape - Close modals/deselect
    if (e.key === 'Escape') {
      handlers.escape?.();
    }
    
    // / - Focus search
    if (e.key === '/') {
      e.preventDefault();
      handlers.focusSearch?.();
    }
  });
}

/**
 * Show keyboard shortcuts help modal
 */
export function showKeyboardShortcutsHelp() {
  const shortcuts = [
    { keys: ['⌘', 'K'], description: 'Quick search' },
    { keys: ['⌘', 'N'], description: 'New invoice' },
    { keys: ['⌘', 'E'], description: 'Export data' },
    { keys: ['⌘', ','], description: 'Open settings' },
    { keys: ['⌘', 'D'], description: 'Toggle dark mode' },
    { keys: ['⌘', 'A'], description: 'Select all' },
    { keys: ['/'], description: 'Focus search' },
    { keys: ['?'], description: 'Show this help' },
    { keys: ['Esc'], description: 'Close/Cancel' }
  ];
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
        <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onclick="this.closest('.fixed').remove()">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="space-y-3">
        ${shortcuts.map(shortcut => `
          <div class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span class="text-sm text-gray-600 dark:text-gray-400">${shortcut.description}</span>
            <div class="flex gap-1">
              ${shortcut.keys.map(key => `
                <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">${key}</kbd>
              `).join('<span class="text-gray-400">+</span>')}
            </div>
          </div>
        `).join('')}
      </div>
      <p class="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
        Press <kbd class="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">?</kbd> anytime to see this help
      </p>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

export default {
  initKeyboardShortcuts,
  showKeyboardShortcutsHelp
};
