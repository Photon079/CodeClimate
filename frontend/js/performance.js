/**
 * Performance Module - Optimization utilities for Invoice Guard
 * Provides memoization, debouncing, and rendering optimizations
 */

/**
 * Create a memoized version of a function
 * @param {Function} fn - Function to memoize
 * @param {Function} keyGenerator - Optional function to generate cache key from arguments
 * @returns {Function} Memoized function
 */
function memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  
  return function(...args) {
    const key = keyGenerator(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    
    return result;
  };
}

/**
 * Create a memoized version with LRU (Least Recently Used) cache
 * @param {Function} fn - Function to memoize
 * @param {number} maxSize - Maximum cache size
 * @param {Function} keyGenerator - Optional function to generate cache key
 * @returns {Function} Memoized function with LRU cache
 */
function memoizeLRU(fn, maxSize = 100, keyGenerator = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  
  return function(...args) {
    const key = keyGenerator(...args);
    
    if (cache.has(key)) {
      // Move to end (most recently used)
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    
    const result = fn.apply(this, args);
    
    // Add to cache
    cache.set(key, result);
    
    // Remove oldest entry if cache is full
    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
}

/**
 * Debounce a function - delays execution until after wait time has elapsed
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, wait = 300) {
  let timeoutId = null;
  
  const debounced = function(...args) {
    const context = this;
    
    // Clear previous timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    // Set new timeout
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn.apply(context, args);
    }, wait);
  };
  
  // Add cancel method to clear pending execution
  debounced.cancel = function() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debounced;
}

/**
 * Throttle a function - limits execution to once per wait period
 * @param {Function} fn - Function to throttle
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(fn, wait = 300) {
  let lastTime = 0;
  let timeoutId = null;
  
  return function(...args) {
    const context = this;
    const now = Date.now();
    
    // If enough time has passed, execute immediately
    if (now - lastTime >= wait) {
      lastTime = now;
      fn.apply(context, args);
    } else {
      // Otherwise, schedule for later
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        lastTime = Date.now();
        timeoutId = null;
        fn.apply(context, args);
      }, wait - (now - lastTime));
    }
  };
}

/**
 * Batch DOM updates using requestAnimationFrame
 * @param {Function} fn - Function containing DOM updates
 */
function batchDOMUpdate(fn) {
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(fn);
  } else {
    // Fallback for environments without requestAnimationFrame (like tests)
    // Execute synchronously to maintain test compatibility
    fn();
  }
}

/**
 * Create a virtual scroll renderer for large lists
 * @param {Object} options - Configuration options
 * @returns {Object} Virtual scroll controller
 */
function createVirtualScroll(options) {
  const {
    container,
    items,
    itemHeight,
    renderItem,
    overscan = 3
  } = options;
  
  let scrollTop = 0;
  let containerHeight = container.clientHeight;
  
  // Calculate visible range
  function getVisibleRange() {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = start + visibleCount;
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan)
    };
  }
  
  // Render visible items
  function render() {
    const range = getVisibleRange();
    const fragment = document.createDocumentFragment();
    
    // Clear container
    container.innerHTML = '';
    
    // Create spacer for items before visible range
    if (range.start > 0) {
      const topSpacer = document.createElement('div');
      topSpacer.style.height = `${range.start * itemHeight}px`;
      fragment.appendChild(topSpacer);
    }
    
    // Render visible items
    for (let i = range.start; i < range.end; i++) {
      const item = items[i];
      const element = renderItem(item, i);
      fragment.appendChild(element);
    }
    
    // Create spacer for items after visible range
    if (range.end < items.length) {
      const bottomSpacer = document.createElement('div');
      bottomSpacer.style.height = `${(items.length - range.end) * itemHeight}px`;
      fragment.appendChild(bottomSpacer);
    }
    
    container.appendChild(fragment);
  }
  
  // Handle scroll events
  const handleScroll = throttle(() => {
    scrollTop = container.scrollTop;
    render();
  }, 16); // ~60fps
  
  // Handle resize events
  const handleResize = debounce(() => {
    containerHeight = container.clientHeight;
    render();
  }, 150);
  
  // Initialize
  container.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', handleResize);
  render();
  
  // Return controller
  return {
    update: (newItems) => {
      items.length = 0;
      items.push(...newItems);
      render();
    },
    destroy: () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    },
    refresh: render
  };
}

/**
 * Batch process array items to avoid blocking UI
 * @param {Array} items - Items to process
 * @param {Function} processor - Function to process each item
 * @param {number} batchSize - Number of items per batch
 * @returns {Promise} Promise that resolves when all items are processed
 */
function batchProcess(items, processor, batchSize = 50) {
  return new Promise((resolve) => {
    let index = 0;
    
    function processBatch() {
      const end = Math.min(index + batchSize, items.length);
      
      for (let i = index; i < end; i++) {
        processor(items[i], i);
      }
      
      index = end;
      
      if (index < items.length) {
        // Schedule next batch
        batchDOMUpdate(processBatch);
      } else {
        resolve();
      }
    }
    
    processBatch();
  });
}

// Export functions for use in other modules (ES6 modules)
export {
  memoize,
  memoizeLRU,
  debounce,
  throttle,
  batchDOMUpdate,
  createVirtualScroll,
  batchProcess
};
