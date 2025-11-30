/**
 * SMS Routes for Invoice Guard
 * Handles SMS sending, status webhooks, and management
 */

import express from 'express';
import smsService from '../services/smsService.js';
import ReminderLog from '../models/ReminderLog.js';
import ServiceConfig from '../models/ServiceConfig.js';

const router = express.Router();

/**
 * Send SMS reminder
 * POST /api/sms/send
 */
router.post('/send', async (req, res) => {
  try {
    const {
      to,
      message,
      priority = 'normal',
      invoiceId,
      clientId,
      reminderType = 'payment'
    } = req.body;

    // Validate required fields
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    // Send SMS
    const result = await smsService.sendSMS({
      to,
      message,
      priority,
      metadata: {
        invoiceId,
        clientId,
        reminderType,
        source: 'manual'
      }
    });

    // Log the reminder attempt
    if (invoiceId) {
      await ReminderLog.create({
        invoiceId,
        clientId,
        type: reminderType,
        method: 'sms',
        provider: 'twilio',
        messageId: result.messageId,
        status: result.success ? 'sent' : 'failed',
        cost: result.cost || 0,
        error: result.error,
        metadata: {
          phoneNumber: to,
          messageLength: message.length,
          priority
        }
      });
    }

    res.json({
      success: result.success,
      messageId: result.messageId,
      cost: result.cost,
      error: result.error
    });

  } catch (error) {
    console.error('SMS send error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get SMS delivery status
 * GET /api/sms/status/:messageId
 */
router.get('/status/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const status = smsService.getDeliveryStatus(messageId);
    
    res.json({
      success: true,
      messageId,
      ...status
    });
  } catch (error) {
    console.error('SMS status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get SMS statistics
 * GET /api/sms/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = smsService.getStatistics();
    
    // Get additional stats from database
    const dbStats = await ReminderLog.findAll({
      where: { method: 'sms' },
      attributes: [
        'status',
        'provider',
        'cost',
        'createdAt'
      ]
    });

    // Combine stats
    const combinedStats = {
      ...stats,
      database: {
        total: dbStats.length,
        byStatus: {},
        totalCost: 0,
        recentActivity: dbStats
          .filter(log => new Date() - new Date(log.createdAt) < 24 * 60 * 60 * 1000)
          .length
      }
    };

    // Calculate database stats
    dbStats.forEach(log => {
      combinedStats.database.byStatus[log.status] = 
        (combinedStats.database.byStatus[log.status] || 0) + 1;
      
      combinedStats.database.totalCost += parseFloat(log.cost || 0);
    });

    res.json({
      success: true,
      stats: combinedStats
    });
  } catch (error) {
    console.error('SMS stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Configure SMS service
 * POST /api/sms/config
 */
router.post('/config', async (req, res) => {
  try {
    const {
      accountSid,
      authToken,
      phoneNumber,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!accountSid || !authToken || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Account SID, Auth Token, and Phone Number are required'
      });
    }

    // Get existing config or create new
    let config = await ServiceConfig.findOne({ where: { service: 'sms' } });
    
    if (config) {
      // Update existing config
      config.settings = {
        accountSid,
        authToken,
        phoneNumber
      };
      config.isActive = isActive;
      await config.save();
    } else {
      // Create new config
      config = await ServiceConfig.create({
        service: 'sms',
        settings: {
          accountSid,
          authToken,
          phoneNumber
        },
        isActive
      });
    }

    // Reinitialize SMS service with new config
    await smsService.initialize();

    res.json({
      success: true,
      message: 'SMS configuration updated',
      config: {
        service: config.service,
        isActive: config.isActive,
        phoneNumber: config.settings.phoneNumber
      }
    });

  } catch (error) {
    console.error('SMS config error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get SMS configuration
 * GET /api/sms/config
 */
router.get('/config', async (req, res) => {
  try {
    const config = await ServiceConfig.findOne({ where: { service: 'sms' } });
    
    if (!config) {
      return res.json({
        success: true,
        config: {
          service: 'sms',
          isActive: false,
          configured: false
        }
      });
    }

    // Return config without sensitive data
    const safeConfig = {
      service: config.service,
      isActive: config.isActive,
      configured: true,
      phoneNumber: config.settings.phoneNumber
    };

    res.json({
      success: true,
      config: safeConfig
    });

  } catch (error) {
    console.error('SMS config get error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test SMS configuration
 * POST /api/sms/test
 */
router.post('/test', async (req, res) => {
  try {
    const {
      to,
      message = 'This is a test message from Invoice Guard SMS service.'
    } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required for testing'
      });
    }

    const result = await smsService.sendSMS({
      to,
      message,
      priority: 'normal',
      metadata: {
        test: true,
        source: 'configuration_test'
      }
    });

    res.json({
      success: result.success,
      message: result.success ? 'Test SMS sent successfully' : 'Test SMS failed',
      messageId: result.messageId,
      cost: result.cost,
      error: result.error
    });

  } catch (error) {
    console.error('SMS test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get SMS credit balance
 * GET /api/sms/balance
 */
router.get('/balance', async (req, res) => {
  try {
    const balance = await smsService.getBalance();
    
    res.json({
      success: true,
      balance,
      lowBalance: balance < 10
    });
  } catch (error) {
    console.error('SMS balance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Twilio webhook for delivery status
 * POST /api/sms/webhook
 */
router.post('/webhook', (req, res) => {
  try {
    console.log('📱 Twilio webhook received:', req.body);
    
    // Handle delivery status update
    smsService.handleDeliveryWebhook(req.body);
    
    // Update database log if messageId exists
    const { MessageSid, MessageStatus, ErrorMessage } = req.body;
    
    if (MessageSid) {
      ReminderLog.update(
        {
          status: smsService.mapTwilioStatus(MessageStatus),
          error: ErrorMessage,
          metadata: {
            ...req.body,
            webhookReceived: new Date()
          }
        },
        {
          where: { messageId: MessageSid }
        }
      ).catch(error => {
        console.error('Error updating SMS log:', error);
      });
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Twilio webhook error:', error);
    res.status(500).send('Error');
  }
});

export default router;
