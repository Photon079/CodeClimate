/**
 * Reminder Module - Generate payment reminder messages for Invoice Guard
 * Handles reminder message generation with escalating tone and payment details
 */

/**
 * Get reminder tone based on days overdue
 * Escalates urgency as days increase
 * @param {number} daysOverdue - Number of days the invoice is overdue
 * @returns {Object} Reminder tone object with greeting, body, closing, and urgency level
 */
function getReminderTone(daysOverdue) {
  if (daysOverdue <= 0) {
    // Not overdue - gentle reminder
    return {
      greeting: 'Hi',
      body: 'I hope this message finds you well. I wanted to send a friendly reminder about',
      closing: 'Thank you for your attention to this matter.',
      urgency: 'low'
    };
  } else if (daysOverdue <= 7) {
    // 1-7 days overdue - polite but firmer
    return {
      greeting: 'Hello',
      body: 'I wanted to follow up regarding',
      closing: 'I would appreciate your prompt attention to this matter. Thank you.',
      urgency: 'medium'
    };
  } else if (daysOverdue <= 14) {
    // 8-14 days overdue - more urgent
    return {
      greeting: 'Dear',
      body: 'This is an important reminder regarding',
      closing: 'Please prioritize this payment. Your prompt response would be greatly appreciated.',
      urgency: 'high'
    };
  } else {
    // 15+ days overdue - most urgent
    return {
      greeting: 'Dear',
      body: 'This is an urgent reminder regarding',
      closing: 'This invoice is significantly overdue. Please arrange payment immediately or contact me to discuss this matter.',
      urgency: 'high'
    };
  }
}

/**
 * Format payment options section with placeholders
 * @param {Object} settings - Payment settings object
 * @returns {string} Formatted payment options text
 */
function formatPaymentOptions(settings) {
  const options = [];
  
  // UPI option
  if (settings.upiId && settings.upiId.trim()) {
    options.push(`• UPI: ${settings.upiId}`);
  } else {
    options.push(`• UPI: [Your UPI ID]`);
  }
  
  // Bank transfer option
  if (settings.bankDetails && settings.bankDetails.trim()) {
    options.push(`• Bank Transfer: ${settings.bankDetails}`);
  } else {
    options.push(`• Bank Transfer: [Your bank account details]`);
  }
  
  // PayPal option
  if (settings.paypalEmail && settings.paypalEmail.trim()) {
    options.push(`• PayPal: ${settings.paypalEmail}`);
  } else {
    options.push(`• PayPal: [Your PayPal email]`);
  }
  
  return options.join('\n');
}

/**
 * Generate reminder message for an invoice
 * @param {Object} invoice - Invoice object with enriched data (daysOverdue, lateFee)
 * @param {Object} settings - Payment settings object
 * @returns {string} Complete formatted reminder message
 */
function generateReminder(invoice, settings) {
  // Get appropriate tone based on days overdue
  const tone = getReminderTone(invoice.daysOverdue || 0);
  
  // Format currency values
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '₹0.00';
    }
    const fixedAmount = amount.toFixed(2);
    const [integerPart, decimalPart] = fixedAmount.split('.');
    let formatted = '';
    let count = 0;
    for (let i = integerPart.length - 1; i >= 0; i--) {
      if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
        formatted = ',' + formatted;
      }
      formatted = integerPart[i] + formatted;
      count++;
    }
    return `₹${formatted}.${decimalPart}`;
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return '';
    }
  };
  
  // Build the message
  const userName = settings.userName && settings.userName.trim() ? settings.userName : '[Your Name]';
  const clientName = invoice.clientName;
  const invoiceNumber = invoice.invoiceNumber;
  const amount = formatCurrency(invoice.amount);
  const dueDate = formatDate(invoice.dueDate);
  const daysOverdue = invoice.daysOverdue || 0;
  
  let message = `${tone.greeting} ${clientName},\n\n`;
  message += `${tone.body} ${invoiceNumber}.\n\n`;
  message += `Invoice Details:\n`;
  message += `• Invoice Number: ${invoiceNumber}\n`;
  message += `• Amount: ${amount}\n`;
  message += `• Due Date: ${dueDate}\n`;
  
  // Add days overdue if applicable
  if (daysOverdue > 0) {
    message += `• Days Overdue: ${daysOverdue}\n`;
  }
  
  // Add late fee if applicable
  if (invoice.lateFee && invoice.lateFee > 0) {
    const lateFeeFormatted = formatCurrency(invoice.lateFee);
    const totalAmount = formatCurrency(invoice.amount + invoice.lateFee);
    message += `• Late Fee: ${lateFeeFormatted}\n`;
    message += `• Total Amount Due: ${totalAmount}\n`;
  }
  
  message += `\n`;
  message += `Payment Options:\n`;
  message += formatPaymentOptions(settings);
  message += `\n\n`;
  message += `${tone.closing}\n\n`;
  message += `Best regards,\n`;
  message += `${userName}`;
  
  return message;
}

// Export functions for use in other modules (ES6 modules)
export {
  generateReminder,
  getReminderTone,
  formatPaymentOptions
};
