/**
 * ReminderLog Model
 * Tracks all reminder messages sent to clients
 */

import mongoose from 'mongoose';

const reminderLogSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    required: true,
    index: true
  },
  channel: {
    type: String,
    enum: ['email', 'sms'],
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    required: true,
    default: 'pending'
  },
  message: {
    type: String,
    required: true
  },
  escalationLevel: {
    type: String,
    enum: ['gentle', 'firm', 'urgent'],
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  deliveredAt: {
    type: Date
  },
  error: {
    type: String
  },
  cost: {
    type: Number,
    min: 0
  }
}, {
  timestamps: false // Using sentAt instead
});

// Compound index for invoice history queries
reminderLogSchema.index({ invoiceId: 1, sentAt: -1 });

// Index for status filtering
reminderLogSchema.index({ status: 1, sentAt: -1 });

// Index for channel filtering
reminderLogSchema.index({ channel: 1, sentAt: -1 });

const ReminderLog = mongoose.model('ReminderLog', reminderLogSchema);

export default ReminderLog;
