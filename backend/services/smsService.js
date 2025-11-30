/**
 * SMS Service for Invoice Guard
 * Supports Twilio with retry logic and rate limiting
 */

import twilio from 'twilio';
import ServiceConfig from '../models/ServiceConfig.js';

class SMSService {
  constructor() {
    this.client = null;
    this.config = null;
    this.rateLimits = new Map();
    this.deliveryStatus = new Map();
  }

  /**
   * Initialize SMS service with Twilio configuration
   */
  async initialize() {
    try {
      const config = await ServiceConfig.findOne({ 
        where: { service: 'sms', isActive: true } 
      });
      
      if (config && config.settings && config.settings.accountSid && config.settings.authToken) {
        this.config = config.settings;
        this.client = twilio(
          this.config.accountSid,
          this.config.authToken
        );
        console.log('✅ Twilio SMS service initialized');
        return true;
      } else {
        console.log('⚠️  SMS service not configured');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize SMS service:', error);
      return false;
    }
  }

  /**
   * Send SMS with retry logic and rate limiting
   */
  async sendSMS({
    to,
    message,
    priority = 'normal',
    metadata = {}
  }) {
    const messageId = this.generateMessageId();
    
    try {
      // Validate phone number
      const validatedPhone = this.validatePhoneNumber(to);
      if (!validatedPhone.isValid) {
        throw new Error(`Invalid phone number: ${validatedPhone.error}`);
      }

      // Truncate message to 160 characters
      const truncatedMessage = this.truncateMessage(message);

      // Check rate limits
      if (!this.checkRateLimit(validatedPhone.number)) {
        throw new Error('Rate limit exceeded for this number');
      }

      // Attempt to send with retry logic
      const result = await this.attemptSend({
        messageId,
        to: validatedPhone.number,
        message: truncatedMessage,
        priority,
        metadata
      });

      // Update rate limit counter
      this.updateRateLimit(validatedPhone.number);
      
      // Store delivery status
      this.deliveryStatus.set(messageId, {
        status: result.success ? 'sent' : 'failed',
        timestamp: new Date(),
        error: result.error,
        metadata: {
          ...metadata,
          to: validatedPhone.number,
          messageLength: truncatedMessage.length
        }
      });

      return {
        success: result.success,
        messageId,
        cost: result.cost || 0,
        error: result.error
      };

    } catch (error) {
      console.error(`❌ SMS sending failed for ${messageId}:`, error);
      
      this.deliveryStatus.set(messageId, {
        status: 'failed',
        timestamp: new Date(),
        error: error.message,
        metadata
      });

      return {
        success: false,
        messageId,
        error: error.message
      };
    }
  }

  /**
   * Attempt to send SMS with retry logic
   */
  async attemptSend({ messageId, to, message, priority, metadata }) {
    if (!this.client) {
      throw new Error('SMS service not initialized');
    }

    const maxRetries = priority === 'high' ? 5 : 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📱 Sending SMS (attempt ${attempt}/${maxRetries})`);
        
        const result = await this.client.messages.create({
          body: message,
          from: this.config.phoneNumber,
          to: to,
          statusCallback: `${process.env.BASE_URL || ''}/api/sms/webhook`,
          statusCallbackMethod: 'POST'
        });

        console.log(`✅ SMS sent successfully: ${result.sid}`);
        
        return {
          success: true,
          messageId: result.sid,
          cost: this.calculateCost(to, message)
        };
        
      } catch (error) {
        lastError = error.message;
        console.error(`❌ SMS attempt ${attempt} failed:`, error);
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: lastError || 'All retry attempts failed'
    };
  }

  /**
   * Validate and format phone number
   */
  validatePhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      return {
        isValid: false,
        error: 'Phone number is required'
      };
    }

    // Remove all non-digit characters
    const cleaned = phoneNumber.toString().replace(/\D/g, '');
    
    // Check if it's a valid length
    if (cleaned.length < 10 || cleaned.length > 15) {
      return {
        isValid: false,
        error: 'Phone number must be between 10-15 digits'
      };
    }

    // Add country code if missing (assume India +91)
    let formatted = cleaned;
    if (cleaned.length === 10 && cleaned.startsWith('9')) {
      formatted = '91' + cleaned;
    }
    
    // Ensure it starts with +
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }

    return {
      isValid: true,
      number: formatted,
      original: phoneNumber
    };
  }

  /**
   * Truncate message to 160 characters
   */
  truncateMessage(message) {
    if (message.length <= 160) {
      return message;
    }
    return message.substring(0, 157) + '...';
  }

  /**
   * Check rate limits for phone number
   */
  checkRateLimit(phoneNumber) {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour window
    const maxMessages = 10; // Max 10 messages per hour per number

    if (!this.rateLimits.has(phoneNumber)) {
      this.rateLimits.set(phoneNumber, []);
    }

    const timestamps = this.rateLimits.get(phoneNumber);
    
    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
    
    // Check if under limit
    if (validTimestamps.length >= maxMessages) {
      return false;
    }

    return true;
  }

  /**
   * Update rate limit counter
   */
  updateRateLimit(phoneNumber) {
    const now = Date.now();

    if (!this.rateLimits.has(phoneNumber)) {
      this.rateLimits.set(phoneNumber, []);
    }

    const timestamps = this.rateLimits.get(phoneNumber);
    timestamps.push(now);
    
    // Keep only recent timestamps
    const windowMs = 60 * 60 * 1000;
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
    this.rateLimits.set(phoneNumber, validTimestamps);
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate SMS cost (approximate)
   */
  calculateCost(to, message) {
    const isInternational = !to.startsWith('+91');
    const segments = Math.ceil(message.length / 160);
    const costPerSegment = isInternational ? 0.0075 : 0.0050; // USD
    return segments * costPerSegment;
  }

  /**
   * Get delivery status for a message
   */
  getDeliveryStatus(messageId) {
    return this.deliveryStatus.get(messageId) || {
      status: 'unknown',
      error: 'Message ID not found'
    };
  }

  /**
   * Get SMS statistics
   */
  getStatistics() {
    const stats = {
      total: 0,
      sent: 0,
      failed: 0,
      totalCost: 0
    };

    for (const [messageId, status] of this.deliveryStatus.entries()) {
      stats.total++;
      stats[status.status] = (stats[status.status] || 0) + 1;
      
      if (status.metadata && status.metadata.cost) {
        stats.totalCost += status.metadata.cost;
      }
    }

    return stats;
  }

  /**
   * Get credit balance from Twilio
   */
  async getBalance() {
    if (!this.client) {
      throw new Error('SMS service not initialized');
    }

    try {
      const account = await this.client.api.accounts(this.config.accountSid).fetch();
      return parseFloat(account.balance);
    } catch (error) {
      console.error('Error fetching SMS balance:', error);
      throw error;
    }
  }

  /**
   * Check if SMS credits are low and return notification status
   */
  async checkLowCredits(threshold = 10) {
    try {
      const balance = await this.getBalance();
      
      if (balance < threshold) {
        return {
          isLow: true,
          balance,
          threshold,
          message: `SMS credits are low: $${balance.toFixed(2)} remaining (threshold: $${threshold})`
        };
      }
      
      return {
        isLow: false,
        balance,
        threshold
      };
    } catch (error) {
      console.error('Error checking SMS credits:', error);
      return {
        isLow: false,
        error: error.message
      };
    }
  }

  /**
   * Test SMS service connection
   */
  async testConnection() {
    try {
      if (!this.client) {
        await this.initialize();
      }
      
      // Try to fetch account info
      const account = await this.client.api.accounts(this.config.accountSid).fetch();
      return {
        success: true,
        balance: parseFloat(account.balance),
        status: account.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle delivery status webhooks from Twilio
   */
  handleDeliveryWebhook(payload) {
    try {
      const messageId = payload.MessageSid;
      const status = this.mapTwilioStatus(payload.MessageStatus);
      const error = payload.ErrorMessage;
      
      if (messageId && this.deliveryStatus.has(messageId)) {
        const existingStatus = this.deliveryStatus.get(messageId);
        this.deliveryStatus.set(messageId, {
          ...existingStatus,
          status,
          error,
          updatedAt: new Date()
        });
      }
      
    } catch (error) {
      console.error('Error handling delivery webhook:', error);
    }
  }

  /**
   * Map Twilio status to our internal status
   */
  mapTwilioStatus(twilioStatus) {
    const statusMap = {
      'queued': 'pending',
      'sending': 'pending',
      'sent': 'sent',
      'delivered': 'delivered',
      'undelivered': 'failed',
      'failed': 'failed'
    };
    
    return statusMap[twilioStatus] || 'unknown';
  }
}

// Create singleton instance
const smsService = new SMSService();

export default smsService;
export { SMSService };
