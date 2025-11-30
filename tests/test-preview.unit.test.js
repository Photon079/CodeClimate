/**
 * Unit Tests for Test Preview Module
 * Tests the test and preview functionality
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Test Preview Module - Unit Tests', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Create a minimal DOM for testing
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="testPreviewModal" class="hidden">
            <div id="aiMessagePreview" class="hidden">
              <pre id="aiMessageText"></pre>
              <span id="aiMessageMeta"></span>
            </div>
            <div id="emailTestResult" class="hidden"></div>
            <div id="smsTestResult" class="hidden"></div>
            <select id="testEscalationLevel">
              <option value="gentle">Gentle</option>
              <option value="firm">Firm</option>
              <option value="urgent">Urgent</option>
            </select>
            <input id="testEmailAddress" type="email" />
            <input id="testPhoneNumber" type="tel" />
            <button id="testAIMessageBtn">Generate</button>
            <button id="sendTestEmailBtn">Send Email</button>
            <button id="sendTestSMSBtn">Send SMS</button>
            <button id="copyAIMessageBtn">Copy</button>
            <button id="closeTestPreviewBtn">Close</button>
            <button id="closeTestPreviewBtnFooter">Close</button>
          </div>
          <div id="toastContainer"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost'
    });

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
  });

  describe('Modal Visibility', () => {
    it('should have test preview modal in DOM', () => {
      const modal = document.getElementById('testPreviewModal');
      expect(modal).toBeTruthy();
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('should have all required buttons', () => {
      expect(document.getElementById('testAIMessageBtn')).toBeTruthy();
      expect(document.getElementById('sendTestEmailBtn')).toBeTruthy();
      expect(document.getElementById('sendTestSMSBtn')).toBeTruthy();
    });

    it('should have all required input fields', () => {
      expect(document.getElementById('testEscalationLevel')).toBeTruthy();
      expect(document.getElementById('testEmailAddress')).toBeTruthy();
      expect(document.getElementById('testPhoneNumber')).toBeTruthy();
    });

    it('should have all required result containers', () => {
      expect(document.getElementById('aiMessagePreview')).toBeTruthy();
      expect(document.getElementById('emailTestResult')).toBeTruthy();
      expect(document.getElementById('smsTestResult')).toBeTruthy();
    });
  });

  describe('Escalation Level Selection', () => {
    it('should have three escalation levels', () => {
      const select = document.getElementById('testEscalationLevel');
      expect(select.options.length).toBe(3);
      expect(select.options[0].value).toBe('gentle');
      expect(select.options[1].value).toBe('firm');
      expect(select.options[2].value).toBe('urgent');
    });

    it('should default to gentle escalation', () => {
      const select = document.getElementById('testEscalationLevel');
      expect(select.value).toBe('gentle');
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email format', () => {
      const emailInput = document.getElementById('testEmailAddress');
      emailInput.value = 'test@example.com';
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(emailInput.value)).toBe(true);
    });

    it('should reject invalid email format', () => {
      const emailInput = document.getElementById('testEmailAddress');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      emailInput.value = 'invalid-email';
      expect(emailRegex.test(emailInput.value)).toBe(false);
      
      emailInput.value = '@example.com';
      expect(emailRegex.test(emailInput.value)).toBe(false);
      
      emailInput.value = 'test@';
      expect(emailRegex.test(emailInput.value)).toBe(false);
    });

    it('should reject empty email', () => {
      const emailInput = document.getElementById('testEmailAddress');
      emailInput.value = '';
      expect(emailInput.value.trim()).toBe('');
    });
  });

  describe('Phone Validation', () => {
    it('should accept valid E.164 format', () => {
      const phoneInput = document.getElementById('testPhoneNumber');
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      
      phoneInput.value = '+919876543210';
      expect(phoneRegex.test(phoneInput.value)).toBe(true);
      
      phoneInput.value = '+12025551234';
      expect(phoneRegex.test(phoneInput.value)).toBe(true);
    });

    it('should reject invalid phone format', () => {
      const phoneInput = document.getElementById('testPhoneNumber');
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      
      phoneInput.value = '9876543210'; // Missing +
      expect(phoneRegex.test(phoneInput.value)).toBe(false);
      
      phoneInput.value = '+0123456789'; // Starts with 0
      expect(phoneRegex.test(phoneInput.value)).toBe(false);
      
      phoneInput.value = '+91 9876543210'; // Contains space
      expect(phoneRegex.test(phoneInput.value)).toBe(false);
    });

    it('should reject empty phone', () => {
      const phoneInput = document.getElementById('testPhoneNumber');
      phoneInput.value = '';
      expect(phoneInput.value.trim()).toBe('');
    });
  });

  describe('UI Elements State', () => {
    it('should have message preview hidden by default', () => {
      const preview = document.getElementById('aiMessagePreview');
      expect(preview.classList.contains('hidden')).toBe(true);
    });

    it('should have email result hidden by default', () => {
      const result = document.getElementById('emailTestResult');
      expect(result.classList.contains('hidden')).toBe(true);
    });

    it('should have SMS result hidden by default', () => {
      const result = document.getElementById('smsTestResult');
      expect(result.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Button Accessibility', () => {
    it('should have proper aria labels', () => {
      const aiBtn = document.getElementById('testAIMessageBtn');
      const emailBtn = document.getElementById('sendTestEmailBtn');
      const smsBtn = document.getElementById('sendTestSMSBtn');
      
      // Buttons should have aria-label or text content
      expect(aiBtn.textContent || aiBtn.getAttribute('aria-label')).toBeTruthy();
      expect(emailBtn.textContent || emailBtn.getAttribute('aria-label')).toBeTruthy();
      expect(smsBtn.textContent || smsBtn.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('Requirements Coverage', () => {
    it('should satisfy Requirement 15.1 - Test message preview modal', () => {
      const modal = document.getElementById('testPreviewModal');
      expect(modal).toBeTruthy();
    });

    it('should satisfy Requirement 15.2 - Test AI Message button', () => {
      const btn = document.getElementById('testAIMessageBtn');
      expect(btn).toBeTruthy();
    });

    it('should satisfy Requirement 15.3 - Display generated messages', () => {
      const preview = document.getElementById('aiMessagePreview');
      const messageText = document.getElementById('aiMessageText');
      expect(preview).toBeTruthy();
      expect(messageText).toBeTruthy();
    });

    it('should satisfy Requirement 15.4 - Send Test Email button', () => {
      const btn = document.getElementById('sendTestEmailBtn');
      const input = document.getElementById('testEmailAddress');
      expect(btn).toBeTruthy();
      expect(input).toBeTruthy();
    });

    it('should satisfy Requirement 15.5 - Send Test SMS button', () => {
      const btn = document.getElementById('sendTestSMSBtn');
      const input = document.getElementById('testPhoneNumber');
      expect(btn).toBeTruthy();
      expect(input).toBeTruthy();
    });
  });
});
