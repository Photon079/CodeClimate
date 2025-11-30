/**
 * Reminder Settings Module
 * Handles loading, saving, and managing automated reminder configuration
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Load reminder configuration from backend
 * @param {string} userId - User ID (defaults to 'default')
 * @returns {Promise<Object>} Reminder configuration
 */
export async function loadReminderConfig(userId = 'default') {
  try {
    const response = await fetch(`${API_BASE_URL}/reminder-config?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load reminder config: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error loading reminder config:', error);
    // Return default configuration if loading fails
    return getDefaultReminderConfig();
  }
}

/**
 * Save reminder configuration to backend
 * @param {Object} config - Reminder configuration
 * @param {string} userId - User ID (defaults to 'default')
 * @returns {Promise<Object>} Save result
 */
export async function saveReminderConfig(config, userId = 'default') {
  try {
    const response = await fetch(`${API_BASE_URL}/reminder-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        ...config
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save reminder config');
    }
    
    return result;
  } catch (error) {
    console.error('Error saving reminder config:', error);
    throw error;
  }
}

/**
 * Get default reminder configuration
 * @returns {Object} Default configuration
 */
export function getDefaultReminderConfig() {
  return {
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
  };
}

/**
 * Populate reminder settings form with configuration data
 * @param {Object} config - Reminder configuration
 */
export function populateReminderSettingsForm(config) {
  // Enable/disable toggle
  const remindersEnabled = document.getElementById('remindersEnabled');
  if (remindersEnabled) {
    remindersEnabled.checked = config.enabled !== false;
  }
  
  // Channel selection
  const channelEmail = document.getElementById('channelEmail');
  const channelSMS = document.getElementById('channelSMS');
  
  if (channelEmail) {
    channelEmail.checked = config.channels && config.channels.includes('email');
  }
  
  if (channelSMS) {
    channelSMS.checked = config.channels && config.channels.includes('sms');
  }
  
  // Reminder interval
  const reminderInterval = document.getElementById('reminderInterval');
  if (reminderInterval) {
    reminderInterval.value = config.intervalDays || 3;
  }
  
  // Max reminders
  const maxReminders = document.getElementById('maxReminders');
  if (maxReminders) {
    maxReminders.value = config.maxReminders || 5;
  }
  
  // Business hours only
  const businessHoursOnly = document.getElementById('businessHoursOnly');
  if (businessHoursOnly) {
    businessHoursOnly.checked = config.businessHoursOnly !== false;
  }
  
  // Business hours times
  const businessHoursStart = document.getElementById('businessHoursStart');
  const businessHoursEnd = document.getElementById('businessHoursEnd');
  
  if (businessHoursStart && config.businessHours) {
    businessHoursStart.value = config.businessHours.start || '09:00';
  }
  
  if (businessHoursEnd && config.businessHours) {
    businessHoursEnd.value = config.businessHours.end || '18:00';
  }
  
  // Exclude weekends
  const excludeWeekends = document.getElementById('excludeWeekends');
  if (excludeWeekends) {
    excludeWeekends.checked = config.excludeWeekends !== false;
  }
}

/**
 * Extract reminder settings from form
 * @returns {Object} Reminder configuration from form
 */
export function extractReminderSettingsFromForm() {
  // Get enabled state
  const remindersEnabled = document.getElementById('remindersEnabled');
  const enabled = remindersEnabled ? remindersEnabled.checked : true;
  
  // Get selected channels
  const channels = [];
  const channelEmail = document.getElementById('channelEmail');
  const channelSMS = document.getElementById('channelSMS');
  
  if (channelEmail && channelEmail.checked) {
    channels.push('email');
  }
  
  if (channelSMS && channelSMS.checked) {
    channels.push('sms');
  }
  
  // Get interval days
  const reminderInterval = document.getElementById('reminderInterval');
  const intervalDays = reminderInterval ? parseInt(reminderInterval.value, 10) : 3;
  
  // Get max reminders
  const maxRemindersInput = document.getElementById('maxReminders');
  const maxReminders = maxRemindersInput ? parseInt(maxRemindersInput.value, 10) : 5;
  
  // Get business hours settings
  const businessHoursOnly = document.getElementById('businessHoursOnly');
  const businessHoursOnlyValue = businessHoursOnly ? businessHoursOnly.checked : true;
  
  const businessHoursStart = document.getElementById('businessHoursStart');
  const businessHoursEnd = document.getElementById('businessHoursEnd');
  
  const businessHours = {
    start: businessHoursStart ? businessHoursStart.value : '09:00',
    end: businessHoursEnd ? businessHoursEnd.value : '18:00'
  };
  
  // Get weekend exclusion
  const excludeWeekendsInput = document.getElementById('excludeWeekends');
  const excludeWeekends = excludeWeekendsInput ? excludeWeekendsInput.checked : true;
  
  return {
    enabled,
    channels,
    intervalDays,
    maxReminders,
    businessHoursOnly: businessHoursOnlyValue,
    excludeWeekends,
    businessHours
  };
}

/**
 * Validate reminder settings
 * @param {Object} config - Reminder configuration to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
export function validateReminderSettings(config) {
  const errors = [];
  
  // Validate channels
  if (!config.channels || config.channels.length === 0) {
    errors.push('At least one reminder channel must be selected');
  }
  
  // Validate interval days
  if (!config.intervalDays || config.intervalDays < 1 || config.intervalDays > 30) {
    errors.push('Reminder interval must be between 1 and 30 days');
  }
  
  // Validate max reminders
  if (!config.maxReminders || config.maxReminders < 1 || config.maxReminders > 20) {
    errors.push('Maximum reminders must be between 1 and 20');
  }
  
  // Validate business hours
  if (config.businessHours) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(config.businessHours.start)) {
      errors.push('Business hours start time must be in HH:MM format');
    }
    
    if (!timeRegex.test(config.businessHours.end)) {
      errors.push('Business hours end time must be in HH:MM format');
    }
    
    // Validate that start is before end
    if (config.businessHours.start && config.businessHours.end) {
      const [startH, startM] = config.businessHours.start.split(':').map(Number);
      const [endH, endM] = config.businessHours.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      if (startMinutes >= endMinutes) {
        errors.push('Business hours start time must be before end time');
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Setup event listeners for reminder settings form
 */
export function setupReminderSettingsListeners() {
  // Enable/disable dependent fields based on reminders enabled toggle
  const remindersEnabled = document.getElementById('remindersEnabled');
  if (remindersEnabled) {
    remindersEnabled.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      toggleReminderSettingsFields(isEnabled);
    });
    
    // Initial state
    toggleReminderSettingsFields(remindersEnabled.checked);
  }
  
  // Enable/disable business hours time inputs based on business hours toggle
  const businessHoursOnly = document.getElementById('businessHoursOnly');
  if (businessHoursOnly) {
    businessHoursOnly.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      toggleBusinessHoursFields(isEnabled);
    });
    
    // Initial state
    toggleBusinessHoursFields(businessHoursOnly.checked);
  }
}

/**
 * Toggle reminder settings fields based on enabled state
 * @param {boolean} enabled - Whether reminders are enabled
 */
function toggleReminderSettingsFields(enabled) {
  const fields = [
    'channelEmail',
    'channelSMS',
    'reminderInterval',
    'maxReminders',
    'businessHoursOnly',
    'businessHoursStart',
    'businessHoursEnd',
    'excludeWeekends'
  ];
  
  fields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.disabled = !enabled;
      
      // Add visual feedback
      const parent = field.closest('.input-group, .flex');
      if (parent) {
        if (enabled) {
          parent.classList.remove('opacity-50');
        } else {
          parent.classList.add('opacity-50');
        }
      }
    }
  });
}

/**
 * Toggle business hours time fields based on business hours only toggle
 * @param {boolean} enabled - Whether business hours restriction is enabled
 */
function toggleBusinessHoursFields(enabled) {
  const businessHoursStart = document.getElementById('businessHoursStart');
  const businessHoursEnd = document.getElementById('businessHoursEnd');
  
  if (businessHoursStart) {
    businessHoursStart.disabled = !enabled;
  }
  
  if (businessHoursEnd) {
    businessHoursEnd.disabled = !enabled;
  }
}
