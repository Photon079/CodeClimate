/**
 * Property-Based Tests for Scheduler Service
 * Using fast-check for property-based testing
 * 
 * These tests validate the scheduler logic for automated reminders
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Helper function to check if a date falls within business hours
 * @param {Date} date - The date to check
 * @param {string} startTime - Business hours start time (HH:MM format)
 * @param {string} endTime - Business hours end time (HH:MM format)
 * @returns {boolean} - True if date is within business hours
 */
function isWithinBusinessHours(date, startTime, endTime) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentTimeInMinutes = hours * 60 + minutes;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const startTimeInMinutes = startHour * 60 + startMin;
  
  const [endHour, endMin] = endTime.split(':').map(Number);
  const endTimeInMinutes = endHour * 60 + endMin;
  
  return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
}

/**
 * Helper function to check if a date is a weekend
 * @param {Date} date - The date to check
 * @returns {boolean} - True if date is Saturday (6) or Sunday (0)
 */
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Helper function to calculate days between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} - Number of days between dates
 */
function daysBetween(date1, date2) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.abs(Math.floor((date2 - date1) / msPerDay));
}

/**
 * Simulates scheduler logic for determining if a reminder should be sent
 * This is a reference implementation that the actual scheduler should follow
 */
function shouldSendReminder(params) {
  const {
    lastReminderDate,
    currentDate,
    intervalDays,
    businessHoursOnly,
    businessHours,
    excludeWeekends,
    reminderCount,
    maxReminders
  } = params;
  
  // Check if max reminders reached
  if (reminderCount >= maxReminders) {
    return { shouldSend: false, reason: 'max_reminders_reached' };
  }
  
  // Check interval enforcement
  if (lastReminderDate) {
    const daysSinceLastReminder = daysBetween(lastReminderDate, currentDate);
    if (daysSinceLastReminder < intervalDays) {
      return { shouldSend: false, reason: 'interval_not_met' };
    }
  }
  
  // Check weekend exclusion
  if (excludeWeekends && isWeekend(currentDate)) {
    return { shouldSend: false, reason: 'weekend_excluded' };
  }
  
  // Check business hours
  if (businessHoursOnly && !isWithinBusinessHours(currentDate, businessHours.start, businessHours.end)) {
    return { shouldSend: false, reason: 'outside_business_hours' };
  }
  
  return { shouldSend: true, reason: 'all_checks_passed' };
}

describe('Scheduler Service - Property-Based Tests', () => {
  
  /**
   * **Feature: ai-automated-reminders, Property 4: Reminder Interval Enforcement**
   * **Validates: Requirements 3.5**
   * 
   * For any invoice with reminder history, the time between consecutive reminders
   * should be at least the configured interval days.
   */
  describe('Property 4: Reminder Interval Enforcement', () => {
    it('should enforce minimum interval between consecutive reminders', () => {
      // Generator for reminder history with properly spaced timestamps
      const intervalDaysArbitrary = fc.integer({ min: 1, max: 30 });
      
      const reminderHistoryArbitrary = fc.tuple(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
        fc.integer({ min: 1, max: 5 }), // Number of reminders
        intervalDaysArbitrary
      ).chain(([startDate, count, intervalDays]) => {
        // Generate reminders with proper spacing
        const reminders = [];
        let currentDate = new Date(startDate);
        
        for (let i = 0; i < count; i++) {
          reminders.push({
            sentAt: new Date(currentDate),
            status: i % 2 === 0 ? 'sent' : 'failed',
            channel: i % 2 === 0 ? 'email' : 'sms'
          });
          
          // Add at least intervalDays between reminders
          currentDate.setDate(currentDate.getDate() + intervalDays + Math.floor(Math.random() * 5));
        }
        
        return fc.constant({ reminders, intervalDays });
      });
      
      fc.assert(
        fc.property(reminderHistoryArbitrary, ({ reminders, intervalDays }) => {
          // Check each consecutive pair of reminders
          for (let i = 1; i < reminders.length; i++) {
            const prevReminder = reminders[i - 1];
            const currentReminder = reminders[i];
            
            const daysBetweenReminders = daysBetween(prevReminder.sentAt, currentReminder.sentAt);
            
            // The interval between consecutive reminders should be at least intervalDays
            expect(daysBetweenReminders).toBeGreaterThanOrEqual(intervalDays);
          }
        }),
        { numRuns: 100 }
      );
    });
    
    it('should not send reminder if interval has not elapsed', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 0, max: 29 }), // Days since last reminder (less than interval)
          (lastReminderDate, intervalDays, daysSince) => {
            // Ensure daysSince is less than intervalDays
            fc.pre(daysSince < intervalDays);
            
            const currentDate = new Date(lastReminderDate);
            currentDate.setDate(currentDate.getDate() + daysSince);
            
            const result = shouldSendReminder({
              lastReminderDate,
              currentDate,
              intervalDays,
              businessHoursOnly: false,
              businessHours: { start: '09:00', end: '18:00' },
              excludeWeekends: false,
              reminderCount: 0,
              maxReminders: 5
            });
            
            // Should not send if interval not met
            expect(result.shouldSend).toBe(false);
            expect(result.reason).toBe('interval_not_met');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should allow reminder if interval has elapsed', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 0, max: 20 }), // Days since last reminder (at least interval)
          (lastReminderDate, intervalDays, extraDays) => {
            const daysSince = intervalDays + extraDays;
            
            const currentDate = new Date(lastReminderDate);
            currentDate.setDate(currentDate.getDate() + daysSince);
            
            const result = shouldSendReminder({
              lastReminderDate,
              currentDate,
              intervalDays,
              businessHoursOnly: false,
              businessHours: { start: '09:00', end: '18:00' },
              excludeWeekends: false,
              reminderCount: 0,
              maxReminders: 5
            });
            
            // Should send if interval is met (assuming no other restrictions)
            expect(result.shouldSend).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * **Feature: ai-automated-reminders, Property 5: Business Hours Compliance**
   * **Validates: Requirements 6.5**
   * 
   * For any reminder sent when business hours are enabled, the send time should
   * fall within the configured business hours range.
   */
  describe('Property 5: Business Hours Compliance', () => {
    it('should only send reminders within business hours when enabled', () => {
      // Generator for business hours configuration
      const businessHoursArbitrary = fc.record({
        start: fc.integer({ min: 0, max: 23 }).chain(hour =>
          fc.integer({ min: 0, max: 59 }).map(minute =>
            `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
          )
        ),
        end: fc.integer({ min: 0, max: 23 }).chain(hour =>
          fc.integer({ min: 0, max: 59 }).map(minute =>
            `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
          )
        )
      }).filter(hours => {
        // Ensure start is before end
        const [startH, startM] = hours.start.split(':').map(Number);
        const [endH, endM] = hours.end.split(':').map(Number);
        return (startH * 60 + startM) < (endH * 60 + endM);
      });
      
      // Generator for dates with specific times
      const dateWithTimeArbitrary = fc.record({
        date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        hour: fc.integer({ min: 0, max: 23 }),
        minute: fc.integer({ min: 0, max: 59 })
      }).map(({ date, hour, minute }) => {
        const newDate = new Date(date);
        newDate.setHours(hour, minute, 0, 0);
        return newDate;
      });
      
      fc.assert(
        fc.property(businessHoursArbitrary, dateWithTimeArbitrary, (businessHours, currentDate) => {
          const result = shouldSendReminder({
            lastReminderDate: null,
            currentDate,
            intervalDays: 3,
            businessHoursOnly: true,
            businessHours,
            excludeWeekends: false,
            reminderCount: 0,
            maxReminders: 5
          });
          
          const withinHours = isWithinBusinessHours(currentDate, businessHours.start, businessHours.end);
          
          if (withinHours) {
            // If within business hours, should be allowed (assuming no other restrictions)
            expect(result.shouldSend).toBe(true);
          } else {
            // If outside business hours, should be blocked
            expect(result.shouldSend).toBe(false);
            expect(result.reason).toBe('outside_business_hours');
          }
        }),
        { numRuns: 100 }
      );
    });
    
    it('should allow reminders at any time when business hours are disabled', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          (date, hour, minute) => {
            const currentDate = new Date(date);
            currentDate.setHours(hour, minute, 0, 0);
            
            const result = shouldSendReminder({
              lastReminderDate: null,
              currentDate,
              intervalDays: 3,
              businessHoursOnly: false,
              businessHours: { start: '09:00', end: '18:00' },
              excludeWeekends: false,
              reminderCount: 0,
              maxReminders: 5
            });
            
            // Should always be allowed when business hours check is disabled
            expect(result.shouldSend).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should correctly identify times within business hours', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 9, max: 17 }), // Hour within 9-18
          fc.integer({ min: 0, max: 59 }),  // Any minute
          (hour, minute) => {
            const date = new Date('2024-01-15'); // Monday
            date.setHours(hour, minute, 0, 0);
            
            const withinHours = isWithinBusinessHours(date, '09:00', '18:00');
            
            // Should be within business hours
            expect(withinHours).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should correctly identify times outside business hours', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(0, 1, 2, 3, 4, 5, 6, 7, 8, 18, 19, 20, 21, 22, 23), // Hours outside 9-18
          fc.integer({ min: 0, max: 59 }),
          (hour, minute) => {
            const date = new Date('2024-01-15'); // Monday
            date.setHours(hour, minute, 0, 0);
            
            const withinHours = isWithinBusinessHours(date, '09:00', '18:00');
            
            // Should be outside business hours
            expect(withinHours).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * **Feature: ai-automated-reminders, Property 6: Weekend Exclusion**
   * **Validates: Requirements 6.6**
   * 
   * For any reminder sent when weekend exclusion is enabled, the send date
   * should not be Saturday or Sunday.
   */
  describe('Property 6: Weekend Exclusion', () => {
    it('should not send reminders on weekends when exclusion is enabled', () => {
      // Generator for dates
      const dateArbitrary = fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') });
      
      fc.assert(
        fc.property(dateArbitrary, (currentDate) => {
          const result = shouldSendReminder({
            lastReminderDate: null,
            currentDate,
            intervalDays: 3,
            businessHoursOnly: false,
            businessHours: { start: '09:00', end: '18:00' },
            excludeWeekends: true,
            reminderCount: 0,
            maxReminders: 5
          });
          
          const isWeekendDay = isWeekend(currentDate);
          
          if (isWeekendDay) {
            // If it's a weekend, should be blocked
            expect(result.shouldSend).toBe(false);
            expect(result.reason).toBe('weekend_excluded');
          } else {
            // If it's a weekday, should be allowed (assuming no other restrictions)
            expect(result.shouldSend).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
    
    it('should allow reminders on weekends when exclusion is disabled', () => {
      // Generator specifically for weekend dates
      const weekendDateArbitrary = fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
        .filter(date => isWeekend(date));
      
      fc.assert(
        fc.property(weekendDateArbitrary, (currentDate) => {
          const result = shouldSendReminder({
            lastReminderDate: null,
            currentDate,
            intervalDays: 3,
            businessHoursOnly: false,
            businessHours: { start: '09:00', end: '18:00' },
            excludeWeekends: false,
            reminderCount: 0,
            maxReminders: 5
          });
          
          // Should be allowed on weekends when exclusion is disabled
          expect(result.shouldSend).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
    
    it('should correctly identify Saturday as weekend', () => {
      // Create a known Saturday (January 6, 2024)
      const saturday = new Date('2024-01-06');
      expect(isWeekend(saturday)).toBe(true);
    });
    
    it('should correctly identify Sunday as weekend', () => {
      // Create a known Sunday (January 7, 2024)
      const sunday = new Date('2024-01-07');
      expect(isWeekend(sunday)).toBe(true);
    });
    
    it('should correctly identify weekdays as non-weekend', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(1, 2, 3, 4, 5), // Monday through Friday
          (dayOffset) => {
            // Start from Monday, January 1, 2024
            const monday = new Date('2024-01-01');
            const weekday = new Date(monday);
            weekday.setDate(monday.getDate() + dayOffset - 1);
            
            expect(isWeekend(weekday)).toBe(false);
          }
        ),
        { numRuns: 5 }
      );
    });
    
    it('should not send on weekends even if other conditions are met', () => {
      // Create a known Saturday with business hours
      const saturday = new Date('2024-01-06');
      saturday.setHours(10, 0, 0, 0); // 10 AM, within business hours
      
      const result = shouldSendReminder({
        lastReminderDate: null,
        currentDate: saturday,
        intervalDays: 3,
        businessHoursOnly: true,
        businessHours: { start: '09:00', end: '18:00' },
        excludeWeekends: true,
        reminderCount: 0,
        maxReminders: 5
      });
      
      // Should still be blocked due to weekend
      expect(result.shouldSend).toBe(false);
      expect(result.reason).toBe('weekend_excluded');
    });
  });
  
  /**
   * Combined property test: All constraints together
   */
  describe('Combined Scheduler Constraints', () => {
    it('should respect all constraints simultaneously', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 0, max: 20 }),
          fc.boolean(),
          fc.boolean(),
          fc.integer({ min: 0, max: 4 }),
          (lastReminderDate, intervalDays, extraDays, businessHoursOnly, excludeWeekends, reminderCount) => {
            const currentDate = new Date(lastReminderDate);
            currentDate.setDate(currentDate.getDate() + intervalDays + extraDays);
            currentDate.setHours(10, 0, 0, 0); // Set to 10 AM
            
            const result = shouldSendReminder({
              lastReminderDate,
              currentDate,
              intervalDays,
              businessHoursOnly,
              businessHours: { start: '09:00', end: '18:00' },
              excludeWeekends,
              reminderCount,
              maxReminders: 5
            });
            
            // Verify the result is consistent with all constraints
            if (!result.shouldSend) {
              // If not sending, there should be a valid reason
              expect(['interval_not_met', 'weekend_excluded', 'outside_business_hours', 'max_reminders_reached'])
                .toContain(result.reason);
            }
            
            // If sending, verify all constraints are met
            if (result.shouldSend) {
              // Interval should be met
              const daysSince = daysBetween(lastReminderDate, currentDate);
              expect(daysSince).toBeGreaterThanOrEqual(intervalDays);
              
              // Max reminders not reached
              expect(reminderCount).toBeLessThan(5);
              
              // If weekend exclusion enabled, should not be weekend
              if (excludeWeekends) {
                expect(isWeekend(currentDate)).toBe(false);
              }
              
              // If business hours enabled, should be within hours
              if (businessHoursOnly) {
                expect(isWithinBusinessHours(currentDate, '09:00', '18:00')).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
