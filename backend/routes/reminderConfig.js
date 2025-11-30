/**
 * Reminder Configuration Routes
 * API endpoints for managing reminder configuration
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import express from 'express';
import ReminderConfig from '../models/ReminderConfig.js';

const router = express.Router();

/**
 * Validation middleware for reminder configuration
 */
const validateReminderConfig = (req, res, next) => {
  const { 
    enabled, 
    channels, 
    intervalDays, 
    maxReminders, 
    businessHoursOnly, 
    excludeWeekends,
    businessHours,
    escalationLevels 
  } = req.body;

  const errors = [];

  // Validate channels
  if (channels !== undefined) {
    if (!Array.isArray(channels) || channels.length === 0) {
      errors.push('At least one channel must be selected');
    } else {
      const validChannels = ['email', 'sms'];
      const invalidChannels = channels.filter(ch => !validChannels.includes(ch));
      if (invalidChannels.length > 0) {
        errors.push(`Invalid channels: ${invalidChannels.join(', ')}`);
      }
    }
  }

  // Validate intervalDays
  if (intervalDays !== undefined) {
    if (typeof intervalDays !== 'number' || intervalDays < 1 || intervalDays > 30) {
      errors.push('Interval days must be between 1 and 30');
    }
  }

  // Validate maxReminders
  if (maxReminders !== undefined) {
    if (typeof maxReminders !== 'number' || maxReminders < 1 || maxReminders > 20) {
      errors.push('Max reminders must be between 1 and 20');
    }
  }

  // Validate business hours format
  if (businessHours !== undefined) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (businessHours.start && !timeRegex.test(businessHours.start)) {
      errors.push('Business hours start time must be in HH:MM format');
    }
    
    if (businessHours.end && !timeRegex.test(businessHours.end)) {
      errors.push('Business hours end time must be in HH:MM format');
    }

    // Validate that start is before end
    if (businessHours.start && businessHours.end) {
      const [startH, startM] = businessHours.start.split(':').map(Number);
      const [endH, endM] = businessHours.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      if (startMinutes >= endMinutes) {
        errors.push('Business hours start time must be before end time');
      }
    }
  }

  // Validate escalation levels
  if (escalationLevels !== undefined) {
    if (escalationLevels.gentle) {
      if (escalationLevels.gentle.minDays < 0) {
        errors.push('Gentle escalation minDays must be >= 0');
      }
      if (escalationLevels.gentle.maxDays < 1) {
        errors.push('Gentle escalation maxDays must be >= 1');
      }
      if (escalationLevels.gentle.minDays >= escalationLevels.gentle.maxDays) {
        errors.push('Gentle escalation minDays must be less than maxDays');
      }
    }

    if (escalationLevels.firm) {
      if (escalationLevels.firm.minDays < 1) {
        errors.push('Firm escalation minDays must be >= 1');
      }
      if (escalationLevels.firm.maxDays < 1) {
        errors.push('Firm escalation maxDays must be >= 1');
      }
      if (escalationLevels.firm.minDays >= escalationLevels.firm.maxDays) {
        errors.push('Firm escalation minDays must be less than maxDays');
      }
    }

    if (escalationLevels.urgent) {
      if (escalationLevels.urgent.minDays < 1) {
        errors.push('Urgent escalation minDays must be >= 1');
      }
    }

    // Check for overlapping escalation levels
    if (escalationLevels.gentle && escalationLevels.firm) {
      if (escalationLevels.gentle.maxDays >= escalationLevels.firm.minDays) {
        errors.push('Gentle maxDays must be less than firm minDays');
      }
    }

    if (escalationLevels.firm && escalationLevels.urgent) {
      if (escalationLevels.firm.maxDays >= escalationLevels.urgent.minDays) {
        errors.push('Firm maxDays must be less than urgent minDays');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * GET /api/reminder-config
 * Retrieve reminder configuration
 * Requirement 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
router.get('/', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;

    let config = await ReminderConfig.findOne({ userId });

    // If no config exists, create default configuration
    if (!config) {
      config = await createDefaultConfig(userId);
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error retrieving reminder config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve reminder configuration',
      message: error.message
    });
  }
});

/**
 * POST /api/reminder-config
 * Create new reminder configuration
 * Requirement 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
router.post('/', validateReminderConfig, async (req, res) => {
  try {
    const { userId = 'default', ...configData } = req.body;

    // Check if config already exists
    const existingConfig = await ReminderConfig.findOne({ userId });
    if (existingConfig) {
      return res.status(409).json({
        success: false,
        error: 'Configuration already exists for this user',
        message: 'Use PUT /api/reminder-config to update existing configuration'
      });
    }

    // Create new configuration
    const config = new ReminderConfig({
      userId,
      ...configData
    });

    await config.save();

    res.status(201).json({
      success: true,
      message: 'Reminder configuration created successfully',
      data: config
    });
  } catch (error) {
    console.error('Error creating reminder config:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create reminder configuration',
      message: error.message
    });
  }
});

/**
 * PUT /api/reminder-config
 * Update existing reminder configuration
 * Requirement 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
router.put('/', validateReminderConfig, async (req, res) => {
  try {
    const { userId = 'default', ...updateData } = req.body;

    // Find and update configuration
    let config = await ReminderConfig.findOne({ userId });

    if (!config) {
      // Create new config if it doesn't exist
      config = new ReminderConfig({
        userId,
        ...updateData
      });
    } else {
      // Update existing config
      Object.assign(config, updateData);
    }

    await config.save();

    res.json({
      success: true,
      message: 'Reminder configuration updated successfully',
      data: config
    });
  } catch (error) {
    console.error('Error updating reminder config:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update reminder configuration',
      message: error.message
    });
  }
});

/**
 * DELETE /api/reminder-config
 * Delete reminder configuration (reset to defaults)
 */
router.delete('/', async (req, res) => {
  try {
    const { userId = 'default' } = req.query;

    const result = await ReminderConfig.deleteOne({ userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }

    res.json({
      success: true,
      message: 'Reminder configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reminder config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete reminder configuration',
      message: error.message
    });
  }
});

/**
 * Helper function to create default configuration
 * Requirement 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
async function createDefaultConfig(userId) {
  const defaultConfig = new ReminderConfig({
    userId,
    enabled: true,
    channels: ['email'],
    intervalDays: 3,
    maxReminders: 5,
    businessHoursOnly: true,
    excludeWeekends: true,
    businessHours: {
      start: '09:00',
      end: '18:00'
    },
    escalationLevels: {
      gentle: {
        minDays: 1,
        maxDays: 3
      },
      firm: {
        minDays: 4,
        maxDays: 7
      },
      urgent: {
        minDays: 8
      }
    }
  });

  await defaultConfig.save();
  console.log(`✅ Created default reminder configuration for user: ${userId}`);
  
  return defaultConfig;
}

export default router;
export { validateReminderConfig, createDefaultConfig };
