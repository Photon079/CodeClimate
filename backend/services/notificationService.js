/**
 * Notification Service - User notifications for system events
 * 
 * Features:
 * - Error notifications when multiple reminders fail
 * - API quota exceeded notifications
 * - Low SMS credit notifications
 * - Email delivery for notifications
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import EmailService from './emailService.js';

class NotificationService {
  constructor() {
    this.emailService = new EmailService();
    this.notificationHistory = [];
    this.notificationThresholds = {
      failedReminders: 3, // Notify after 3 failed reminders
      lowSMSCredits: 10,  // Notify when credits below 10
      apiQuotaWarning: 0.9 // Notify at 90% quota usage
    };
  }

  /**
   * Send notification to user
   * @param {Object} params - Notification parameters
   * @returns {Promise<Object>} Result with success status
   */
  async sendNotification(params) {
    const {
      to,
      type,
      subject,
      message,
      severity = 'info', // info, warning, error
      metadata = {}
    } = params;

    try {
      // Log notification
      const notification = {
        id: this._generateId(),
        to,
        type,
        subject,
        message,
        severity,
        metadata,
        sentAt: new Date(),
        status: 'pending'
      };

      this.notificationHistory.push(notification);

      // Send notification via email
      const emailResult = await this.emailService.sendEmail({
        to,
        subject: this._formatSubject(subject, severity),
        text: message,
        html: this._formatHTMLMessage(message, severity, type)
      });

      // Update notification status
      notification.status = emailResult.success ? 'sent' : 'failed';
      notification.error = emailResult.error;
      notification.messageId = emailResult.messageId;

      return {
        success: emailResult.success,
        notificationId: notification.id,
        error: emailResult.error
      };
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Notify user about multiple failed reminders
   * Requirements: 13.2
   * @param {Object} params - Failed reminder details
   */
  async notifyFailedReminders(params) {
    const {
      userEmail,
      failedCount,
      invoiceIds,
      errors
    } = params;

    const subject = `⚠️ ${failedCount} Reminder${failedCount > 1 ? 's' : ''} Failed to Send`;
    
    const message = `
Hello,

We encountered issues sending ${failedCount} payment reminder${failedCount > 1 ? 's' : ''}.

Failed Invoices:
${invoiceIds.map((id, index) => `- Invoice ${id}: ${errors[index] || 'Unknown error'}`).join('\n')}

Please check your service configurations and try again. If the problem persists, contact support.

Best regards,
Invoice Guard System
    `.trim();

    return await this.sendNotification({
      to: userEmail,
      type: 'failed_reminders',
      subject,
      message,
      severity: 'error',
      metadata: {
        failedCount,
        invoiceIds,
        errors
      }
    });
  }

  /**
   * Notify user about API quota exceeded
   * Requirements: 13.4
   * @param {Object} params - API quota details
   */
  async notifyAPIQuotaExceeded(params) {
    const {
      userEmail,
      service, // 'ai', 'email', 'sms'
      quotaLimit,
      currentUsage,
      resetDate
    } = params;

    const subject = `🚨 ${service.toUpperCase()} API Quota Exceeded`;
    
    const message = `
Hello,

Your ${service.toUpperCase()} API quota has been exceeded.

Current Usage: ${currentUsage}
Quota Limit: ${quotaLimit}
Reset Date: ${resetDate ? new Date(resetDate).toLocaleDateString() : 'Unknown'}

Automated reminders have been paused. Please upgrade your plan or wait for the quota to reset.

To resume reminders:
1. Upgrade your ${service} service plan
2. Update your API credentials in settings
3. Resume reminders from the dashboard

Best regards,
Invoice Guard System
    `.trim();

    return await this.sendNotification({
      to: userEmail,
      type: 'api_quota_exceeded',
      subject,
      message,
      severity: 'error',
      metadata: {
        service,
        quotaLimit,
        currentUsage,
        resetDate
      }
    });
  }

  /**
   * Notify user about low SMS credits
   * Requirements: 13.5, 10.5
   * @param {Object} params - SMS credit details
   */
  async notifyLowSMSCredits(params) {
    const {
      userEmail,
      currentBalance,
      threshold = 10
    } = params;

    const subject = `⚠️ Low SMS Credits - ${currentBalance.toFixed(2)} Remaining`;
    
    const message = `
Hello,

Your SMS credit balance is running low.

Current Balance: $${currentBalance.toFixed(2)}
Threshold: $${threshold.toFixed(2)}

To avoid interruption of SMS reminders:
1. Add credits to your Twilio account
2. Update your SMS service configuration
3. Monitor your usage in the dashboard

SMS reminders will continue until credits are depleted.

Best regards,
Invoice Guard System
    `.trim();

    return await this.sendNotification({
      to: userEmail,
      type: 'low_sms_credits',
      subject,
      message,
      severity: 'warning',
      metadata: {
        currentBalance,
        threshold
      }
    });
  }

  /**
   * Notify user about API service down
   * Requirements: 13.3
   * @param {Object} params - Service status details
   */
  async notifyServiceDown(params) {
    const {
      userEmail,
      service, // 'ai', 'email', 'sms'
      error,
      lastAttempt
    } = params;

    const subject = `🔴 ${service.toUpperCase()} Service Unavailable`;
    
    const message = `
Hello,

The ${service.toUpperCase()} service is currently unavailable.

Service: ${service}
Error: ${error}
Last Attempt: ${lastAttempt ? new Date(lastAttempt).toLocaleString() : 'Unknown'}

Automated reminders have been paused. The system will attempt to reconnect automatically.

Actions you can take:
1. Check ${service} service status page
2. Verify your API credentials
3. Check your account status
4. Contact ${service} support if needed

The system will resume automatically once the service is available.

Best regards,
Invoice Guard System
    `.trim();

    return await this.sendNotification({
      to: userEmail,
      type: 'service_down',
      subject,
      message,
      severity: 'error',
      metadata: {
        service,
        error,
        lastAttempt
      }
    });
  }

  /**
   * Notify user about scheduler failure
   * Requirements: 13.5
   * @param {Object} params - Scheduler error details
   */
  async notifySchedulerFailure(params) {
    const {
      userEmail,
      error,
      timestamp
    } = params;

    const subject = `🔴 Scheduler Service Failed`;
    
    const message = `
Hello,

The automated reminder scheduler has encountered an error and stopped.

Error: ${error}
Timestamp: ${timestamp ? new Date(timestamp).toLocaleString() : 'Unknown'}

Automated reminders are currently paused. Please restart the scheduler from the dashboard or contact support.

Best regards,
Invoice Guard System
    `.trim();

    return await this.sendNotification({
      to: userEmail,
      type: 'scheduler_failure',
      subject,
      message,
      severity: 'error',
      metadata: {
        error,
        timestamp
      }
    });
  }

  /**
   * Check if notification should be sent based on thresholds
   * @param {string} type - Notification type
   * @param {Object} data - Data to check against thresholds
   * @returns {boolean}
   */
  shouldNotify(type, data) {
    switch (type) {
      case 'failed_reminders':
        return data.failedCount >= this.notificationThresholds.failedReminders;
      
      case 'low_sms_credits':
        return data.currentBalance < this.notificationThresholds.lowSMSCredits;
      
      case 'api_quota_warning':
        return (data.currentUsage / data.quotaLimit) >= this.notificationThresholds.apiQuotaWarning;
      
      default:
        return true; // Send all other notifications
    }
  }

  /**
   * Get notification history
   * @param {Object} filters - Optional filters
   * @returns {Array} Notification history
   */
  getNotificationHistory(filters = {}) {
    let history = [...this.notificationHistory];

    if (filters.type) {
      history = history.filter(n => n.type === filters.type);
    }

    if (filters.severity) {
      history = history.filter(n => n.severity === filters.severity);
    }

    if (filters.status) {
      history = history.filter(n => n.status === filters.status);
    }

    if (filters.since) {
      const sinceDate = new Date(filters.since);
      history = history.filter(n => n.sentAt >= sinceDate);
    }

    return history.sort((a, b) => b.sentAt - a.sentAt);
  }

  /**
   * Clear notification history
   */
  clearHistory() {
    this.notificationHistory = [];
  }

  /**
   * Format subject with severity indicator
   * @private
   */
  _formatSubject(subject, severity) {
    const indicators = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨'
    };
    
    const indicator = indicators[severity] || indicators.info;
    return `${indicator} ${subject}`;
  }

  /**
   * Format HTML message with styling
   * @private
   */
  _formatHTMLMessage(message, severity, type) {
    const colors = {
      info: '#3B82F6',
      warning: '#F59E0B',
      error: '#EF4444'
    };

    const color = colors[severity] || colors.info;

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .notification-container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-left: 4px solid ${color};
    }
    .notification-header {
      color: ${color};
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 20px;
      text-transform: uppercase;
    }
    .notification-content {
      white-space: pre-wrap;
      margin-bottom: 20px;
    }
    .notification-footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      margin-top: 20px;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="notification-container">
    <div class="notification-header">${type.replace(/_/g, ' ')}</div>
    <div class="notification-content">${message}</div>
    <div class="notification-footer">
      <p>This is an automated notification from Invoice Guard.</p>
      <p>© ${new Date().getFullYear()} Invoice Guard. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
export { NotificationService };
