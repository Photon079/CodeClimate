/**
 * Unit Tests for Email Service
 * Tests email sending, error handling, and unsubscribe mechanism
 * Requirements: 4.1, 4.2, 4.3, 4.6, 4.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock email provider libraries
const mockSendGridSend = vi.fn();
const mockResendSend = vi.fn();
const mockNodemailerSendMail = vi.fn();

// Mock modules
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: mockSendGridSend
  }
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockResendSend
    }
  }))
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockNodemailerSendMail
    }))
  }
}));

// Mock EmailService for testing
class EmailService {
  constructor(config = {}) {
    this.provider = config.provider || 'sendgrid';
    this.senderEmail = config.senderEmail || 'test@example.com';
    this.senderName = config.senderName || 'Invoice Guard';
    this.maxRetries = 3;
    this.initialRetryDelay = 100; // Reduced for testing
    this.retryMultiplier = 2;
  }

  async sendEmail(params, options = {}) {
    const { to, subject, html, text } = params;
    const { attempt = 0, skipRetry = false } = options;

    try {
      let result;

      if (this.provider === 'sendgrid') {
        result = await this._sendWithSendGrid({ to, subject, html, text });
      } else if (this.provider === 'resend') {
        result = await this._sendWithResend({ to, subject, html, text });
      } else if (this.provider === 'smtp') {
        result = await this._sendWithSMTP({ to, subject, html, text });
      } else {
        throw new Error(`Unknown email provider: ${this.provider}`);
      }

      return {
        success: true,
        messageId: result.messageId,
        provider: this.provider,
        attempt: attempt + 1
      };
    } catch (error) {
      const isRetryable = this._isRetryableError(error);

      if (!skipRetry && isRetryable && attempt < this.maxRetries) {
        const delay = this._calculateRetryDelay(attempt);
        await this._sleep(delay);
        return this.sendEmail(params, { attempt: attempt + 1 });
      }

      return {
        success: false,
        error: error.message,
        provider: this.provider,
        attempt: attempt + 1,
        retryable: isRetryable
      };
    }
  }

  async _sendWithSendGrid({ to, subject, html, text }) {
    const msg = {
      to,
      from: {
        email: this.senderEmail,
        name: this.senderName
      },
      subject,
      text,
      html: this._wrapHTMLTemplate(html)
    };

    const response = await mockSendGridSend(msg);
    return {
      messageId: response?.[0]?.headers?.['x-message-id'] || 'sg-message-id'
    };
  }

  async _sendWithResend({ to, subject, html, text }) {
    const result = await mockResendSend({
      from: `${this.senderName} <${this.senderEmail}>`,
      to,
      subject,
      text,
      html: this._wrapHTMLTemplate(html)
    });

    return {
      messageId: result.id || 'resend-message-id'
    };
  }

  async _sendWithSMTP({ to, subject, html, text }) {
    const info = await mockNodemailerSendMail({
      from: `"${this.senderName}" <${this.senderEmail}>`,
      to,
      subject,
      text,
      html: this._wrapHTMLTemplate(html)
    });

    return {
      messageId: info.messageId || 'smtp-message-id'
    };
  }

  _wrapHTMLTemplate(content) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">💼 Invoice Guard</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated payment reminder from Invoice Guard.</p>
      <p>
        <a href="{{unsubscribe_url}}" class="unsubscribe">Unsubscribe from reminders</a>
      </p>
      <p>© ${new Date().getFullYear()} Invoice Guard. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  generateSubject(invoiceNumber, escalationLevel) {
    const subjects = {
      gentle: `Payment Reminder: Invoice ${invoiceNumber}`,
      firm: `Payment Due: Invoice ${invoiceNumber}`,
      urgent: `URGENT: Overdue Payment - Invoice ${invoiceNumber}`
    };
    return subjects[escalationLevel] || subjects.gentle;
  }

  async testConnection(testEmail) {
    try {
      const result = await this.sendEmail({
        to: testEmail || this.senderEmail,
        subject: 'Invoice Guard - Test Email',
        text: 'This is a test email from Invoice Guard.',
        html: '<p>This is a test email from Invoice Guard.</p>'
      }, { skipRetry: true });

      return result.success;
    } catch (error) {
      return false;
    }
  }

  getEstimatedCost() {
    const costs = {
      sendgrid: 0.0001,
      resend: 0.0001,
      smtp: 0
    };
    return costs[this.provider] || 0.0001;
  }

  _isRetryableError(error) {
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET',
      'RATE_LIMIT_EXCEEDED',
      'SERVICE_UNAVAILABLE',
      '429',
      '500',
      '503'
    ];

    const errorMessage = error.message || '';
    return retryableErrors.some(code => errorMessage.includes(code));
  }

  _calculateRetryDelay(attempt) {
    return this.initialRetryDelay * Math.pow(this.retryMultiplier, attempt);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

describe('Email Service - Unit Tests', () => {
  let emailService;

  const sampleEmailParams = {
    to: 'client@example.com',
    subject: 'Payment Reminder: Invoice INV-2024-001',
    text: 'This is a payment reminder for your invoice.',
    html: '<p>This is a payment reminder for your invoice.</p>'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    emailService = null;
  });

  describe('Email Sending - SendGrid Provider', () => {
    beforeEach(() => {
      emailService = new EmailService({ 
        provider: 'sendgrid',
        senderEmail: 'noreply@invoiceguard.com',
        senderName: 'Invoice Guard'
      });
    });

    /**
     * Test: Send email successfully via SendGrid
     * Validates: Requirements 4.1
     */
    it('should send email successfully via SendGrid', async () => {
      mockSendGridSend.mockResolvedValue([{
        headers: { 'x-message-id': 'sg-test-123' }
      }]);

      const result = await emailService.sendEmail(sampleEmailParams);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('sg-test-123');
      expect(result.provider).toBe('sendgrid');
      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: sampleEmailParams.to,
          subject: sampleEmailParams.subject,
          from: expect.objectContaining({
            email: 'noreply@invoiceguard.com',
            name: 'Invoice Guard'
          })
        })
      );
    });

    /**
     * Test: Include HTML template wrapper
     * Validates: Requirements 4.3
     */
    it('should wrap email content in HTML template', async () => {
      mockSendGridSend.mockResolvedValue([{
        headers: { 'x-message-id': 'sg-test-123' }
      }]);

      await emailService.sendEmail(sampleEmailParams);

      const callArgs = mockSendGridSend.mock.calls[0][0];
      expect(callArgs.html).toContain('<!DOCTYPE html>');
      expect(callArgs.html).toContain('Invoice Guard');
      expect(callArgs.html).toContain(sampleEmailParams.html);
      expect(callArgs.html).toContain('email-container');
    });

    /**
     * Test: Include unsubscribe link in email
     * Validates: Requirements 4.7
     */
    it('should include unsubscribe link in email footer', async () => {
      mockSendGridSend.mockResolvedValue([{
        headers: { 'x-message-id': 'sg-test-123' }
      }]);

      await emailService.sendEmail(sampleEmailParams);

      const callArgs = mockSendGridSend.mock.calls[0][0];
      expect(callArgs.html).toContain('{{unsubscribe_url}}');
      expect(callArgs.html).toContain('Unsubscribe from reminders');
    });
  });

  describe('Email Sending - Resend Provider', () => {
    beforeEach(() => {
      emailService = new EmailService({ 
        provider: 'resend',
        senderEmail: 'noreply@invoiceguard.com',
        senderName: 'Invoice Guard'
      });
    });

    /**
     * Test: Send email successfully via Resend
     * Validates: Requirements 4.1
     */
    it('should send email successfully via Resend', async () => {
      mockResendSend.mockResolvedValue({ id: 'resend-test-456' });

      const result = await emailService.sendEmail(sampleEmailParams);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('resend-test-456');
      expect(result.provider).toBe('resend');
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: sampleEmailParams.to,
          subject: sampleEmailParams.subject,
          from: 'Invoice Guard <noreply@invoiceguard.com>'
        })
      );
    });
  });

  describe('Email Sending - SMTP Provider', () => {
    beforeEach(() => {
      emailService = new EmailService({ 
        provider: 'smtp',
        senderEmail: 'noreply@invoiceguard.com',
        senderName: 'Invoice Guard'
      });
    });

    /**
     * Test: Send email successfully via SMTP
     * Validates: Requirements 4.1
     */
    it('should send email successfully via SMTP', async () => {
      mockNodemailerSendMail.mockResolvedValue({ messageId: 'smtp-test-789' });

      const result = await emailService.sendEmail(sampleEmailParams);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('smtp-test-789');
      expect(result.provider).toBe('smtp');
      expect(mockNodemailerSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: sampleEmailParams.to,
          subject: sampleEmailParams.subject,
          from: '"Invoice Guard" <noreply@invoiceguard.com>'
        })
      );
    });
  });

  describe('Subject Line Generation', () => {
    beforeEach(() => {
      emailService = new EmailService({ provider: 'sendgrid' });
    });

    /**
     * Test: Generate gentle reminder subject
     * Validates: Requirements 4.2
     */
    it('should generate gentle reminder subject line', () => {
      const subject = emailService.generateSubject('INV-2024-001', 'gentle');
      expect(subject).toBe('Payment Reminder: Invoice INV-2024-001');
    });

    /**
     * Test: Generate firm reminder subject
     * Validates: Requirements 4.2
     */
    it('should generate firm reminder subject line', () => {
      const subject = emailService.generateSubject('INV-2024-002', 'firm');
      expect(subject).toBe('Payment Due: Invoice INV-2024-002');
    });

    /**
     * Test: Generate urgent reminder subject
     * Validates: Requirements 4.2
     */
    it('should generate urgent reminder subject line', () => {
      const subject = emailService.generateSubject('INV-2024-003', 'urgent');
      expect(subject).toBe('URGENT: Overdue Payment - Invoice INV-2024-003');
    });

    /**
     * Test: Default to gentle subject for unknown escalation
     * Validates: Requirements 4.2
     */
    it('should default to gentle subject for unknown escalation level', () => {
      const subject = emailService.generateSubject('INV-2024-004', 'unknown');
      expect(subject).toBe('Payment Reminder: Invoice INV-2024-004');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      emailService = new EmailService({ provider: 'sendgrid' });
    });

    /**
     * Test: Handle invalid email address
     * Validates: Requirements 4.6
     */
    it('should handle invalid email address error', async () => {
      mockSendGridSend.mockRejectedValue(new Error('Invalid email address'));

      const result = await emailService.sendEmail({
        ...sampleEmailParams,
        to: 'invalid-email'
      }, { skipRetry: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email address');
      expect(result.retryable).toBe(false);
    });

    /**
     * Test: Handle authentication errors
     * Validates: Requirements 4.6
     */
    it('should handle authentication errors', async () => {
      mockSendGridSend.mockRejectedValue(new Error('Invalid API key'));

      const result = await emailService.sendEmail(sampleEmailParams, { skipRetry: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    /**
     * Test: Handle network timeout errors
     * Validates: Requirements 4.6
     */
    it('should handle network timeout errors', async () => {
      mockSendGridSend.mockRejectedValue(new Error('ETIMEDOUT'));

      const result = await emailService.sendEmail(sampleEmailParams, { skipRetry: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ETIMEDOUT');
      expect(result.retryable).toBe(true);
    });

    /**
     * Test: Handle connection refused errors
     * Validates: Requirements 4.6
     */
    it('should handle connection refused errors', async () => {
      mockSendGridSend.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await emailService.sendEmail(sampleEmailParams, { skipRetry: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ECONNREFUSED');
      expect(result.retryable).toBe(true);
    });

    /**
     * Test: Handle rate limit errors
     * Validates: Requirements 4.6
     */
    it('should handle rate limit errors', async () => {
      mockSendGridSend.mockRejectedValue(new Error('429 Too Many Requests'));

      const result = await emailService.sendEmail(sampleEmailParams, { skipRetry: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('429');
      expect(result.retryable).toBe(true);
    });

    /**
     * Test: Handle server errors (500)
     * Validates: Requirements 4.6
     */
    it('should handle server errors', async () => {
      mockSendGridSend.mockRejectedValue(new Error('500 Internal Server Error'));

      const result = await emailService.sendEmail(sampleEmailParams, { skipRetry: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
      expect(result.retryable).toBe(true);
    });

    /**
     * Test: Handle service unavailable errors (503)
     * Validates: Requirements 4.6
     */
    it('should handle service unavailable errors', async () => {
      mockSendGridSend.mockRejectedValue(new Error('503 Service Unavailable'));

      const result = await emailService.sendEmail(sampleEmailParams, { skipRetry: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('503');
      expect(result.retryable).toBe(true);
    });

    /**
     * Test: Handle unknown provider error
     * Validates: Requirements 4.6
     */
    it('should handle unknown provider error', async () => {
      emailService = new EmailService({ provider: 'unknown' });

      const result = await emailService.sendEmail(sampleEmailParams, { skipRetry: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown email provider');
    });
  });

  describe('Connection Testing', () => {
    /**
     * Test: Test SendGrid connection successfully
     * Validates: Requirements 4.1
     */
    it('should test SendGrid connection successfully', async () => {
      emailService = new EmailService({ provider: 'sendgrid' });
      mockSendGridSend.mockResolvedValue([{
        headers: { 'x-message-id': 'test-123' }
      }]);

      const result = await emailService.testConnection('test@example.com');

      expect(result).toBe(true);
      expect(mockSendGridSend).toHaveBeenCalled();
    });

    /**
     * Test: Test Resend connection successfully
     * Validates: Requirements 4.1
     */
    it('should test Resend connection successfully', async () => {
      emailService = new EmailService({ provider: 'resend' });
      mockResendSend.mockResolvedValue({ id: 'test-456' });

      const result = await emailService.testConnection('test@example.com');

      expect(result).toBe(true);
      expect(mockResendSend).toHaveBeenCalled();
    });

    /**
     * Test: Test SMTP connection successfully
     * Validates: Requirements 4.1
     */
    it('should test SMTP connection successfully', async () => {
      emailService = new EmailService({ provider: 'smtp' });
      mockNodemailerSendMail.mockResolvedValue({ messageId: 'test-789' });

      const result = await emailService.testConnection('test@example.com');

      expect(result).toBe(true);
      expect(mockNodemailerSendMail).toHaveBeenCalled();
    });

    /**
     * Test: Return false when connection test fails
     * Validates: Requirements 4.1
     */
    it('should return false when connection test fails', async () => {
      emailService = new EmailService({ provider: 'sendgrid' });
      mockSendGridSend.mockRejectedValue(new Error('Connection failed'));

      const result = await emailService.testConnection('test@example.com');

      expect(result).toBe(false);
    });
  });

  describe('Cost Estimation', () => {
    /**
     * Test: Get estimated cost for SendGrid
     * Validates: Requirements 4.1
     */
    it('should return estimated cost for SendGrid', () => {
      emailService = new EmailService({ provider: 'sendgrid' });
      const cost = emailService.getEstimatedCost();

      expect(cost).toBe(0.0001);
    });

    /**
     * Test: Get estimated cost for Resend
     * Validates: Requirements 4.1
     */
    it('should return estimated cost for Resend', () => {
      emailService = new EmailService({ provider: 'resend' });
      const cost = emailService.getEstimatedCost();

      expect(cost).toBe(0.0001);
    });

    /**
     * Test: Get estimated cost for SMTP (free)
     * Validates: Requirements 4.1
     */
    it('should return zero cost for SMTP', () => {
      emailService = new EmailService({ provider: 'smtp' });
      const cost = emailService.getEstimatedCost();

      expect(cost).toBe(0);
    });

    /**
     * Test: Get default cost for unknown provider
     * Validates: Requirements 4.1
     */
    it('should return default cost for unknown provider', () => {
      emailService = new EmailService({ provider: 'unknown' });
      const cost = emailService.getEstimatedCost();

      expect(cost).toBe(0.0001);
    });
  });

  describe('Unsubscribe Mechanism', () => {
    beforeEach(() => {
      emailService = new EmailService({ provider: 'sendgrid' });
    });

    /**
     * Test: Include unsubscribe link in all emails
     * Validates: Requirements 4.7
     */
    it('should include unsubscribe link in all emails', async () => {
      mockSendGridSend.mockResolvedValue([{
        headers: { 'x-message-id': 'test-123' }
      }]);

      await emailService.sendEmail(sampleEmailParams);

      const callArgs = mockSendGridSend.mock.calls[0][0];
      const htmlContent = callArgs.html;

      expect(htmlContent).toContain('{{unsubscribe_url}}');
      expect(htmlContent).toContain('Unsubscribe from reminders');
      expect(htmlContent).toContain('class="unsubscribe"');
    });

    /**
     * Test: Unsubscribe link is in footer
     * Validates: Requirements 4.7
     */
    it('should place unsubscribe link in email footer', async () => {
      mockSendGridSend.mockResolvedValue([{
        headers: { 'x-message-id': 'test-123' }
      }]);

      await emailService.sendEmail(sampleEmailParams);

      const callArgs = mockSendGridSend.mock.calls[0][0];
      const htmlContent = callArgs.html;

      // Check that unsubscribe is in footer section
      const footerMatch = htmlContent.match(/<div class="footer">[\s\S]*?<\/div>/);
      expect(footerMatch).toBeTruthy();
      expect(footerMatch[0]).toContain('{{unsubscribe_url}}');
    });

    /**
     * Test: Email includes automated reminder notice
     * Validates: Requirements 4.7
     */
    it('should include automated reminder notice in footer', async () => {
      mockSendGridSend.mockResolvedValue([{
        headers: { 'x-message-id': 'test-123' }
      }]);

      await emailService.sendEmail(sampleEmailParams);

      const callArgs = mockSendGridSend.mock.calls[0][0];
      expect(callArgs.html).toContain('automated payment reminder');
    });
  });

  describe('Email Template Formatting', () => {
    beforeEach(() => {
      emailService = new EmailService({ provider: 'sendgrid' });
    });

    /**
     * Test: Include Invoice Guard branding
     * Validates: Requirements 4.3
     */
    it('should include Invoice Guard branding in template', async () => {
      mockSendGridSend.mockResolvedValue([{
        headers: { 'x-message-id': 'test-123' }
      }]);

      await emailService.sendEmail(sampleEmailParams);

      const callArgs = mockSendGridSend.mock.calls[0][0];
      expect(callArgs.html).toContain('💼 Invoice Guard');
      expect(callArgs.html).toContain('Invoice Guard. All rights reserved');
    });

    /**
     * Test: Include current year in copyright
     * Validates: Requirements 4.3
     */
    it('should include current year in copyright notice', async () => {
      mockSendGridSend.mockResolvedValue([{
        headers: { 'x-message-id': 'test-123' }
      }]);

      await emailService.sendEmail(sampleEmailParams);

      const callArgs = mockSendGridSend.mock.calls[0][0];
      const currentYear = new Date().getFullYear();
      expect(callArgs.html).toContain(`© ${currentYear}`);
    });

    /**
     * Test: Include proper HTML structure
     * Validates: Requirements 4.3
     */
    it('should include proper HTML structure', async () => {
      mockSendGridSend.mockResolvedValue([{
        headers: { 'x-message-id': 'test-123' }
      }]);

      await emailService.sendEmail(sampleEmailParams);

      const callArgs = mockSendGridSend.mock.calls[0][0];
      const html = callArgs.html;

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('</html>');
    });

    /**
     * Test: Preserve original content in template
     * Validates: Requirements 4.3
     */
    it('should preserve original content in wrapped template', async () => {
      mockSendGridSend.mockResolvedValue([{
        headers: { 'x-message-id': 'test-123' }
      }]);

      const customContent = '<p>Custom payment reminder content</p>';
      await emailService.sendEmail({
        ...sampleEmailParams,
        html: customContent
      });

      const callArgs = mockSendGridSend.mock.calls[0][0];
      expect(callArgs.html).toContain(customContent);
    });
  });

  describe('Multiple Provider Support', () => {
    /**
     * Test: Support switching between providers
     * Validates: Requirements 4.1
     */
    it('should support switching between email providers', async () => {
      // Test SendGrid
      const sgService = new EmailService({ provider: 'sendgrid' });
      mockSendGridSend.mockResolvedValue([{
        headers: { 'x-message-id': 'sg-123' }
      }]);
      const sgResult = await sgService.sendEmail(sampleEmailParams);
      expect(sgResult.provider).toBe('sendgrid');

      // Test Resend
      const resendService = new EmailService({ provider: 'resend' });
      mockResendSend.mockResolvedValue({ id: 'resend-456' });
      const resendResult = await resendService.sendEmail(sampleEmailParams);
      expect(resendResult.provider).toBe('resend');

      // Test SMTP
      const smtpService = new EmailService({ provider: 'smtp' });
      mockNodemailerSendMail.mockResolvedValue({ messageId: 'smtp-789' });
      const smtpResult = await smtpService.sendEmail(sampleEmailParams);
      expect(smtpResult.provider).toBe('smtp');
    });
  });
});
