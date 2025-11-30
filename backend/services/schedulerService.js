/**
 * Scheduler Service - Automated reminder scheduling
 * 
 * Features:
 * - Periodic checks for overdue invoices
 * - Business hours compliance
 * - Weekend exclusion
 * - Reminder interval enforcement
 * - Integration with AI, Email, and SMS services
 * - Opt-out checking
 * - Pause/resume functionality
 */

import cron from 'node-cron';
import ClientContact from '../models/ClientContact.js';
import ReminderLog from '../models/ReminderLog.js';
import ReminderConfig from '../models/ReminderConfig.js';
import AIService from './aiService.js';
import EmailService from './emailService.js';
import smsService from './smsService.js';
import notificationService from './notificationService.js';

class SchedulerService {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
    this.aiService = new AIService();
    this.emailService = new EmailService();
    this.smsService = smsService;
    this.notificationService = notificationService;
    this.pausedInvoices = new Set(); // Track paused invoices
    this.failedReminders = []; // Track failed reminders for notification
    this.userEmail = process.env.USER_EMAIL || 'admin@invoiceguard.com'; // Default user email
  }

  /**
   * Start the scheduler
   * Runs every 6 hours by default
   */
  start(schedule = '0 */6 * * *') {
    if (this.cronJob) {
      console.log('⚠️  Scheduler is already running');
      return;
    }

    console.log(`🚀 Starting scheduler with schedule: ${schedule}`);
    
    this.cronJob = cron.schedule(schedule, async () => {
      console.log('⏰ Scheduler triggered at', new Date().toISOString());
      await this.checkOverdueInvoices();
    });

    this.isRunning = true;
    console.log('✅ Scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
      console.log('🛑 Scheduler stopped');
    }
  }

  /**
   * Pause reminders for a specific invoice
   * @param {string} invoiceId - Invoice ID to pause
   */
  pauseReminders(invoiceId) {
    this.pausedInvoices.add(invoiceId);
    console.log(`⏸️  Reminders paused for invoice: ${invoiceId}`);
  }

  /**
   * Resume reminders for a specific invoice
   * @param {string} invoiceId - Invoice ID to resume
   */
  resumeReminders(invoiceId) {
    this.pausedInvoices.delete(invoiceId);
    console.log(`▶️  Reminders resumed for invoice: ${invoiceId}`);
  }

  /**
   * Check if reminders are paused for an invoice
   * @param {string} invoiceId
   * @returns {boolean}
   */
  isPaused(invoiceId) {
    return this.pausedInvoices.has(invoiceId);
  }

  /**
   * Main method to check for overdue invoices and send reminders
   */
  async checkOverdueInvoices() {
    try {
      console.log('🔍 Checking for overdue invoices...');

      // Reset failed reminders tracking for this run
      this.failedReminders = [];

      // Get reminder configuration (assuming single user for now)
      const config = await ReminderConfig.findOne({ enabled: true });
      
      if (!config) {
        console.log('⚠️  No active reminder configuration found');
        return;
      }

      // Get all invoices (this would come from your invoice storage)
      // For now, we'll need to integrate with the invoice system
      const invoices = await this.getOverdueInvoices();
      
      console.log(`📋 Found ${invoices.length} overdue invoices`);

      for (const invoice of invoices) {
        try {
          await this.processInvoice(invoice, config);
        } catch (error) {
          console.error(`❌ Error processing invoice ${invoice.id}:`, error);
          
          // Track failed reminder
          this.failedReminders.push({
            invoiceId: invoice.id,
            error: error.message
          });
        }
      }

      // Check if we should notify about failed reminders
      if (this.failedReminders.length >= 3) {
        await this.notifyFailedReminders();
      }

      console.log('✅ Overdue invoice check completed');
    } catch (error) {
      console.error('❌ Error in checkOverdueInvoices:', error);
      
      // Notify about scheduler failure
      await this.notifySchedulerFailure(error);
    }
  }

  /**
   * Process a single invoice for reminder sending
   * @param {Object} invoice - Invoice object
   * @param {Object} config - Reminder configuration
   */
  async processInvoice(invoice, config) {
    // Check if reminders are paused for this invoice
    if (this.isPaused(invoice.id)) {
      console.log(`⏸️  Skipping paused invoice: ${invoice.id}`);
      return;
    }

    // Check if client has opted out
    const contact = await ClientContact.findOne({ invoiceId: invoice.id });
    if (!contact) {
      console.log(`⚠️  No contact found for invoice: ${invoice.id}`);
      return;
    }

    if (contact.optedOut) {
      console.log(`🚫 Client opted out for invoice: ${invoice.id}`);
      return;
    }

    // Get reminder history
    const reminderHistory = await ReminderLog.find({ 
      invoiceId: invoice.id,
      status: 'sent'
    }).sort({ sentAt: -1 });

    // Check if max reminders reached
    if (reminderHistory.length >= config.maxReminders) {
      console.log(`📊 Max reminders reached for invoice: ${invoice.id}`);
      return;
    }

    // Check if we should send a reminder based on all constraints
    const shouldSend = await this.shouldSendReminder(invoice, config, reminderHistory);
    
    if (shouldSend.send) {
      await this.sendReminder(invoice, contact, config, reminderHistory.length);
    } else {
      console.log(`⏭️  Skipping invoice ${invoice.id}: ${shouldSend.reason}`);
    }
  }

  /**
   * Determine if a reminder should be sent based on all constraints
   * @param {Object} invoice - Invoice object
   * @param {Object} config - Reminder configuration
   * @param {Array} reminderHistory - Previous reminders
   * @returns {Object} - { send: boolean, reason: string }
   */
  async shouldSendReminder(invoice, config, reminderHistory) {
    const now = new Date();

    // Check budget limit enforcement (Requirements: 14.5)
    try {
      const { checkBudgetLimit } = await import('../routes/costs.js');
      const budgetCheck = await checkBudgetLimit(config.userId);
      
      if (!budgetCheck.withinBudget && budgetCheck.limitReached) {
        return { 
          send: false, 
          reason: 'Monthly budget limit reached' 
        };
      }
    } catch (error) {
      console.error('❌ Error checking budget limit:', error);
      // Continue with other checks if budget check fails
    }

    // Check interval enforcement
    if (reminderHistory.length > 0) {
      const lastReminder = reminderHistory[0];
      const daysSinceLastReminder = this.daysBetween(lastReminder.sentAt, now);
      
      if (daysSinceLastReminder < config.intervalDays) {
        return { 
          send: false, 
          reason: `Interval not met (${daysSinceLastReminder} < ${config.intervalDays} days)` 
        };
      }
    }

    // Check weekend exclusion
    if (config.excludeWeekends && this.isWeekend(now)) {
      return { 
        send: false, 
        reason: 'Weekend excluded' 
      };
    }

    // Check business hours
    if (config.businessHoursOnly && !this.isWithinBusinessHours(now, config.businessHours)) {
      return { 
        send: false, 
        reason: 'Outside business hours' 
      };
    }

    return { send: true, reason: 'All checks passed' };
  }

  /**
   * Send a reminder for an invoice
   * @param {Object} invoice - Invoice object
   * @param {Object} contact - Client contact
   * @param {Object} config - Reminder configuration
   * @param {number} previousReminders - Count of previous reminders
   */
  async sendReminder(invoice, contact, config, previousReminders) {
    try {
      console.log(`📤 Sending reminder for invoice: ${invoice.id}`);

      // Calculate days overdue
      const daysOverdue = this.daysBetween(new Date(invoice.dueDate), new Date());
      
      // Determine escalation level
      const escalationLevel = this.getEscalationLevel(daysOverdue, config.escalationLevels);

      // Generate AI message with error handling
      let message;
      try {
        message = await this.aiService.generateReminder({
          clientName: contact.clientName,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          dueDate: invoice.dueDate,
          daysOverdue,
          escalationLevel,
          paymentDetails: invoice.paymentDetails || {},
          previousReminders
        });
      } catch (aiError) {
        console.error('❌ AI service error:', aiError);
        
        // Check if it's a quota error
        if (aiError.message.includes('quota') || aiError.message.includes('limit')) {
          await this.notifyAPIQuotaExceeded('ai', 'unknown', 'exceeded', null);
        } else {
          await this.notifyServiceDown('ai', aiError, new Date().toISOString());
        }
        
        throw aiError;
      }

      // Send via configured channels
      const results = [];
      
      for (const channel of config.channels) {
        try {
          let result;
          
          if (channel === 'email' && contact.email) {
            result = await this.sendEmailReminder(contact.email, invoice, message, escalationLevel);
            
            // Check for email service errors
            if (!result.success && result.error) {
              if (result.error.includes('quota') || result.error.includes('limit')) {
                await this.notifyAPIQuotaExceeded('email', 'unknown', 'exceeded', null);
              }
            }
          } else if (channel === 'sms' && contact.phone) {
            result = await this.sendSMSReminder(contact.phone, invoice, message);
            
            // Check for SMS service errors and low credits
            if (!result.success && result.error) {
              if (result.error.includes('credits') || result.error.includes('balance')) {
                await this.checkAndNotifyLowSMSCredits();
              }
            }
          }

          if (result) {
            // Log the reminder
            await this.logReminder({
              invoiceId: invoice.id,
              channel,
              status: result.success ? 'sent' : 'failed',
              message,
              escalationLevel,
              error: result.error,
              cost: result.cost
            });

            results.push(result);
          }
        } catch (error) {
          console.error(`❌ Error sending ${channel} reminder:`, error);
          
          // Log failed reminder
          await this.logReminder({
            invoiceId: invoice.id,
            channel,
            status: 'failed',
            message,
            escalationLevel,
            error: error.message
          });
        }
      }

      console.log(`✅ Reminder sent for invoice ${invoice.id}:`, results);
      return results;
    } catch (error) {
      console.error(`❌ Error in sendReminder for invoice ${invoice.id}:`, error);
      throw error;
    }
  }

  /**
   * Send email reminder
   * @private
   */
  async sendEmailReminder(email, invoice, message, escalationLevel) {
    const subject = this.emailService.generateSubject(invoice.invoiceNumber, escalationLevel);
    
    return await this.emailService.sendEmail({
      to: email,
      subject,
      text: message,
      html: message.replace(/\n/g, '<br>'),
      invoiceId: invoice.id
    });
  }

  /**
   * Send SMS reminder
   * @private
   */
  async sendSMSReminder(phone, invoice, message) {
    // Truncate message for SMS
    const smsMessage = this.smsService.truncateMessage(
      `Invoice ${invoice.invoiceNumber}: ${message.substring(0, 100)}...`
    );
    
    return await this.smsService.sendSMS({
      to: phone,
      message: smsMessage,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber
      }
    });
  }

  /**
   * Log a reminder to the database
   * @private
   */
  async logReminder(data) {
    try {
      const log = new ReminderLog({
        invoiceId: data.invoiceId,
        channel: data.channel,
        status: data.status,
        message: data.message,
        escalationLevel: data.escalationLevel,
        sentAt: new Date(),
        error: data.error,
        cost: data.cost
      });

      if (data.status === 'sent') {
        log.deliveredAt = new Date();
      }

      await log.save();
      console.log(`📝 Reminder logged: ${data.invoiceId} via ${data.channel}`);
    } catch (error) {
      console.error('❌ Error logging reminder:', error);
    }
  }

  /**
   * Get overdue invoices
   * This method should integrate with your invoice storage system
   * @private
   */
  async getOverdueInvoices() {
    // TODO: Integrate with actual invoice storage
    // For now, return empty array
    // In production, this would query your invoice database/storage
    
    // Example implementation:
    // const invoices = await Invoice.find({ 
    //   status: 'pending',
    //   dueDate: { $lt: new Date() }
    // });
    
    return [];
  }

  /**
   * Determine escalation level based on days overdue
   * @private
   */
  getEscalationLevel(daysOverdue, escalationLevels) {
    if (daysOverdue >= escalationLevels.urgent.minDays) {
      return 'urgent';
    } else if (daysOverdue >= escalationLevels.firm.minDays && 
               daysOverdue <= escalationLevels.firm.maxDays) {
      return 'firm';
    } else {
      return 'gentle';
    }
  }

  /**
   * Check if date is within business hours
   * @private
   */
  isWithinBusinessHours(date, businessHours) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;
    
    const [startHour, startMin] = businessHours.start.split(':').map(Number);
    const startTimeInMinutes = startHour * 60 + startMin;
    
    const [endHour, endMin] = businessHours.end.split(':').map(Number);
    const endTimeInMinutes = endHour * 60 + endMin;
    
    return currentTimeInMinutes >= startTimeInMinutes && 
           currentTimeInMinutes < endTimeInMinutes;
  }

  /**
   * Check if date is a weekend
   * @private
   */
  isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  /**
   * Calculate days between two dates
   * @private
   */
  daysBetween(date1, date2) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.abs(Math.floor((date2 - date1) / msPerDay));
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pausedInvoices: Array.from(this.pausedInvoices),
      cronSchedule: this.cronJob ? 'Active' : 'Inactive'
    };
  }

  /**
   * Notify user about failed reminders
   * Requirements: 13.2
   * @private
   */
  async notifyFailedReminders() {
    try {
      const invoiceIds = this.failedReminders.map(f => f.invoiceId);
      const errors = this.failedReminders.map(f => f.error);

      await this.notificationService.notifyFailedReminders({
        userEmail: this.userEmail,
        failedCount: this.failedReminders.length,
        invoiceIds,
        errors
      });

      console.log(`📧 Sent notification about ${this.failedReminders.length} failed reminders`);
    } catch (error) {
      console.error('❌ Error sending failed reminders notification:', error);
    }
  }

  /**
   * Notify user about scheduler failure
   * Requirements: 13.5
   * @private
   */
  async notifySchedulerFailure(error) {
    try {
      await this.notificationService.notifySchedulerFailure({
        userEmail: this.userEmail,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      console.log('📧 Sent notification about scheduler failure');
    } catch (notifyError) {
      console.error('❌ Error sending scheduler failure notification:', notifyError);
    }
  }

  /**
   * Check and notify about low SMS credits
   * Requirements: 13.5, 10.5
   */
  async checkAndNotifyLowSMSCredits() {
    try {
      const creditCheck = await this.smsService.checkLowCredits();
      
      if (creditCheck.isLow) {
        await this.notificationService.notifyLowSMSCredits({
          userEmail: this.userEmail,
          currentBalance: creditCheck.balance,
          threshold: creditCheck.threshold
        });

        console.log(`📧 Sent notification about low SMS credits: $${creditCheck.balance.toFixed(2)}`);
      }
    } catch (error) {
      console.error('❌ Error checking/notifying low SMS credits:', error);
    }
  }

  /**
   * Notify about API quota exceeded
   * Requirements: 13.4
   */
  async notifyAPIQuotaExceeded(service, quotaLimit, currentUsage, resetDate) {
    try {
      await this.notificationService.notifyAPIQuotaExceeded({
        userEmail: this.userEmail,
        service,
        quotaLimit,
        currentUsage,
        resetDate
      });

      console.log(`📧 Sent notification about ${service} API quota exceeded`);
    } catch (error) {
      console.error('❌ Error sending API quota notification:', error);
    }
  }

  /**
   * Notify about service down
   * Requirements: 13.3
   */
  async notifyServiceDown(service, error, lastAttempt) {
    try {
      await this.notificationService.notifyServiceDown({
        userEmail: this.userEmail,
        service,
        error: error.message || error,
        lastAttempt: lastAttempt || new Date().toISOString()
      });

      console.log(`📧 Sent notification about ${service} service down`);
    } catch (notifyError) {
      console.error('❌ Error sending service down notification:', notifyError);
    }
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

export default schedulerService;
export { SchedulerService };
