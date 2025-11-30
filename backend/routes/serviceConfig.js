/**
 * Service Configuration Routes
 * Handles AI, Email, and SMS service configuration
 * Requirements: 8.1-8.6, 9.1-9.5, 10.1-10.5
 */

import express from 'express';
import ServiceConfig from '../models/ServiceConfig.js';
import AIService from '../services/aiService.js';
import EmailService from '../services/emailService.js';
import smsService from '../services/smsService.js';
import { auditLogger } from '../middleware/auditLog.js';

const router = express.Router();

/**
 * Validation middleware for service configuration
 */
const validateServiceConfig = (req, res, next) => {
  const { serviceType, provider, apiKey, config } = req.body;

  // Validate required fields
  if (!serviceType) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'serviceType is required'
    });
  }

  if (!['ai', 'email', 'sms'].includes(serviceType)) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'serviceType must be one of: ai, email, sms'
    });
  }

  if (!provider) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'provider is required'
    });
  }

  // Validate provider for each service type
  const validProviders = {
    ai: ['openai', 'anthropic'],
    email: ['sendgrid', 'resend', 'smtp'],
    sms: ['twilio']
  };

  if (!validProviders[serviceType].includes(provider.toLowerCase())) {
    return res.status(400).json({
      error: 'Validation failed',
      message: `Invalid provider for ${serviceType}. Valid providers: ${validProviders[serviceType].join(', ')}`
    });
  }

  if (!apiKey) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'apiKey is required'
    });
  }

  // Validate config object
  if (config && typeof config !== 'object') {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'config must be an object'
    });
  }

  next();
};

/**
 * POST /api/service-config
 * Create a new service configuration
 * Requirements: 8.1, 8.2, 9.1, 9.2, 10.1, 10.2
 */
router.post('/', validateServiceConfig, auditLogger('CREATE_SERVICE_CONFIG', 'service_config'), async (req, res) => {
  try {
    const { userId, serviceType, provider, apiKey, config, enabled } = req.body;

    // Use default userId if not provided (for single-user systems)
    const effectiveUserId = userId || 'default-user';

    // Check if configuration already exists for this user and service type
    const existingConfig = await ServiceConfig.findOne({
      userId: effectiveUserId,
      serviceType
    });

    if (existingConfig) {
      return res.status(409).json({
        error: 'Configuration already exists',
        message: `A configuration for ${serviceType} already exists. Use PUT to update.`,
        configId: existingConfig._id
      });
    }

    // Encrypt API key before storage
    const apiKeyEncrypted = ServiceConfig.encryptAPIKey(apiKey);

    // Create new service configuration
    const serviceConfig = new ServiceConfig({
      userId: effectiveUserId,
      serviceType,
      provider: provider.toLowerCase(),
      apiKeyEncrypted,
      config: config || {},
      enabled: enabled !== undefined ? enabled : true
    });

    await serviceConfig.save();

    res.status(201).json({
      success: true,
      message: 'Service configuration created successfully',
      config: {
        id: serviceConfig._id,
        userId: serviceConfig.userId,
        serviceType: serviceConfig.serviceType,
        provider: serviceConfig.provider,
        config: serviceConfig.config,
        enabled: serviceConfig.enabled,
        createdAt: serviceConfig.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating service configuration:', error);
    res.status(500).json({
      error: 'Failed to create service configuration',
      message: error.message
    });
  }
});

/**
 * GET /api/service-config
 * Retrieve all service configurations for a user
 * Requirements: 8.1, 9.1, 10.1
 */
router.get('/', async (req, res) => {
  try {
    const { userId, serviceType } = req.query;

    // Use default userId if not provided
    const effectiveUserId = userId || 'default-user';

    // Build query
    const query = { userId: effectiveUserId };
    if (serviceType) {
      query.serviceType = serviceType;
    }

    const configs = await ServiceConfig.find(query).sort({ createdAt: -1 });

    // Return configurations without encrypted API keys
    const sanitizedConfigs = configs.map(config => ({
      id: config._id,
      userId: config.userId,
      serviceType: config.serviceType,
      provider: config.provider,
      config: config.config,
      enabled: config.enabled,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    }));

    res.json({
      success: true,
      count: sanitizedConfigs.length,
      configs: sanitizedConfigs
    });
  } catch (error) {
    console.error('Error retrieving service configurations:', error);
    res.status(500).json({
      error: 'Failed to retrieve service configurations',
      message: error.message
    });
  }
});

/**
 * PUT /api/service-config/:id
 * Update an existing service configuration
 * Requirements: 8.2, 8.3, 9.2, 9.3, 10.2, 10.3
 */
router.put('/:id', auditLogger('UPDATE_SERVICE_CONFIG', 'service_config'), async (req, res) => {
  try {
    const { id } = req.params;
    const { provider, apiKey, config, enabled } = req.body;

    // Find existing configuration
    const serviceConfig = await ServiceConfig.findById(id);

    if (!serviceConfig) {
      return res.status(404).json({
        error: 'Configuration not found',
        message: `No service configuration found with id: ${id}`
      });
    }

    // Update fields if provided
    if (provider) {
      // Validate provider for the service type
      const validProviders = {
        ai: ['openai', 'anthropic'],
        email: ['sendgrid', 'resend', 'smtp'],
        sms: ['twilio']
      };

      if (!validProviders[serviceConfig.serviceType].includes(provider.toLowerCase())) {
        return res.status(400).json({
          error: 'Validation failed',
          message: `Invalid provider for ${serviceConfig.serviceType}. Valid providers: ${validProviders[serviceConfig.serviceType].join(', ')}`
        });
      }

      serviceConfig.provider = provider.toLowerCase();
    }

    if (apiKey) {
      // Encrypt new API key
      serviceConfig.apiKeyEncrypted = ServiceConfig.encryptAPIKey(apiKey);
    }

    if (config) {
      serviceConfig.config = { ...serviceConfig.config, ...config };
    }

    if (enabled !== undefined) {
      serviceConfig.enabled = enabled;
    }

    await serviceConfig.save();

    res.json({
      success: true,
      message: 'Service configuration updated successfully',
      config: {
        id: serviceConfig._id,
        userId: serviceConfig.userId,
        serviceType: serviceConfig.serviceType,
        provider: serviceConfig.provider,
        config: serviceConfig.config,
        enabled: serviceConfig.enabled,
        updatedAt: serviceConfig.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating service configuration:', error);
    res.status(500).json({
      error: 'Failed to update service configuration',
      message: error.message
    });
  }
});

/**
 * POST /api/service-config/test
 * Test service connection with provided or stored credentials
 * Requirements: 8.4, 9.4, 10.4
 */
router.post('/test', auditLogger('TEST_SERVICE_CONFIG', 'service_config'), async (req, res) => {
  try {
    const { configId, serviceType, provider, apiKey, config, testEmail, testPhone } = req.body;

    let testResult;
    let decryptedApiKey;

    // If configId is provided, load from database
    if (configId) {
      const serviceConfig = await ServiceConfig.findById(configId);

      if (!serviceConfig) {
        return res.status(404).json({
          error: 'Configuration not found',
          message: `No service configuration found with id: ${configId}`
        });
      }

      if (!serviceConfig.enabled) {
        return res.status(400).json({
          error: 'Configuration disabled',
          message: 'This service configuration is currently disabled'
        });
      }

      // Decrypt API key
      decryptedApiKey = serviceConfig.getAPIKey();

      // Test based on service type
      if (serviceConfig.serviceType === 'ai') {
        testResult = await testAIService(serviceConfig.provider, decryptedApiKey, serviceConfig.config);
      } else if (serviceConfig.serviceType === 'email') {
        testResult = await testEmailService(serviceConfig.provider, decryptedApiKey, serviceConfig.config, testEmail);
      } else if (serviceConfig.serviceType === 'sms') {
        testResult = await testSMSService(serviceConfig.provider, decryptedApiKey, serviceConfig.config, testPhone);
      }
    } else {
      // Test with provided credentials (not saved)
      if (!serviceType || !provider || !apiKey) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'serviceType, provider, and apiKey are required when configId is not provided'
        });
      }

      if (serviceType === 'ai') {
        testResult = await testAIService(provider, apiKey, config || {});
      } else if (serviceType === 'email') {
        testResult = await testEmailService(provider, apiKey, config || {}, testEmail);
      } else if (serviceType === 'sms') {
        testResult = await testSMSService(provider, apiKey, config || {}, testPhone);
      } else {
        return res.status(400).json({
          error: 'Invalid service type',
          message: 'serviceType must be one of: ai, email, sms'
        });
      }
    }

    res.json({
      success: testResult.success,
      message: testResult.message,
      details: testResult.details
    });
  } catch (error) {
    console.error('Error testing service connection:', error);
    res.status(500).json({
      error: 'Failed to test service connection',
      message: error.message
    });
  }
});

/**
 * Test AI service connection
 * @private
 */
async function testAIService(provider, apiKey, config) {
  try {
    // Temporarily set environment variables for testing
    const originalProvider = process.env.AI_PROVIDER;
    const originalApiKey = provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;

    process.env.AI_PROVIDER = provider;
    if (provider === 'openai') {
      process.env.OPENAI_API_KEY = apiKey;
    } else {
      process.env.ANTHROPIC_API_KEY = apiKey;
    }

    // Create temporary AI service instance
    const aiService = new AIService();
    const isConnected = await aiService.testConnection();

    // Restore original environment variables
    process.env.AI_PROVIDER = originalProvider;
    if (provider === 'openai') {
      process.env.OPENAI_API_KEY = originalApiKey;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }

    if (isConnected) {
      return {
        success: true,
        message: `Successfully connected to ${provider} AI service`,
        details: {
          provider,
          model: config.model || (provider === 'openai' ? 'gpt-4' : 'claude-3-sonnet-20240229')
        }
      };
    } else {
      return {
        success: false,
        message: `Failed to connect to ${provider} AI service`,
        details: { provider }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `AI service test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * Test email service connection
 * @private
 */
async function testEmailService(provider, apiKey, config, testEmail) {
  try {
    // Temporarily set environment variables for testing
    const originalProvider = process.env.EMAIL_PROVIDER;
    const originalApiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    const originalSenderEmail = process.env.SENDER_EMAIL;

    process.env.EMAIL_PROVIDER = provider;
    
    if (provider === 'sendgrid') {
      process.env.SENDGRID_API_KEY = apiKey;
    } else if (provider === 'resend') {
      process.env.RESEND_API_KEY = apiKey;
    } else if (provider === 'smtp') {
      process.env.SMTP_HOST = config.host;
      process.env.SMTP_PORT = config.port;
      process.env.SMTP_USER = config.user;
      process.env.SMTP_PASSWORD = apiKey;
    }

    process.env.SENDER_EMAIL = config.senderEmail || testEmail || 'test@example.com';

    // Create temporary email service instance
    const emailService = new EmailService();
    const isConnected = await emailService.testConnection(testEmail);

    // Restore original environment variables
    process.env.EMAIL_PROVIDER = originalProvider;
    if (originalApiKey) {
      process.env[`${provider.toUpperCase()}_API_KEY`] = originalApiKey;
    }
    process.env.SENDER_EMAIL = originalSenderEmail;

    if (isConnected) {
      return {
        success: true,
        message: `Successfully connected to ${provider} email service${testEmail ? ` and sent test email to ${testEmail}` : ''}`,
        details: { provider, testEmail }
      };
    } else {
      return {
        success: false,
        message: `Failed to connect to ${provider} email service`,
        details: { provider }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Email service test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * Test SMS service connection
 * @private
 */
async function testSMSService(provider, apiKey, config, testPhone) {
  try {
    if (provider !== 'twilio') {
      return {
        success: false,
        message: 'Only Twilio is supported for SMS',
        details: { provider }
      };
    }

    // Create temporary SMS service configuration
    const testConfig = {
      accountSid: config.accountSid,
      authToken: apiKey,
      phoneNumber: config.phoneNumber
    };

    // Test connection by checking account status
    const twilio = require('twilio');
    const client = twilio(testConfig.accountSid, testConfig.authToken);
    
    const account = await client.api.accounts(testConfig.accountSid).fetch();
    const balance = parseFloat(account.balance);

    // Optionally send test SMS if phone number provided
    if (testPhone) {
      await client.messages.create({
        body: 'Test message from Invoice Guard. Your SMS service is configured correctly!',
        from: testConfig.phoneNumber,
        to: testPhone
      });

      return {
        success: true,
        message: `Successfully connected to Twilio and sent test SMS to ${testPhone}`,
        details: {
          provider,
          balance: balance.toFixed(2),
          status: account.status,
          testPhone
        }
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Twilio SMS service',
      details: {
        provider,
        balance: balance.toFixed(2),
        status: account.status
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `SMS service test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

export default router;
