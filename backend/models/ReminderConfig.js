/**
 * ReminderConfig Model
 * User configuration for automated reminder behavior
 */

import mongoose from 'mongoose';

const reminderConfigSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  channels: {
    type: [String],
    enum: ['email', 'sms'],
    default: ['email'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one channel must be selected'
    }
  },
  intervalDays: {
    type: Number,
    default: 3,
    min: 1,
    max: 30
  },
  maxReminders: {
    type: Number,
    default: 5,
    min: 1,
    max: 20
  },
  businessHoursOnly: {
    type: Boolean,
    default: true
  },
  excludeWeekends: {
    type: Boolean,
    default: true
  },
  businessHours: {
    start: {
      type: String,
      default: '09:00',
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Invalid time format. Use HH:MM'
      }
    },
    end: {
      type: String,
      default: '18:00',
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Invalid time format. Use HH:MM'
      }
    }
  },
  escalationLevels: {
    gentle: {
      minDays: {
        type: Number,
        default: 1,
        min: 0
      },
      maxDays: {
        type: Number,
        default: 3,
        min: 1
      }
    },
    firm: {
      minDays: {
        type: Number,
        default: 4,
        min: 1
      },
      maxDays: {
        type: Number,
        default: 7,
        min: 1
      }
    },
    urgent: {
      minDays: {
        type: Number,
        default: 8,
        min: 1
      }
    }
  }
}, {
  timestamps: true
});

// Validation to ensure escalation levels don't overlap
reminderConfigSchema.pre('save', function(next) {
  const { gentle, firm, urgent } = this.escalationLevels;
  
  if (gentle.maxDays >= firm.minDays) {
    return next(new Error('Gentle max days must be less than firm min days'));
  }
  
  if (firm.maxDays >= urgent.minDays) {
    return next(new Error('Firm max days must be less than urgent min days'));
  }
  
  next();
});

const ReminderConfig = mongoose.model('ReminderConfig', reminderConfigSchema);

export default ReminderConfig;
