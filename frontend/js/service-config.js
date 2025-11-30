/**
 * Service Configuration Module
 * Handles AI, Email, and SMS service configuration
 * Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4
 */

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Load all service configurations from backend
 * @param {string} userId - User ID (defaults to 'default-user')
 * @returns {Promise<Object>} Service configurations grouped by type
 */
export async function loadServiceConfigs(userId = 'default-user') {
  try {
    const response = await fetch(`${API_BASE_URL}/service-config?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load service configs: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.configs) {
      // Group configs by service type
      const grouped = {
        ai: result.configs.find(c => c.serviceType === 'ai') || null,
        email: result.configs.find(c => c.serviceType === 'email') || null,
        sms: result.configs.find(c => c.serviceType === 'sms') || null
      };
      return grouped;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error loading service configs:', error);
    return { ai: null, email: null, sms: null };
  }
}

/**
 * Save or update service configuration
 * @param {Object} config - Service configuration
 * @param {string} userId - User ID (defaults to 'default-user')
 * @returns {Promise<Object>} Save result
 */
export async function saveServiceConfig(config, userId = 'default-user') {
  try {
    const { id, serviceType, provider, apiKey, config: serviceConfig, enabled } = config;
    
    let response;
    
    if (id) {
      // Update existing configuration
      response = await fetch(`${API_BASE_URL}/service-config/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          apiKey,
          config: serviceConfig,
          enabled
        })
      });
    } else {
      // Create new configuration
      response = await fetch(`${API_BASE_URL}/service-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          serviceType,
          provider,
          apiKey,
          config: serviceConfig,
          enabled
        })
      });
    }
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to save service config');
    }
    
    return result;
  } catch (error) {
    console.error('Error saving service config:', error);
    throw error;
  }
}

/**
 * Test service connection
 * @param {Object} testData - Test configuration data
 * @returns {Promise<Object>} Test result
 */
export async function testServiceConnection(testData) {
  try {
    const response = await fetch(`${API_BASE_URL}/service-config/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    return {
      success: result.success,
      message: result.message,
      details: result.details
    };
  } catch (error) {
    console.error('Error testing service connection:', error);
    return {
      success: false,
      message: `Connection test failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * Populate AI service configuration form
 * @param {Object} config - AI service configuration
 */
export function populateAIServiceForm(config) {
  if (!config) {
    // Set defaults
    const aiProvider = document.getElementById('aiProvider');
    const aiModel = document.getElementById('aiModel');
    const aiEnabled = document.getElementById('aiEnabled');
    
    if (aiProvider) aiProvider.value = 'openai';
    if (aiModel) aiModel.value = 'gpt-4';
    if (aiEnabled) aiEnabled.checked = true;
    
    return;
  }
  
  // Populate form with existing config
  const aiProvider = document.getElementById('aiProvider');
  const aiApiKey = document.getElementById('aiApiKey');
  const aiModel = document.getElementById('aiModel');
  const aiEnabled = document.getElementById('aiEnabled');
  
  if (aiProvider) aiProvider.value = config.provider || 'openai';
  if (aiApiKey) aiApiKey.value = ''; // Never populate API key for security
  if (aiModel) aiModel.value = config.config?.model || 'gpt-4';
  if (aiEnabled) aiEnabled.checked = config.enabled !== false;
  
  // Store config ID for updates
  const form = document.getElementById('aiServiceForm');
  if (form) {
    form.setAttribute('data-config-id', config.id || '');
  }
}

/**
 * Populate email service configuration form
 * @param {Object} config - Email service configuration
 */
export function populateEmailServiceForm(config) {
  if (!config) {
    // Set defaults
    const emailProvider = document.getElementById('emailProvider');
    const emailEnabled = document.getElementById('emailEnabled');
    
    if (emailProvider) emailProvider.value = 'sendgrid';
    if (emailEnabled) emailEnabled.checked = true;
    
    return;
  }
  
  // Populate form with existing config
  const emailProvider = document.getElementById('emailProvider');
  const emailApiKey = document.getElementById('emailApiKey');
  const senderEmail = document.getElementById('senderEmail');
  const senderName = document.getElementById('senderName');
  const emailEnabled = document.getElementById('emailEnabled');
  
  if (emailProvider) emailProvider.value = config.provider || 'sendgrid';
  if (emailApiKey) emailApiKey.value = ''; // Never populate API key for security
  if (senderEmail) senderEmail.value = config.config?.senderEmail || '';
  if (senderName) senderName.value = config.config?.senderName || '';
  if (emailEnabled) emailEnabled.checked = config.enabled !== false;
  
  // Handle SMTP-specific fields
  if (config.provider === 'smtp') {
    const smtpHost = document.getElementById('smtpHost');
    const smtpPort = document.getElementById('smtpPort');
    const smtpUser = document.getElementById('smtpUser');
    
    if (smtpHost) smtpHost.value = config.config?.host || '';
    if (smtpPort) smtpPort.value = config.config?.port || '587';
    if (smtpUser) smtpUser.value = config.config?.user || '';
  }
  
  // Store config ID for updates
  const form = document.getElementById('emailServiceForm');
  if (form) {
    form.setAttribute('data-config-id', config.id || '');
  }
}

/**
 * Populate SMS service configuration form
 * @param {Object} config - SMS service configuration
 */
export function populateSMSServiceForm(config) {
  if (!config) {
    // Set defaults
    const smsEnabled = document.getElementById('smsEnabled');
    if (smsEnabled) smsEnabled.checked = true;
    
    return;
  }
  
  // Populate form with existing config
  const twilioAccountSid = document.getElementById('twilioAccountSid');
  const twilioAuthToken = document.getElementById('twilioAuthToken');
  const twilioPhoneNumber = document.getElementById('twilioPhoneNumber');
  const smsEnabled = document.getElementById('smsEnabled');
  
  if (twilioAccountSid) twilioAccountSid.value = config.config?.accountSid || '';
  if (twilioAuthToken) twilioAuthToken.value = ''; // Never populate auth token for security
  if (twilioPhoneNumber) twilioPhoneNumber.value = config.config?.phoneNumber || '';
  if (smsEnabled) smsEnabled.checked = config.enabled !== false;
  
  // Store config ID for updates
  const form = document.getElementById('smsServiceForm');
  if (form) {
    form.setAttribute('data-config-id', config.id || '');
  }
}

/**
 * Extract AI service configuration from form
 * @returns {Object} AI service configuration
 */
export function extractAIServiceConfig() {
  const form = document.getElementById('aiServiceForm');
  const configId = form ? form.getAttribute('data-config-id') : null;
  
  const provider = document.getElementById('aiProvider')?.value || 'openai';
  const apiKey = document.getElementById('aiApiKey')?.value || '';
  const model = document.getElementById('aiModel')?.value || 'gpt-4';
  const enabled = document.getElementById('aiEnabled')?.checked !== false;
  
  return {
    id: configId || undefined,
    serviceType: 'ai',
    provider,
    apiKey,
    config: { model },
    enabled
  };
}

/**
 * Extract email service configuration from form
 * @returns {Object} Email service configuration
 */
export function extractEmailServiceConfig() {
  const form = document.getElementById('emailServiceForm');
  const configId = form ? form.getAttribute('data-config-id') : null;
  
  const provider = document.getElementById('emailProvider')?.value || 'sendgrid';
  const apiKey = document.getElementById('emailApiKey')?.value || '';
  const senderEmail = document.getElementById('senderEmail')?.value || '';
  const senderName = document.getElementById('senderName')?.value || '';
  const enabled = document.getElementById('emailEnabled')?.checked !== false;
  
  const config = {
    senderEmail,
    senderName
  };
  
  // Add SMTP-specific fields if SMTP provider
  if (provider === 'smtp') {
    config.host = document.getElementById('smtpHost')?.value || '';
    config.port = document.getElementById('smtpPort')?.value || '587';
    config.user = document.getElementById('smtpUser')?.value || '';
  }
  
  return {
    id: configId || undefined,
    serviceType: 'email',
    provider,
    apiKey,
    config,
    enabled
  };
}

/**
 * Extract SMS service configuration from form
 * @returns {Object} SMS service configuration
 */
export function extractSMSServiceConfig() {
  const form = document.getElementById('smsServiceForm');
  const configId = form ? form.getAttribute('data-config-id') : null;
  
  const accountSid = document.getElementById('twilioAccountSid')?.value || '';
  const authToken = document.getElementById('twilioAuthToken')?.value || '';
  const phoneNumber = document.getElementById('twilioPhoneNumber')?.value || '';
  const enabled = document.getElementById('smsEnabled')?.checked !== false;
  
  return {
    id: configId || undefined,
    serviceType: 'sms',
    provider: 'twilio',
    apiKey: authToken,
    config: {
      accountSid,
      phoneNumber
    },
    enabled
  };
}

/**
 * Validate AI service configuration
 * @param {Object} config - AI service configuration
 * @returns {Object} Validation result
 */
export function validateAIServiceConfig(config) {
  const errors = [];
  
  if (!config.provider) {
    errors.push('AI provider is required');
  }
  
  if (!config.apiKey) {
    errors.push('API key is required');
  }
  
  if (!config.config?.model) {
    errors.push('AI model is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate email service configuration
 * @param {Object} config - Email service configuration
 * @returns {Object} Validation result
 */
export function validateEmailServiceConfig(config) {
  const errors = [];
  
  if (!config.provider) {
    errors.push('Email provider is required');
  }
  
  if (!config.apiKey) {
    errors.push('API key is required');
  }
  
  if (!config.config?.senderEmail) {
    errors.push('Sender email is required');
  } else {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(config.config.senderEmail)) {
      errors.push('Sender email must be a valid email address');
    }
  }
  
  // SMTP-specific validation
  if (config.provider === 'smtp') {
    if (!config.config?.host) {
      errors.push('SMTP host is required');
    }
    if (!config.config?.port) {
      errors.push('SMTP port is required');
    }
    if (!config.config?.user) {
      errors.push('SMTP user is required');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate SMS service configuration
 * @param {Object} config - SMS service configuration
 * @returns {Object} Validation result
 */
export function validateSMSServiceConfig(config) {
  const errors = [];
  
  if (!config.config?.accountSid) {
    errors.push('Twilio Account SID is required');
  }
  
  if (!config.apiKey) {
    errors.push('Twilio Auth Token is required');
  }
  
  if (!config.config?.phoneNumber) {
    errors.push('Twilio phone number is required');
  } else {
    // Validate phone format (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(config.config.phoneNumber)) {
      errors.push('Twilio phone number must be in E.164 format (e.g., +1234567890)');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Setup event listeners for service configuration forms
 */
export function setupServiceConfigListeners() {
  // Email provider change listener (show/hide SMTP fields)
  const emailProvider = document.getElementById('emailProvider');
  if (emailProvider) {
    emailProvider.addEventListener('change', (e) => {
      const smtpFields = document.getElementById('smtpFields');
      if (smtpFields) {
        if (e.target.value === 'smtp') {
          smtpFields.classList.remove('hidden');
        } else {
          smtpFields.classList.add('hidden');
        }
      }
    });
    
    // Initial state
    const smtpFields = document.getElementById('smtpFields');
    if (smtpFields) {
      if (emailProvider.value === 'smtp') {
        smtpFields.classList.remove('hidden');
      } else {
        smtpFields.classList.add('hidden');
      }
    }
  }
  
  // AI model options based on provider
  const aiProvider = document.getElementById('aiProvider');
  const aiModel = document.getElementById('aiModel');
  
  if (aiProvider && aiModel) {
    aiProvider.addEventListener('change', (e) => {
      const provider = e.target.value;
      
      // Clear existing options
      aiModel.innerHTML = '';
      
      // Add options based on provider
      if (provider === 'openai') {
        aiModel.innerHTML = `
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
        `;
      } else if (provider === 'anthropic') {
        aiModel.innerHTML = `
          <option value="claude-3-opus-20240229">Claude 3 Opus</option>
          <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
          <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
        `;
      }
    });
  }
}
