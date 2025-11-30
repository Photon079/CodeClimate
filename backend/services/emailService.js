/**
 * Email Service - Handles email delivery via SendGrid, Resend, or SMTP
 * 
 * Features:
 * - Multi-provider support (SendGrid, Resend, SMTP)
 * - Automatic retry with exponential backoff
 * - Delivery status tracking
 * - Error classification (retryable vs non-retryable)
 * 
 * Retry Logic (Requirements 4.6, 13.1, 13.2):
 * - Max retries: 3 attempts
 * - Initial delay: 1 minute
 * - Backoff multiplier: 2x (exponential)
 * - Retry delays: 1min, 2min, 4min
 * - Only retries on transient errors (timeouts, rate limits, server errors)
 */

import sgMail from '@sendgrid/mail';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import ReminderLog from '../models/ReminderLog.js';

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'sendgrid';
    this.senderEmail = process.env.SENDER_EMAIL;
    this.senderName = process.env.SENDER_NAME || 'Invoice Guard';
    
    // Retry configuration
    this.maxRetries = 3;
    this.initialRetryDelay = 60000; // 1 minute in milliseconds
    this.retryMultiplier = 2; // Exponential backoff multiplier
    
    // Initialize provider
    if (this.provider === 'sendgrid') {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    } else if (this.provider === 'resend') {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    } else if (this.provider === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT == 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    }
  }

  /**
   * Send an email with retry logic
   * @param {Object} params - Email parameters
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Result with success status and messageId
   */
  async sendEmail(params, options = {}) {
    const { to, subject, html, text, reminderLogId, invoiceId } = params;
    const { attempt = 0, skipRetry = false } = options;

    try {
      let result;

      // Generate unsubscribe URL with email parameter
      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(to)}${invoiceId ? `&invoiceId=${invoiceId}` : ''}`;

      if (this.provider === 'sendgrid') {
        result = await this._sendWithSendGrid({ to, subject, html, text, unsubscribeUrl });
      } else if (this.provider === 'resend') {
        result = await this._sendWithResend({ to, subject, html, text, unsubscribeUrl });
      } else if (this.provider === 'smtp') {
        result = await this._sendWithSMTP({ to, subject, html, text, unsubscribeUrl });
      } else {
        throw new Error(`Unknown email provider: ${this.provider}`);
      }

      // Update delivery status if reminderLogId is provided
      if (reminderLogId) {
        await this._updateDeliveryStatus(reminderLogId, 'sent', result.messageId);
      }

      return {
        success: true,
        messageId: result.messageId,
        provider: this.provider,
        attempt: attempt + 1
      };
    } catch (error) {
      console.error(`Email sending failed (attempt ${attempt + 1}):`, error);

      // Update delivery status if reminderLogId is provided
      if (reminderLogId) {
        await this._updateDeliveryStatus(reminderLogId, 'failed', null, error.message);
      }

      // Determine if error is retryable
      const isRetryable = this._isRetryableError(error);

      // Retry logic with exponential backoff
      if (!skipRetry && isRetryable && attempt < this.maxRetries) {
        const delay = this._calculateRetryDelay(attempt);
        console.log(`Retrying email send in ${delay}ms (attempt ${attempt + 2}/${this.maxRetries + 1})`);

        // Schedule retry
        await this._sleep(delay);
        return this.sendEmail(params, { attempt: attempt + 1 });
      }

      return {
        success: false,
        error: error.message,
        provider: this.provider,
        attempt: attempt + 1,
        retryable: isRetryable
      };
    }
  }

  /**
   * Send email via SendGrid
   * @private
   */
  async _sendWithSendGrid({ to, subject, html, text, unsubscribeUrl }) {
    const msg = {
      to,
      from: {
        email: this.senderEmail,
        name: this.senderName
      },
      subject,
      text,
      html: this._wrapHTMLTemplate(html, unsubscribeUrl)
    };

    const [response] = await sgMail.send(msg);
    return {
      messageId: response.headers['x-message-id']
    };
  }

  /**
   * Send email via Resend
   * @private
   */
  async _sendWithResend({ to, subject, html, text, unsubscribeUrl }) {
    const result = await this.resend.emails.send({
      from: `${this.senderName} <${this.senderEmail}>`,
      to,
      subject,
      text,
      html: this._wrapHTMLTemplate(html, unsubscribeUrl)
    });

    return {
      messageId: result.id
    };
  }

  /**
   * Send email via SMTP
   * @private
   */
  async _sendWithSMTP({ to, subject, html, text, unsubscribeUrl }) {
    const info = await this.transporter.sendMail({
      from: `"${this.senderName}" <${this.senderEmail}>`,
      to,
      subject,
      text,
      html: this._wrapHTMLTemplate(html, unsubscribeUrl)
    });

    return {
      messageId: info.messageId
    };
  }

  /**
   * Wrap message in HTML email template
   * @private
   */
  _wrapHTMLTemplate(content, unsubscribeUrl = null) {
    const unsubscribeLink = unsubscribeUrl || `${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe`;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #1E40AF;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #1E40AF;
    }
    .content {
      white-space: pre-wrap;
      margin-bottom: 30px;
    }
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      margin-top: 30px;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    .unsubscribe {
      color: #6b7280;
      text-decoration: none;
    }
    .unsubscribe:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">💼 Invoice Guard</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated payment reminder from Invoice Guard.</p>
      <p>
        <a href="${unsubscribeLink}" class="unsubscribe">Unsubscribe from reminders</a>
      </p>
      <p>© ${new Date().getFullYear()} Invoice Guard. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate email subject line
   * @param {string} invoiceNumber
   * @param {string} escalationLevel
   * @returns {string}
   */
  generateSubject(invoiceNumber, escalationLevel) {
    const subjects = {
      gentle: `Payment Reminder: Invoice ${invoiceNumber}`,
      firm: `Payment Due: Invoice ${invoiceNumber}`,
      urgent: `URGENT: Overdue Payment - Invoice ${invoiceNumber}`
    };
    return subjects[escalationLevel] || subjects.gentle;
  }

  /**
   * Test email service connection
   * @param {string} testEmail - Email to send test to
   * @returns {Promise<boolean>}
   */
  async testConnection(testEmail) {
    try {
      const result = await this.sendEmail({
        to: testEmail || this.senderEmail,
        subject: 'Invoice Guard - Test Email',
        text: 'This is a test email from Invoice Guard. If you received this, your email service is configured correctly!',
        html: '<p>This is a test email from Invoice Guard.</p><p>If you received this, your email service is configured correctly!</p>'
      });

      return result.success;
    } catch (error) {
      console.error('Email service test failed:', error);
      return false;
    }
  }

  /**
   * Get estimated cost per email
   * @returns {number} Cost in USD
   */
  getEstimatedCost() {
    const costs = {
      sendgrid: 0.0001,  // $0.0001 per email (approximate)
      resend: 0.0001,
      smtp: 0  // Free if using own SMTP
    };
    return costs[this.provider] || 0.0001;
  }

  /**
   * Determine if an error is retryable
   * @param {Error} error
   * @returns {boolean}
   * @private
   */
  _isRetryableError(error) {
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET',
      'EPIPE',
      'RATE_LIMIT_EXCEEDED',
      'SERVICE_UNAVAILABLE',
      'INTERNAL_SERVER_ERROR',
      '429', // Too Many Requests
      '500', // Internal Server Error
      '502', // Bad Gateway
      '503', // Service Unavailable
      '504'  // Gateway Timeout
    ];

    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    const statusCode = error.statusCode || error.response?.status || '';

    return retryableErrors.some(retryableCode => 
      errorMessage.includes(retryableCode) || 
      errorCode.includes(retryableCode) ||
      String(statusCode).includes(retryableCode)
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   * @private
   */
  _calculateRetryDelay(attempt) {
    // Exponential backoff: initialDelay * (multiplier ^ attempt)
    // Attempt 0: 1 minute
    // Attempt 1: 2 minutes
    // Attempt 2: 4 minutes
    return this.initialRetryDelay * Math.pow(this.retryMultiplier, attempt);
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update delivery status in ReminderLog
   * @param {string} reminderLogId - ID of the reminder log
   * @param {string} status - Status to update ('sent' or 'failed')
   * @param {string} messageId - Message ID from provider
   * @param {string} error - Error message if failed
   * @returns {Promise<void>}
   * @private
   */
  async _updateDeliveryStatus(reminderLogId, status, messageId = null, error = null) {
    try {
      // Use imported ReminderLog model
      
      const updateData = {
        status,
        error
      };

      if (status === 'sent') {
        updateData.deliveredAt = new Date();
      }

      // Store messageId in error field for tracking (temporary solution)
      if (messageId && status === 'sent') {
        updateData.error = `MessageId: ${messageId}`;
      }

      await ReminderLog.findByIdAndUpdate(reminderLogId, updateData);
    } catch (err) {
      console.error('Failed to update delivery status:', err);
      // Don't throw - this is a non-critical operation
    }
  }
}

export default EmailService;
