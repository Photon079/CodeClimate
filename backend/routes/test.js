/**
 * Testing and Preview Routes
 * Provides endpoints for testing AI message generation, email, and SMS delivery
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import express from 'express';
import { createRequire } from 'module';
import smsService from '../services/smsService.js';
import { testLimiter } from '../middleware/rateLimiter.js';
import { auditLogger } from '../middleware/auditLog.js';

const require = createRequire(import.meta.url);
const AIService = require('../services/aiService.js');
const EmailService = require('../services/emailService.js');

const router = express.Router();

/**
 * POST /api/test/ai-message
 * Generate a sample AI message for preview
 * Requirement 15.1, 15.2, 15.3
 */
router.post('/ai-message', testLimiter, auditLogger('TEST_AI_MESSAGE', 'test'), async (req, res) => {
  try {
    const {
      clientName = 'John Doe',
      invoiceNumber = 'INV-001',
      amount = 50000,
      dueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      daysOverdue = 5,
      escalationLevel = 'gentle',
      paymentDetails = {
        upiId: 'example@upi',
        bankDetails: 'Account: 1234567890\nIFSC: BANK0001234'
      },
      previousReminders = 0
    } = req.body;

    // Validate escalation level
    const validLevels = ['gentle', 'firm', 'urgent'];
    if (!validLevels.includes(escalationLevel)) {
      return res.status(400).json({
        success: false,
        error: `Invalid escalation level. Must be one of: ${validLevels.join(', ')}`
      });
    }

    // Initialize AI service
    const aiService = new AIService();

    // Generate message
    const message = await aiService.generateReminder({
      clientName,
      invoiceNumber,
      amount,
      dueDate,
      daysOverdue,
      escalationLevel,
      paymentDetails,
      previousReminders
    });

    // Get estimated cost
    const estimatedCost = aiService.getEstimatedCost();

    res.json({
      success: true,
      message,
      metadata: {
        escalationLevel,
        daysOverdue,
        estimatedCost,
        provider: aiService.provider,
        model: aiService.model
      }
    });
  } catch (error) {
    console.error('AI message generation test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback: 'AI service may not be configured. Check your API keys.'
    });
  }
});

/**
 * POST /api/test/email
 * Send a test email
 * Requirement 15.4
 */
router.post('/email', testLimiter, auditLogger('TEST_EMAIL', 'test'), async (req, res) => {
  try {
    const {
      to,
      subject = 'Invoice Guard - Test Email',
      message = 'This is a test email from Invoice Guard. If you received this, your email service is configured correctly!'
    } = req.body;

    // Validate email address
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Email address (to) is required'
      });
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address format'
      });
    }

    // Initialize email service
    const emailService = new EmailService();

    // Generate HTML content
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1E40AF;">Test Email</h2>
        <p>${message}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          This is a test email sent from Invoice Guard's automated reminder system.
        </p>
      </div>
    `;

    // Send test email
    const result = await emailService.sendEmail({
      to,
      subject,
      text: message,
      html
    }, { skipRetry: true }); // Skip retry for test emails

    // Get estimated cost
    const estimatedCost = emailService.getEstimatedCost();

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        provider: result.provider,
        estimatedCost,
        message: 'Test email sent successfully!'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        provider: result.provider,
        message: 'Failed to send test email. Check your email service configuration.'
      });
    }
  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Email service may not be configured. Check your settings.'
    });
  }
});

/**
 * POST /api/test/sms
 * Send a test SMS
 * Requirement 15.5
 */
router.post('/sms', testLimiter, auditLogger('TEST_SMS', 'test'), async (req, res) => {
  try {
    const {
      to,
      message = 'This is a test SMS from Invoice Guard. Your SMS service is working!'
    } = req.body;

    // Validate phone number
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Phone number (to) is required'
      });
    }

    // Initialize SMS service if not already initialized
    const isInitialized = await smsService.initialize();
    if (!isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'SMS service is not configured. Please configure Twilio settings first.'
      });
    }

    // Send test SMS
    const result = await smsService.sendSMS({
      to,
      message,
      priority: 'normal',
      metadata: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    });

    if (result.success) {
      // Get current balance
      let balance = null;
      try {
        balance = await smsService.getBalance();
      } catch (balanceError) {
        console.warn('Could not fetch SMS balance:', balanceError);
      }

      res.json({
        success: true,
        messageId: result.messageId,
        cost: result.cost,
        balance,
        message: 'Test SMS sent successfully!'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        message: 'Failed to send test SMS. Check your SMS service configuration.'
      });
    }
  } catch (error) {
    console.error('SMS test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'SMS service may not be configured. Check your Twilio settings.'
    });
  }
});

/**
 * GET /api/test/services
 * Test all service connections
 */
router.get('/services', async (req, res) => {
  const results = {
    ai: { available: false },
    email: { available: false },
    sms: { available: false }
  };

  // Test AI service
  try {
    const aiService = new AIService();
    const aiConnected = await aiService.testConnection();
    results.ai = {
      available: aiConnected,
      provider: aiService.provider,
      model: aiService.model
    };
  } catch (error) {
    results.ai.error = error.message;
  }

  // Test Email service
  try {
    const emailService = new EmailService();
    results.email = {
      available: true, // Email service is always available
      provider: emailService.provider
    };
  } catch (error) {
    results.email.error = error.message;
  }

  // Test SMS service
  try {
    const isInitialized = await smsService.initialize();
    if (isInitialized) {
      const smsTest = await smsService.testConnection();
      results.sms = {
        available: smsTest.success,
        balance: smsTest.balance,
        status: smsTest.status,
        error: smsTest.error
      };
    } else {
      results.sms = {
        available: false,
        error: 'SMS service not configured'
      };
    }
  } catch (error) {
    results.sms.error = error.message;
  }

  const allAvailable = results.ai.available && results.email.available && results.sms.available;

  res.json({
    success: allAvailable,
    services: results,
    message: allAvailable 
      ? 'All services are configured and available' 
      : 'Some services are not available. Check configuration.'
  });
});

export default router;
