/**
 * Reminder Routes - API endpoints for manual reminder controls
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import express from 'express';
import { ReminderLog, ClientContact } from '../models/index.js';
import schedulerService from '../services/schedulerService.js';
import AIService from '../services/aiService.js';
import EmailService from '../services/emailService.js';
import smsService from '../services/smsService.js';
import { reminderLimiter } from '../middleware/rateLimiter.js';
import { auditLogger } from '../middleware/auditLog.js';

const router = express.Router();

// Initialize services
const aiService = new AIService();
const emailService = new EmailService();

// In-memory storage for paused invoices (replace with database in production)
const pausedInvoices = new Set();

/**
 * POST /api/reminders/send-now
 * Manually trigger an immediate reminder for an invoice
 * Requirement 11.1: Manual trigger functionality
 * Requirement 11.5: Log manual reminder in history
 */
router.post('/send-now', reminderLimiter, auditLogger('SEND_REMINDER', 'reminder'), async (req, res) => {
  try {
    const { 
      invoiceId, 
      channel, 
      invoiceData,
      escalationLevel,
      useAI = true 
    } = req.body;

    // Validate required fields
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Invoice ID is required'
      });
    }

    if (!channel || !['email', 'sms', 'both'].includes(channel)) {
      return res.status(400).json({
        success: false,
        error: 'Valid channel (email, sms, or both) is required'
      });
    }

    if (!invoiceData) {
      return res.status(400).json({
        success: false,
        error: 'Invoice data is required (clientName, invoiceNumber, amount, dueDate, paymentDetails)'
      });
    }

    const validEscalationLevel = escalationLevel || 'gentle';
    if (!['gentle', 'firm', 'urgent'].includes(validEscalationLevel)) {
      return res.status(400).json({
        success: false,
        error: 'Valid escalation level (gentle, firm, or urgent) is required'
      });
    }

    // Get client contact information
    const contact = await ClientContact.findOne({ invoiceId });
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Client contact not found for this invoice'
      });
    }

    // Check if client has opted out
    if (contact.optedOut) {
      return res.status(403).json({
        success: false,
        error: 'Client has opted out of reminders'
      });
    }

    // Calculate days overdue
    const dueDate = new Date(invoiceData.dueDate);
    const today = new Date();
    const daysOverdue = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));

    // Get previous reminder count
    const previousReminders = await ReminderLog.countDocuments({ invoiceId });

    // Generate message using AI or template
    let message;
    try {
      if (useAI) {
        message = await aiService.generateReminder({
          clientName: invoiceData.clientName || contact.clientName,
          invoiceNumber: invoiceData.invoiceNumber,
          amount: invoiceData.amount,
          dueDate: invoiceData.dueDate,
          daysOverdue,
          escalationLevel: validEscalationLevel,
          paymentDetails: invoiceData.paymentDetails || {},
          previousReminders
        });
      } else {
        // Use template-based message
        message = aiService._generateTemplateMessage({
          clientName: invoiceData.clientName || contact.clientName,
          invoiceNumber: invoiceData.invoiceNumber,
          amount: invoiceData.amount,
          dueDate: invoiceData.dueDate,
          daysOverdue,
          escalationLevel: validEscalationLevel,
          paymentDetails: invoiceData.paymentDetails || {}
        });
      }
    } catch (aiError) {
      console.error('AI message generation failed, using template:', aiError);
      message = aiService._generateTemplateMessage({
        clientName: invoiceData.clientName || contact.clientName,
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.amount,
        dueDate: invoiceData.dueDate,
        daysOverdue,
        escalationLevel: validEscalationLevel,
        paymentDetails: invoiceData.paymentDetails || {}
      });
    }

    const results = [];
    const channels = channel === 'both' ? ['email', 'sms'] : [channel];

    // Send via each channel
    for (const ch of channels) {
      try {
        // Create reminder log entry with pending status
        const reminderLog = new ReminderLog({
          invoiceId,
          channel: ch,
          status: 'pending',
          message,
          escalationLevel: validEscalationLevel,
          sentAt: new Date()
        });

        await reminderLog.save();

        let deliveryResult;
        let cost = 0;

        if (ch === 'email') {
          // Send via email
          if (!contact.email) {
            throw new Error('Email address not available for this contact');
          }

          const subject = emailService.generateSubject(
            invoiceData.invoiceNumber, 
            validEscalationLevel
          );

          deliveryResult = await emailService.sendEmail({
            to: contact.email,
            subject,
            html: message,
            text: message.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
            reminderLogId: reminderLog._id
          });

          cost = emailService.getEstimatedCost();

        } else if (ch === 'sms') {
          // Send via SMS
          if (!contact.phone) {
            throw new Error('Phone number not available for this contact');
          }

          // Initialize SMS service if needed
          await smsService.initialize();

          deliveryResult = await smsService.sendSMS({
            to: contact.phone,
            message,
            priority: 'high',
            metadata: {
              invoiceId,
              escalationLevel: validEscalationLevel
            }
          });

          cost = deliveryResult.cost || 0;
        }

        // Update reminder log with delivery status
        if (deliveryResult && deliveryResult.success) {
          reminderLog.status = 'sent';
          reminderLog.deliveredAt = new Date();
          reminderLog.cost = cost;
        } else {
          reminderLog.status = 'failed';
          reminderLog.error = deliveryResult?.error || 'Unknown error';
        }

        await reminderLog.save();

        results.push({
          channel: ch,
          success: deliveryResult?.success || false,
          messageId: deliveryResult?.messageId,
          error: deliveryResult?.error,
          logId: reminderLog._id,
          cost
        });

      } catch (channelError) {
        console.error(`Error sending ${ch} reminder:`, channelError);
        results.push({
          channel: ch,
          success: false,
          error: channelError.message
        });
      }
    }

    // Determine overall success
    const allSuccessful = results.every(r => r.success);
    const anySuccessful = results.some(r => r.success);

    // Requirement 11.5: Log manual reminder in history
    res.status(allSuccessful ? 201 : (anySuccessful ? 207 : 500)).json({
      success: allSuccessful,
      partial: anySuccessful && !allSuccessful,
      message: allSuccessful 
        ? 'Reminder sent successfully' 
        : anySuccessful 
          ? 'Reminder partially sent'
          : 'Failed to send reminder',
      data: {
        invoiceId,
        results,
        totalCost: results.reduce((sum, r) => sum + (r.cost || 0), 0)
      }
    });

  } catch (error) {
    console.error('Error sending manual reminder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send reminder',
      message: error.message
    });
  }
});

/**
 * POST /api/reminders/pause
 * Pause automated reminders for a specific invoice
 * Requirement 11.2, 11.3: Pause functionality
 */
router.post('/pause', auditLogger('PAUSE_REMINDER', 'reminder'), async (req, res) => {
  try {
    const { invoiceId } = req.body;

    // Validate required fields
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Invoice ID is required'
      });
    }

    // Add invoice to paused set
    pausedInvoices.add(invoiceId);
    
    // Also pause in scheduler service
    schedulerService.pauseReminders(invoiceId);

    res.json({
      success: true,
      message: 'Automated reminders paused for this invoice',
      data: {
        invoiceId,
        paused: true,
        pausedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error pausing reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause reminders',
      message: error.message
    });
  }
});

/**
 * POST /api/reminders/resume
 * Resume automated reminders for a specific invoice
 * Requirement 11.4: Resume functionality
 */
router.post('/resume', auditLogger('RESUME_REMINDER', 'reminder'), async (req, res) => {
  try {
    const { invoiceId } = req.body;

    // Validate required fields
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Invoice ID is required'
      });
    }

    // Check if invoice was paused
    if (!pausedInvoices.has(invoiceId)) {
      return res.status(400).json({
        success: false,
        error: 'This invoice does not have paused reminders'
      });
    }

    // Remove invoice from paused set
    pausedInvoices.delete(invoiceId);
    
    // Also resume in scheduler service
    schedulerService.resumeReminders(invoiceId);

    res.json({
      success: true,
      message: 'Automated reminders resumed for this invoice',
      data: {
        invoiceId,
        paused: false,
        resumedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error resuming reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume reminders',
      message: error.message
    });
  }
});

/**
 * GET /api/reminders/status/:invoiceId
 * Check if reminders are paused for a specific invoice
 * Helper endpoint for checking pause status
 */
router.get('/status/:invoiceId', (req, res) => {
  try {
    const { invoiceId } = req.params;

    const isPaused = pausedInvoices.has(invoiceId);

    res.json({
      success: true,
      data: {
        invoiceId,
        paused: isPaused
      }
    });

  } catch (error) {
    console.error('Error checking reminder status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check reminder status',
      message: error.message
    });
  }
});

/**
 * Helper function to check if reminders are paused for an invoice
 * Can be used by scheduler service
 * @param {string} invoiceId - The invoice ID to check
 * @returns {boolean} - True if reminders are paused
 */
export function isReminderPaused(invoiceId) {
  return pausedInvoices.has(invoiceId);
}

export default router;
