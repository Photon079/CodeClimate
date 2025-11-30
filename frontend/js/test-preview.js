/**
 * Test Preview Module
 * Handles testing and preview of AI messages, email, and SMS
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { showToast, setButtonLoading } from './ui.js';

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Show the test preview modal
 */
export function showTestPreviewModal() {
  const modal = document.getElementById('testPreviewModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    
    // Reset form fields and results
    resetTestPreviewModal();
  }
}

/**
 * Hide the test preview modal
 */
export function hideTestPreviewModal() {
  const modal = document.getElementById('testPreviewModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }
}

/**
 * Reset the test preview modal to initial state
 */
function resetTestPreviewModal() {
  // Reset AI message preview
  const aiMessagePreview = document.getElementById('aiMessagePreview');
  if (aiMessagePreview) {
    aiMessagePreview.classList.add('hidden');
  }
  
  // Reset email test result
  const emailTestResult = document.getElementById('emailTestResult');
  if (emailTestResult) {
    emailTestResult.classList.add('hidden');
    emailTestResult.innerHTML = '';
  }
  
  // Reset SMS test result
  const smsTestResult = document.getElementById('smsTestResult');
  if (smsTestResult) {
    smsTestResult.classList.add('hidden');
    smsTestResult.innerHTML = '';
  }
  
  // Reset escalation level to gentle
  const escalationSelect = document.getElementById('testEscalationLevel');
  if (escalationSelect) {
    escalationSelect.value = 'gentle';
  }
}

/**
 * Generate and display a test AI message
 * Requirement 15.1, 15.2, 15.3
 */
export async function generateTestAIMessage() {
  const btn = document.getElementById('testAIMessageBtn');
  const escalationLevel = document.getElementById('testEscalationLevel')?.value || 'gentle';
  const previewDiv = document.getElementById('aiMessagePreview');
  const messageText = document.getElementById('aiMessageText');
  const messageMeta = document.getElementById('aiMessageMeta');
  
  if (!btn || !previewDiv || !messageText || !messageMeta) {
    showToast('UI elements not found', 'error');
    return;
  }
  
  // Show loading state
  setButtonLoading(btn, true, 'Generating...');
  
  try {
    // Calculate days overdue based on escalation level
    let daysOverdue = 2;
    if (escalationLevel === 'firm') daysOverdue = 5;
    if (escalationLevel === 'urgent') daysOverdue = 10;
    
    // Make API call to generate test message
    const response = await fetch(`${API_BASE_URL}/test/ai-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientName: 'John Doe',
        invoiceNumber: 'INV-001',
        amount: 50000,
        dueDate: new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000).toISOString(),
        daysOverdue,
        escalationLevel,
        paymentDetails: {
          upiId: 'example@upi',
          bankDetails: 'Account: 1234567890\nIFSC: BANK0001234'
        },
        previousReminders: 0
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Display the generated message
      messageText.textContent = data.message;
      
      // Display metadata
      const metaInfo = [
        `Level: ${data.metadata.escalationLevel}`,
        `Provider: ${data.metadata.provider}`,
        `Model: ${data.metadata.model}`,
        `Est. Cost: $${data.metadata.estimatedCost?.toFixed(4) || '0.0000'}`
      ].join(' • ');
      messageMeta.textContent = metaInfo;
      
      // Show the preview
      previewDiv.classList.remove('hidden');
      
      showToast('AI message generated successfully!', 'success');
    } else {
      showToast(data.error || 'Failed to generate AI message', 'error');
      
      // Show fallback message if available
      if (data.fallback) {
        showToast(data.fallback, 'info');
      }
    }
  } catch (error) {
    console.error('Error generating AI message:', error);
    showToast('Failed to connect to server. Make sure the backend is running.', 'error');
  } finally {
    // Hide loading state
    setButtonLoading(btn, false);
  }
}

/**
 * Copy AI message to clipboard
 */
export function copyAIMessage() {
  const messageText = document.getElementById('aiMessageText');
  if (!messageText) return;
  
  const text = messageText.textContent;
  
  navigator.clipboard.writeText(text).then(() => {
    showToast('Message copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy message', 'error');
  });
}

/**
 * Send a test email
 * Requirement 15.4
 */
export async function sendTestEmail() {
  const btn = document.getElementById('sendTestEmailBtn');
  const emailInput = document.getElementById('testEmailAddress');
  const resultDiv = document.getElementById('emailTestResult');
  
  if (!btn || !emailInput || !resultDiv) {
    showToast('UI elements not found', 'error');
    return;
  }
  
  const email = emailInput.value.trim();
  
  // Validate email
  if (!email) {
    showToast('Please enter an email address', 'error');
    emailInput.focus();
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('Please enter a valid email address', 'error');
    emailInput.focus();
    return;
  }
  
  // Show loading state
  setButtonLoading(btn, true, 'Sending...');
  resultDiv.classList.add('hidden');
  
  try {
    // Make API call to send test email
    const response = await fetch(`${API_BASE_URL}/test/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: email,
        subject: 'Invoice Guard - Test Email',
        message: 'This is a test email from Invoice Guard. If you received this, your email service is configured correctly!'
      })
    });
    
    const data = await response.json();
    
    // Display result
    resultDiv.classList.remove('hidden');
    
    if (data.success) {
      resultDiv.innerHTML = `
        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div class="flex-1">
              <h5 class="text-sm font-bold text-green-800 dark:text-green-200 mb-1">✓ Test Email Sent Successfully!</h5>
              <p class="text-xs text-green-700 dark:text-green-300">
                Provider: ${data.provider || 'Unknown'}<br>
                Message ID: ${data.messageId || 'N/A'}<br>
                Est. Cost: $${data.estimatedCost?.toFixed(4) || '0.0000'}
              </p>
              <p class="text-xs text-green-600 dark:text-green-400 mt-2">
                Check your inbox (and spam folder) for the test email.
              </p>
            </div>
          </div>
        </div>
      `;
      showToast('Test email sent successfully!', 'success');
    } else {
      resultDiv.innerHTML = `
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <div class="flex-1">
              <h5 class="text-sm font-bold text-red-800 dark:text-red-200 mb-1">✗ Test Email Failed</h5>
              <p class="text-xs text-red-700 dark:text-red-300">
                ${data.error || 'Unknown error'}<br>
                ${data.message || ''}
              </p>
              <p class="text-xs text-red-600 dark:text-red-400 mt-2">
                Please check your email service configuration in the Service Configuration panel.
              </p>
            </div>
          </div>
        </div>
      `;
      showToast('Failed to send test email', 'error');
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = `
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <div class="flex-1">
            <h5 class="text-sm font-bold text-red-800 dark:text-red-200 mb-1">✗ Connection Error</h5>
            <p class="text-xs text-red-700 dark:text-red-300">
              Failed to connect to server. Make sure the backend is running.
            </p>
          </div>
        </div>
      </div>
    `;
    showToast('Failed to connect to server', 'error');
  } finally {
    // Hide loading state
    setButtonLoading(btn, false);
  }
}

/**
 * Send a test SMS
 * Requirement 15.5
 */
export async function sendTestSMS() {
  const btn = document.getElementById('sendTestSMSBtn');
  const phoneInput = document.getElementById('testPhoneNumber');
  const resultDiv = document.getElementById('smsTestResult');
  
  if (!btn || !phoneInput || !resultDiv) {
    showToast('UI elements not found', 'error');
    return;
  }
  
  const phone = phoneInput.value.trim();
  
  // Validate phone
  if (!phone) {
    showToast('Please enter a phone number', 'error');
    phoneInput.focus();
    return;
  }
  
  // Basic E.164 format validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    showToast('Please enter phone number in E.164 format (e.g., +919876543210)', 'error');
    phoneInput.focus();
    return;
  }
  
  // Show loading state
  setButtonLoading(btn, true, 'Sending...');
  resultDiv.classList.add('hidden');
  
  try {
    // Make API call to send test SMS
    const response = await fetch(`${API_BASE_URL}/test/sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: phone,
        message: 'This is a test SMS from Invoice Guard. Your SMS service is working!'
      })
    });
    
    const data = await response.json();
    
    // Display result
    resultDiv.classList.remove('hidden');
    
    if (data.success) {
      resultDiv.innerHTML = `
        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div class="flex-1">
              <h5 class="text-sm font-bold text-green-800 dark:text-green-200 mb-1">✓ Test SMS Sent Successfully!</h5>
              <p class="text-xs text-green-700 dark:text-green-300">
                Message ID: ${data.messageId || 'N/A'}<br>
                Cost: $${data.cost?.toFixed(4) || '0.0000'}<br>
                ${data.balance !== null && data.balance !== undefined ? `Balance: $${data.balance.toFixed(2)}` : ''}
              </p>
              <p class="text-xs text-green-600 dark:text-green-400 mt-2">
                You should receive the test SMS within a few seconds.
              </p>
            </div>
          </div>
        </div>
      `;
      showToast('Test SMS sent successfully!', 'success');
    } else {
      resultDiv.innerHTML = `
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <div class="flex-1">
              <h5 class="text-sm font-bold text-red-800 dark:text-red-200 mb-1">✗ Test SMS Failed</h5>
              <p class="text-xs text-red-700 dark:text-red-300">
                ${data.error || 'Unknown error'}<br>
                ${data.message || ''}
              </p>
              <p class="text-xs text-red-600 dark:text-red-400 mt-2">
                Please check your SMS service configuration in the Service Configuration panel.
              </p>
            </div>
          </div>
        </div>
      `;
      showToast('Failed to send test SMS', 'error');
    }
  } catch (error) {
    console.error('Error sending test SMS:', error);
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = `
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <div class="flex-1">
            <h5 class="text-sm font-bold text-red-800 dark:text-red-200 mb-1">✗ Connection Error</h5>
            <p class="text-xs text-red-700 dark:text-red-300">
              Failed to connect to server. Make sure the backend is running.
            </p>
          </div>
        </div>
      </div>
    `;
    showToast('Failed to connect to server', 'error');
  } finally {
    // Hide loading state
    setButtonLoading(btn, false);
  }
}

/**
 * Setup event listeners for test preview functionality
 */
export function setupTestPreviewListeners() {
  // Close buttons
  const closeBtn = document.getElementById('closeTestPreviewBtn');
  const closeBtnFooter = document.getElementById('closeTestPreviewBtnFooter');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', hideTestPreviewModal);
  }
  
  if (closeBtnFooter) {
    closeBtnFooter.addEventListener('click', hideTestPreviewModal);
  }
  
  // Close on backdrop click
  const modal = document.getElementById('testPreviewModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideTestPreviewModal();
      }
    });
  }
  
  // Test AI Message button
  const testAIBtn = document.getElementById('testAIMessageBtn');
  if (testAIBtn) {
    testAIBtn.addEventListener('click', generateTestAIMessage);
  }
  
  // Copy AI Message button
  const copyAIBtn = document.getElementById('copyAIMessageBtn');
  if (copyAIBtn) {
    copyAIBtn.addEventListener('click', copyAIMessage);
  }
  
  // Send Test Email button
  const sendEmailBtn = document.getElementById('sendTestEmailBtn');
  if (sendEmailBtn) {
    sendEmailBtn.addEventListener('click', sendTestEmail);
  }
  
  // Send Test SMS button
  const sendSMSBtn = document.getElementById('sendTestSMSBtn');
  if (sendSMSBtn) {
    sendSMSBtn.addEventListener('click', sendTestSMS);
  }
  
  // Enter key support for email input
  const emailInput = document.getElementById('testEmailAddress');
  if (emailInput) {
    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendTestEmail();
      }
    });
  }
  
  // Enter key support for phone input
  const phoneInput = document.getElementById('testPhoneNumber');
  if (phoneInput) {
    phoneInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendTestSMS();
      }
    });
  }
}
