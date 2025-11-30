/**
 * Notifications API Routes
 * Handles user notifications for system events
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import express from 'express';
import notificationService from '../services/notificationService.js';

const router = express.Router();

/**
 * POST /api/notifications
 * Send a notification to a user
 * 
 * Body:
 * - to: string (email address)
 * - type: string (notification type)
 * - subject: string
 * - message: string
 * - severity: string (optional: info, warning, error)
 * - metadata: object (optional)
 */
router.post('/', async (req, res) => {
  try {
    const { to, type, subject, message, severity, metadata } = req.body;

    // Validate required fields
    if (!to || !type || !subject || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['to', 'type', 'subject', 'message']
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        error: 'Invalid email address'
      });
    }

    // Send notification
    const result = await notificationService.sendNotification({
      to,
      type,
      subject,
      message,
      severity: severity || 'info',
      metadata: metadata || {}
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        notificationId: result.notificationId,
        message: 'Notification sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send notification'
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/notifications/failed-reminders
 * Notify user about multiple failed reminders
 * 
 * Body:
 * - userEmail: string
 * - failedCount: number
 * - invoiceIds: array of strings
 * - errors: array of strings
 */
router.post('/failed-reminders', async (req, res) => {
  try {
    const { userEmail, failedCount, invoiceIds, errors } = req.body;

    // Validate required fields
    if (!userEmail || !failedCount || !invoiceIds || !errors) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userEmail', 'failedCount', 'invoiceIds', 'errors']
      });
    }

    // Check if notification should be sent based on threshold
    if (!notificationService.shouldNotify('failed_reminders', { failedCount })) {
      return res.status(200).json({
        success: true,
        message: 'Threshold not met, notification not sent',
        threshold: notificationService.notificationThresholds.failedReminders
      });
    }

    // Send notification
    const result = await notificationService.notifyFailedReminders({
      userEmail,
      failedCount,
      invoiceIds,
      errors
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        notificationId: result.notificationId,
        message: 'Failed reminders notification sent'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send notification'
      });
    }
  } catch (error) {
    console.error('Error sending failed reminders notification:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/notifications/api-quota-exceeded
 * Notify user about API quota exceeded
 * 
 * Body:
 * - userEmail: string
 * - service: string (ai, email, sms)
 * - quotaLimit: number
 * - currentUsage: number
 * - resetDate: string (optional)
 */
router.post('/api-quota-exceeded', async (req, res) => {
  try {
    const { userEmail, service, quotaLimit, currentUsage, resetDate } = req.body;

    // Validate required fields
    if (!userEmail || !service || !quotaLimit || !currentUsage) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userEmail', 'service', 'quotaLimit', 'currentUsage']
      });
    }

    // Validate service type
    const validServices = ['ai', 'email', 'sms'];
    if (!validServices.includes(service)) {
      return res.status(400).json({
        error: 'Invalid service type',
        validServices
      });
    }

    // Send notification
    const result = await notificationService.notifyAPIQuotaExceeded({
      userEmail,
      service,
      quotaLimit,
      currentUsage,
      resetDate
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        notificationId: result.notificationId,
        message: 'API quota exceeded notification sent'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send notification'
      });
    }
  } catch (error) {
    console.error('Error sending API quota notification:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/notifications/low-sms-credits
 * Notify user about low SMS credits
 * 
 * Body:
 * - userEmail: string
 * - currentBalance: number
 * - threshold: number (optional)
 */
router.post('/low-sms-credits', async (req, res) => {
  try {
    const { userEmail, currentBalance, threshold } = req.body;

    // Validate required fields
    if (!userEmail || currentBalance === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userEmail', 'currentBalance']
      });
    }

    // Check if notification should be sent based on threshold
    if (!notificationService.shouldNotify('low_sms_credits', { currentBalance })) {
      return res.status(200).json({
        success: true,
        message: 'Threshold not met, notification not sent',
        threshold: notificationService.notificationThresholds.lowSMSCredits
      });
    }

    // Send notification
    const result = await notificationService.notifyLowSMSCredits({
      userEmail,
      currentBalance,
      threshold
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        notificationId: result.notificationId,
        message: 'Low SMS credits notification sent'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send notification'
      });
    }
  } catch (error) {
    console.error('Error sending low SMS credits notification:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/notifications/service-down
 * Notify user about service unavailability
 * 
 * Body:
 * - userEmail: string
 * - service: string (ai, email, sms)
 * - error: string
 * - lastAttempt: string (optional)
 */
router.post('/service-down', async (req, res) => {
  try {
    const { userEmail, service, error, lastAttempt } = req.body;

    // Validate required fields
    if (!userEmail || !service || !error) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userEmail', 'service', 'error']
      });
    }

    // Validate service type
    const validServices = ['ai', 'email', 'sms'];
    if (!validServices.includes(service)) {
      return res.status(400).json({
        error: 'Invalid service type',
        validServices
      });
    }

    // Send notification
    const result = await notificationService.notifyServiceDown({
      userEmail,
      service,
      error,
      lastAttempt
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        notificationId: result.notificationId,
        message: 'Service down notification sent'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send notification'
      });
    }
  } catch (error) {
    console.error('Error sending service down notification:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/notifications/scheduler-failure
 * Notify user about scheduler failure
 * 
 * Body:
 * - userEmail: string
 * - error: string
 * - timestamp: string (optional)
 */
router.post('/scheduler-failure', async (req, res) => {
  try {
    const { userEmail, error, timestamp } = req.body;

    // Validate required fields
    if (!userEmail || !error) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userEmail', 'error']
      });
    }

    // Send notification
    const result = await notificationService.notifySchedulerFailure({
      userEmail,
      error,
      timestamp
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        notificationId: result.notificationId,
        message: 'Scheduler failure notification sent'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send notification'
      });
    }
  } catch (error) {
    console.error('Error sending scheduler failure notification:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/notifications/history
 * Get notification history
 * 
 * Query params:
 * - type: string (optional)
 * - severity: string (optional)
 * - status: string (optional)
 * - since: string (optional, ISO date)
 */
router.get('/history', (req, res) => {
  try {
    const { type, severity, status, since } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (severity) filters.severity = severity;
    if (status) filters.status = status;
    if (since) filters.since = since;

    const history = notificationService.getNotificationHistory(filters);

    res.status(200).json({
      success: true,
      count: history.length,
      notifications: history
    });
  } catch (error) {
    console.error('Error getting notification history:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/notifications/history
 * Clear notification history
 */
router.delete('/history', (req, res) => {
  try {
    notificationService.clearHistory();

    res.status(200).json({
      success: true,
      message: 'Notification history cleared'
    });
  } catch (error) {
    console.error('Error clearing notification history:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
