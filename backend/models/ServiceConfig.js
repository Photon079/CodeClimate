/**
 * ServiceConfig Model
 * Stores encrypted API credentials for external services (AI, Email, SMS)
 */

import mongoose from 'mongoose';
import crypto from 'crypto';

const serviceConfigSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  serviceType: {
    type: String,
    enum: ['ai', 'email', 'sms'],
    required: true
  },
  provider: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const validProviders = {
          ai: ['openai', 'anthropic'],
          email: ['sendgrid', 'resend', 'smtp'],
          sms: ['twilio']
        };
        return validProviders[this.serviceType]?.includes(v.toLowerCase());
      },
      message: props => `${props.value} is not a valid provider for ${props.instance.serviceType}`
    }
  },
  apiKeyEncrypted: {
    type: String,
    required: true
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  enabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for user + service type lookups
serviceConfigSchema.index({ userId: 1, serviceType: 1 });

// Encryption helper methods
serviceConfigSchema.statics.encryptAPIKey = function(apiKey) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // Create a 32-byte key from the environment variable
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV + encrypted data
  return iv.toString('hex') + ':' + encrypted;
};

serviceConfigSchema.statics.decryptAPIKey = function(encryptedKey) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // Split IV and encrypted data
  const parts = encryptedKey.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted key format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  // Create a 32-byte key from the environment variable
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Instance method to get decrypted API key
serviceConfigSchema.methods.getAPIKey = function() {
  return this.constructor.decryptAPIKey(this.apiKeyEncrypted);
};

const ServiceConfig = mongoose.model('ServiceConfig', serviceConfigSchema);

export default ServiceConfig;
