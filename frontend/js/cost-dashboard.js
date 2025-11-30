/**
 * Cost Dashboard Module
 * Handles cost monitoring, budget configuration, and usage statistics
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 10.5
 */

import { showToast } from './ui.js';

// API base URL
const API_BASE_URL = 'http://localhost:3000/api';

// User ID (in production, this would come from authentication)
const USER_ID = 'user_001';

/**
 * Show the cost dashboard modal
 */
export function showCostDashboard() {
  const modal = document.getElementById('costDashboardModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Load dashboard data
    loadCostDashboardData();
  }
}

/**
 * Hide the cost dashboard modal
 */
export function hideCostDashboard() {
  const modal = document.getElementById('costDashboardModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

/**
 * Load all cost dashboard data
 */
async function loadCostDashboardData() {
  try {
    // Load monthly costs
    await loadMonthlyCosts();
    
    // Load usage statistics
    await loadUsageStatistics();
    
    // Load budget configuration
    await loadBudgetConfig();
    
    // Load service credit balances
    await loadServiceCredits();
  } catch (error) {
    console.error('Error loading cost dashboard data:', error);
    showToast('Failed to load cost dashboard data', 'error');
  }
}

/**
 * Load monthly costs breakdown
 * Requirements: 14.1, 14.2
 */
async function loadMonthlyCosts() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    const response = await fetch(`${API_BASE_URL}/costs/monthly?year=${year}&month=${month}&userId=${USER_ID}`);
    const data = await response.json();
    
    if (data.success) {
      displayMonthlyCosts(data.costs, data.budget);
    } else {
      throw new Error(data.error || 'Failed to load monthly costs');
    }
  } catch (error) {
    console.error('Error loading monthly costs:', error);
    displayMonthlyCosts({ total: 0, byChannel: {} }, null);
  }
}

/**
 * Display monthly costs breakdown
 */
function displayMonthlyCosts(costs, budget) {
  // Update total cost
  const totalCostEl = document.getElementById('totalMonthlyCost');
  if (totalCostEl) {
    totalCostEl.textContent = `$${costs.total.toFixed(2)}`;
  }
  
  // Update email cost
  const emailCostEl = document.getElementById('emailCost');
  const emailCountEl = document.getElementById('emailCount');
  if (emailCostEl && emailCountEl) {
    const emailData = costs.byChannel.email || { cost: 0, count: 0 };
    emailCostEl.textContent = `$${emailData.cost.toFixed(2)}`;
    emailCountEl.textContent = `${emailData.count} sent`;
  }
  
  // Update SMS cost
  const smsCostEl = document.getElementById('smsCost');
  const smsCountEl = document.getElementById('smsCount');
  if (smsCostEl && smsCountEl) {
    const smsData = costs.byChannel.sms || { cost: 0, count: 0 };
    smsCostEl.textContent = `$${smsData.cost.toFixed(2)}`;
    smsCountEl.textContent = `${smsData.count} sent`;
  }
  
  // Update budget information if available
  if (budget) {
    const budgetLimitEl = document.getElementById('budgetLimit');
    const budgetRemainingEl = document.getElementById('budgetRemaining');
    const budgetProgressEl = document.getElementById('budgetProgress');
    const budgetWarningEl = document.getElementById('budgetWarning');
    
    if (budgetLimitEl) {
      budgetLimitEl.textContent = `$${budget.monthlyLimit.toFixed(2)}`;
    }
    
    if (budgetRemainingEl) {
      budgetRemainingEl.textContent = `$${budget.remaining.toFixed(2)}`;
    }
    
    if (budgetProgressEl) {
      budgetProgressEl.style.width = `${Math.min(budget.percentUsed, 100)}%`;
      
      // Change color based on usage
      budgetProgressEl.classList.remove('bg-green-500', 'bg-yellow-500', 'bg-red-500');
      if (budget.percentUsed >= 90) {
        budgetProgressEl.classList.add('bg-red-500');
      } else if (budget.percentUsed >= budget.warningThreshold * 100) {
        budgetProgressEl.classList.add('bg-yellow-500');
      } else {
        budgetProgressEl.classList.add('bg-green-500');
      }
    }
    
    // Show warning if threshold exceeded
    if (budgetWarningEl) {
      if (budget.percentUsed >= budget.warningThreshold * 100) {
        budgetWarningEl.classList.remove('hidden');
        budgetWarningEl.textContent = budget.percentUsed >= 100 
          ? '⚠️ Budget limit reached! Automated reminders are paused.'
          : `⚠️ Warning: You've used ${budget.percentUsed.toFixed(1)}% of your monthly budget.`;
      } else {
        budgetWarningEl.classList.add('hidden');
      }
    }
  }
}

/**
 * Load usage statistics
 * Requirements: 14.2
 */
async function loadUsageStatistics() {
  try {
    const response = await fetch(`${API_BASE_URL}/costs/usage?period=month&userId=${USER_ID}`);
    const data = await response.json();
    
    if (data.success) {
      displayUsageStatistics(data.usage);
    } else {
      throw new Error(data.error || 'Failed to load usage statistics');
    }
  } catch (error) {
    console.error('Error loading usage statistics:', error);
    displayUsageStatistics({
      byChannel: { email: { sent: 0, failed: 0 }, sms: { sent: 0, failed: 0 } },
      totals: { sent: 0, failed: 0 },
      successRate: 0
    });
  }
}

/**
 * Display usage statistics
 */
function displayUsageStatistics(usage) {
  // Update total reminders sent
  const totalSentEl = document.getElementById('totalRemindersSent');
  if (totalSentEl) {
    totalSentEl.textContent = usage.totals.sent;
  }
  
  // Update success rate
  const successRateEl = document.getElementById('successRate');
  if (successRateEl) {
    successRateEl.textContent = `${usage.successRate.toFixed(1)}%`;
  }
  
  // Update email stats
  const emailSentEl = document.getElementById('emailSent');
  const emailFailedEl = document.getElementById('emailFailed');
  if (emailSentEl && emailFailedEl) {
    emailSentEl.textContent = usage.byChannel.email.sent;
    emailFailedEl.textContent = usage.byChannel.email.failed;
  }
  
  // Update SMS stats
  const smsSentEl = document.getElementById('smsSent');
  const smsFailedEl = document.getElementById('smsFailed');
  if (smsSentEl && smsFailedEl) {
    smsSentEl.textContent = usage.byChannel.sms.sent;
    smsFailedEl.textContent = usage.byChannel.sms.failed;
  }
}

/**
 * Load budget configuration
 * Requirements: 14.4
 */
async function loadBudgetConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/costs/budget?userId=${USER_ID}`);
    const data = await response.json();
    
    if (data.success) {
      populateBudgetForm(data.budget);
    } else {
      // No budget configured yet
      populateBudgetForm(null);
    }
  } catch (error) {
    console.error('Error loading budget config:', error);
    populateBudgetForm(null);
  }
}

/**
 * Populate budget configuration form
 */
function populateBudgetForm(budget) {
  const monthlyLimitInput = document.getElementById('monthlyBudgetLimit');
  const warningThresholdInput = document.getElementById('budgetWarningThreshold');
  
  if (budget) {
    if (monthlyLimitInput) {
      monthlyLimitInput.value = budget.monthlyLimit;
    }
    if (warningThresholdInput) {
      warningThresholdInput.value = (budget.warningThreshold * 100).toFixed(0);
    }
  } else {
    // Set defaults
    if (monthlyLimitInput) {
      monthlyLimitInput.value = '50';
    }
    if (warningThresholdInput) {
      warningThresholdInput.value = '80';
    }
  }
}

/**
 * Save budget configuration
 * Requirements: 14.4
 */
export async function saveBudgetConfig(event) {
  event.preventDefault();
  
  const monthlyLimit = parseFloat(document.getElementById('monthlyBudgetLimit').value);
  const warningThreshold = parseFloat(document.getElementById('budgetWarningThreshold').value) / 100;
  
  // Validation
  if (isNaN(monthlyLimit) || monthlyLimit < 0) {
    showToast('Please enter a valid monthly budget limit', 'error');
    return;
  }
  
  if (isNaN(warningThreshold) || warningThreshold < 0 || warningThreshold > 1) {
    showToast('Warning threshold must be between 0 and 100', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/costs/budget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: USER_ID,
        monthlyLimit,
        warningThreshold,
        userEmail: 'user@example.com' // In production, get from user profile
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Budget configuration saved successfully!', 'success');
      // Reload dashboard data to reflect changes
      await loadCostDashboardData();
    } else {
      throw new Error(data.error || 'Failed to save budget configuration');
    }
  } catch (error) {
    console.error('Error saving budget config:', error);
    showToast('Failed to save budget configuration', 'error');
  }
}

/**
 * Load service credit balances
 * Requirements: 10.5
 */
async function loadServiceCredits() {
  try {
    // In a real implementation, this would call the SMS service to get credit balance
    // For now, we'll display placeholder data
    displayServiceCredits({
      sms: {
        balance: 100,
        currency: 'USD'
      }
    });
  } catch (error) {
    console.error('Error loading service credits:', error);
    displayServiceCredits({ sms: { balance: 0, currency: 'USD' } });
  }
}

/**
 * Display service credit balances
 */
function displayServiceCredits(credits) {
  const smsBalanceEl = document.getElementById('smsBalance');
  if (smsBalanceEl) {
    smsBalanceEl.textContent = `$${credits.sms.balance.toFixed(2)}`;
    
    // Show warning if balance is low
    if (credits.sms.balance < 10) {
      smsBalanceEl.classList.add('text-red-600');
      smsBalanceEl.classList.remove('text-gray-900');
    } else {
      smsBalanceEl.classList.remove('text-red-600');
      smsBalanceEl.classList.add('text-gray-900');
    }
  }
}

/**
 * Setup cost dashboard event listeners
 */
export function setupCostDashboardListeners() {
  // Open cost dashboard button
  const costDashboardBtn = document.getElementById('costDashboardBtn');
  if (costDashboardBtn) {
    costDashboardBtn.addEventListener('click', showCostDashboard);
  }
  
  // Close cost dashboard button
  const closeCostDashboardBtn = document.getElementById('closeCostDashboardBtn');
  if (closeCostDashboardBtn) {
    closeCostDashboardBtn.addEventListener('click', hideCostDashboard);
  }
  
  // Close cost dashboard button (footer)
  const closeCostDashboardBtnFooter = document.getElementById('closeCostDashboardBtnFooter');
  if (closeCostDashboardBtnFooter) {
    closeCostDashboardBtnFooter.addEventListener('click', hideCostDashboard);
  }
  
  // Close on backdrop click
  const costDashboardModal = document.getElementById('costDashboardModal');
  if (costDashboardModal) {
    costDashboardModal.addEventListener('click', (e) => {
      if (e.target === costDashboardModal) {
        hideCostDashboard();
      }
    });
  }
  
  // Budget configuration form
  const budgetForm = document.getElementById('budgetConfigForm');
  if (budgetForm) {
    budgetForm.addEventListener('submit', saveBudgetConfig);
  }
  
  // Refresh dashboard button
  const refreshDashboardBtn = document.getElementById('refreshDashboardBtn');
  if (refreshDashboardBtn) {
    refreshDashboardBtn.addEventListener('click', () => {
      loadCostDashboardData();
      showToast('Dashboard refreshed', 'success');
    });
  }
}
