/**
 * Theme Module - Dark mode support
 */

const THEME_KEY = 'invoice-guard-theme';

/**
 * Get current theme
 * @returns {string} 'light' or 'dark'
 */
export function getTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  console.log('Saved theme from localStorage:', saved);
  
  if (saved) {
    return saved;
  }

  // Check system preference
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  console.log('System prefers dark mode:', prefersDark);
  
  if (prefersDark) {
    return 'dark';
  }

  return 'light';
}

/**
 * Set theme
 * @param {string} theme - 'light' or 'dark'
 */
export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

/**
 * Toggle theme
 * @returns {string} New theme
 */
export function toggleTheme() {
  const current = getTheme();
  const newTheme = current === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
}

/**
 * Apply theme to document
 * @param {string} theme - 'light' or 'dark'
 */
export function applyTheme(theme) {
  const html = document.documentElement;
  console.log('Applying theme:', theme);
  
  if (theme === 'dark') {
    html.classList.add('dark');
    console.log('Dark mode enabled - classList:', html.classList.toString());
  } else {
    html.classList.remove('dark');
    console.log('Light mode enabled - classList:', html.classList.toString());
  }
}

/**
 * Initialize theme on page load
 */
export function initTheme() {
  const theme = getTheme();
  applyTheme(theme);

  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setTheme(newTheme);
    });
  }
}
