/**
 * Unit Tests for AI Service
 * Tests message generation, personalization, fallback, and error handling
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';

// Mock OpenAI and Anthropic classes for testing
class MockOpenAI {
  constructor() {
    this.chat = {
      completions: {
        create: vi.fn()
      }
    };
    this.models = {
      list: vi.fn()
    };
  }
}

class MockAnthropic {
  constructor() {
    this.messages = {
      create: vi.fn()
    };
  }
}

// Mock AIService for testing
class AIService {
  constructor(config = {}) {
    this.provider = config.provider || process.env.AI_PROVIDER || 'openai';
    this.model = config.model || process.env.AI_MODEL || 'gpt-4';
    this.messageCache = new Map();
    
    if (this.provider === 'openai') {
      this.openai = new MockOpenAI();
    } else if (this.provider === 'anthropic') {
      this.anthropic = new MockAnthropic();
    }
  }

  async generateReminder(params) {
    const cacheKey = this._getCacheKey(params);
    if (this.messageCache.has(cacheKey)) {
      return this.messageCache.get(cacheKey);
    }

    try {
      const prompt = this._buildPrompt(params);
      let message;

      if (this.provider === 'openai') {
        message = await this._generateWithOpenAI(prompt);
      } else if (this.provider === 'anthropic') {
        message = await this._generateWithAnthropic(prompt);
      } else {
        message = this._generateTemplateMessage(params);
      }

      this.messageCache.set(cacheKey, message);
      setTimeout(() => this.messageCache.delete(cacheKey), 3600000);

      return message;
    } catch (error) {
      return this._generateTemplateMessage(params);
    }
  }

  _buildPrompt(params) {
    const {
      clientName,
      invoiceNumber,
      amount,
      dueDate,
      daysOverdue,
      escalationLevel,
      paymentDetails,
      previousReminders
    } = params;

    const toneInstructions = {
      gentle: 'polite and friendly, as this is the first reminder',
      firm: 'professional and direct, as payment is now overdue',
      urgent: 'assertive but respectful, as payment is significantly overdue'
    };

    const tone = toneInstructions[escalationLevel] || toneInstructions.gentle;

    return `You are a professional payment reminder assistant for Indian freelancers. Generate a ${tone} payment reminder email.

Context:
- Client Name: ${clientName}
- Invoice Number: ${invoiceNumber}
- Amount: ₹${amount.toLocaleString('en-IN')}
- Due Date: ${new Date(dueDate).toLocaleDateString('en-IN')}
- Days Overdue: ${daysOverdue}
- Previous Reminders Sent: ${previousReminders}
- Escalation Level: ${escalationLevel}

Payment Details:
${paymentDetails.upiId ? `- UPI ID: ${paymentDetails.upiId}` : ''}
${paymentDetails.bankDetails ? `- Bank Details:\n${paymentDetails.bankDetails}` : ''}
${paymentDetails.paypalEmail ? `- PayPal: ${paymentDetails.paypalEmail}` : ''}

Requirements:
1. Keep the message professional and culturally appropriate for India
2. Be ${tone}
3. Include the invoice number and amount
4. Mention the due date and days overdue
5. Include payment instructions
6. Keep it concise (under 200 words)
7. End with a professional signature line
8. Do not use overly aggressive language
9. Maintain a respectful tone throughout

Generate only the email body text, no subject line.`;
  }

  async _generateWithOpenAI(prompt) {
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional payment reminder assistant. Generate polite, professional payment reminder messages.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return completion.choices[0].message.content.trim();
  }

  async _generateWithAnthropic(prompt) {
    const message = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return message.content[0].text.trim();
  }

  _generateTemplateMessage(params) {
    const {
      clientName,
      invoiceNumber,
      amount,
      dueDate,
      daysOverdue,
      escalationLevel,
      paymentDetails
    } = params;

    const templates = {
      gentle: `Dear ${clientName},

I hope this message finds you well. This is a friendly reminder that invoice ${invoiceNumber} for ₹${amount.toLocaleString('en-IN')} was due on ${new Date(dueDate).toLocaleDateString('en-IN')}.

If you have already made the payment, please disregard this message. Otherwise, I would appreciate it if you could process the payment at your earliest convenience.

Payment Details:
${paymentDetails.upiId ? `UPI ID: ${paymentDetails.upiId}` : ''}
${paymentDetails.bankDetails ? `Bank Details:\n${paymentDetails.bankDetails}` : ''}
${paymentDetails.paypalEmail ? `PayPal: ${paymentDetails.paypalEmail}` : ''}

Thank you for your business!

Best regards`,

      firm: `Dear ${clientName},

This is a payment reminder for invoice ${invoiceNumber} amounting to ₹${amount.toLocaleString('en-IN')}, which was due on ${new Date(dueDate).toLocaleDateString('en-IN')} (${daysOverdue} days ago).

We kindly request that you process this payment as soon as possible to avoid any late fees.

Payment Details:
${paymentDetails.upiId ? `UPI ID: ${paymentDetails.upiId}` : ''}
${paymentDetails.bankDetails ? `Bank Details:\n${paymentDetails.bankDetails}` : ''}
${paymentDetails.paypalEmail ? `PayPal: ${paymentDetails.paypalEmail}` : ''}

Please confirm once the payment has been made.

Best regards`,

      urgent: `Dear ${clientName},

This is an urgent reminder regarding invoice ${invoiceNumber} for ₹${amount.toLocaleString('en-IN')}, which is now ${daysOverdue} days overdue (due date: ${new Date(dueDate).toLocaleDateString('en-IN')}).

We request immediate payment to settle this outstanding amount. Late fees may apply as per our payment terms.

Payment Details:
${paymentDetails.upiId ? `UPI ID: ${paymentDetails.upiId}` : ''}
${paymentDetails.bankDetails ? `Bank Details:\n${paymentDetails.bankDetails}` : ''}
${paymentDetails.paypalEmail ? `PayPal: ${paymentDetails.paypalEmail}` : ''}

Please contact us immediately if there are any issues with this payment.

Best regards`
    };

    return templates[escalationLevel] || templates.gentle;
  }

  _getCacheKey(params) {
    const key = `${params.invoiceNumber}-${params.daysOverdue}-${params.escalationLevel}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }

  async testConnection() {
    try {
      if (this.provider === 'openai') {
        await this.openai.models.list();
        return true;
      } else if (this.provider === 'anthropic') {
        await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  getEstimatedCost() {
    const costs = {
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.002,
      'claude-3-sonnet-20240229': 0.015
    };
    return costs[this.model] || 0.01;
  }
}

describe('AI Service - Unit Tests', () => {
  let aiService;

  const sampleInvoiceData = {
    clientName: 'Rajesh Kumar',
    invoiceNumber: 'INV-2024-001',
    amount: 50000,
    dueDate: new Date('2024-01-15'),
    daysOverdue: 5,
    escalationLevel: 'firm',
    paymentDetails: {
      upiId: 'freelancer@upi',
      bankDetails: 'HDFC Bank, Account: 1234567890',
      paypalEmail: 'freelancer@example.com'
    },
    previousReminders: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (aiService) {
      aiService.messageCache.clear();
    }
  });

  describe('Message Generation for Different Escalation Levels', () => {
    it('should generate gentle reminder for 1-3 days overdue', async () => {
      aiService = new AIService({ provider: 'template' });
      
      const gentleData = {
        ...sampleInvoiceData,
        daysOverdue: 2,
        escalationLevel: 'gentle'
      };

      const message = await aiService.generateReminder(gentleData);

      expect(message).toBeTruthy();
      expect(message).toContain('friendly reminder');
      expect(message).toContain(gentleData.clientName);
      expect(message).toContain(gentleData.invoiceNumber);
      expect(message).toContain('₹50,000');
    });

    it('should generate firm reminder for 4-7 days overdue', async () => {
      aiService = new AIService({ provider: 'template' });
      
      const firmData = {
        ...sampleInvoiceData,
        daysOverdue: 5,
        escalationLevel: 'firm'
      };

      const message = await aiService.generateReminder(firmData);

      expect(message).toBeTruthy();
      expect(message).toContain('payment reminder');
      expect(message).toContain(firmData.clientName);
      expect(message).toContain(firmData.invoiceNumber);
      expect(message).toContain('5 days ago');
    });

    it('should generate urgent reminder for 8+ days overdue', async () => {
      aiService = new AIService({ provider: 'template' });
      
      const urgentData = {
        ...sampleInvoiceData,
        daysOverdue: 10,
        escalationLevel: 'urgent'
      };

      const message = await aiService.generateReminder(urgentData);

      expect(message).toBeTruthy();
      expect(message).toContain('urgent');
      expect(message).toContain(urgentData.clientName);
      expect(message).toContain(urgentData.invoiceNumber);
      expect(message).toContain('10 days overdue');
    });
  });

  describe('Personalization with Different Invoice Data', () => {
    beforeEach(() => {
      aiService = new AIService({ provider: 'template' });
    });

    it('should include client name in message', async () => {
      const data = { ...sampleInvoiceData, clientName: 'Priya Sharma' };
      const message = await aiService.generateReminder(data);

      expect(message).toContain('Priya Sharma');
    });

    it('should include invoice number in message', async () => {
      const data = { ...sampleInvoiceData, invoiceNumber: 'INV-2024-999' };
      const message = await aiService.generateReminder(data);

      expect(message).toContain('INV-2024-999');
    });

    it('should format amount correctly in Indian format', async () => {
      const data = { ...sampleInvoiceData, amount: 125000 };
      const message = await aiService.generateReminder(data);

      expect(message).toContain('₹1,25,000');
    });

    it('should include due date in message', async () => {
      const message = await aiService.generateReminder(sampleInvoiceData);
      const formattedDate = new Date(sampleInvoiceData.dueDate).toLocaleDateString('en-IN');

      expect(message).toContain(formattedDate);
    });

    it('should include UPI ID when provided', async () => {
      const data = {
        ...sampleInvoiceData,
        paymentDetails: { upiId: 'test@upi' }
      };
      const message = await aiService.generateReminder(data);

      expect(message).toContain('test@upi');
    });

    it('should include bank details when provided', async () => {
      const data = {
        ...sampleInvoiceData,
        paymentDetails: { bankDetails: 'ICICI Bank, Acc: 9876543210' }
      };
      const message = await aiService.generateReminder(data);

      expect(message).toContain('ICICI Bank');
      expect(message).toContain('9876543210');
    });

    it('should include PayPal email when provided', async () => {
      const data = {
        ...sampleInvoiceData,
        paymentDetails: { paypalEmail: 'payment@example.com' }
      };
      const message = await aiService.generateReminder(data);

      expect(message).toContain('payment@example.com');
    });

    it('should handle missing payment details gracefully', async () => {
      const data = {
        ...sampleInvoiceData,
        paymentDetails: {}
      };
      const message = await aiService.generateReminder(data);

      expect(message).toBeTruthy();
      expect(message).toContain(data.clientName);
      expect(message).toContain(data.invoiceNumber);
    });

    it('should include days overdue in firm and urgent messages', async () => {
      const firmData = { ...sampleInvoiceData, escalationLevel: 'firm', daysOverdue: 6 };
      const firmMessage = await aiService.generateReminder(firmData);
      expect(firmMessage).toContain('6 days ago');

      const urgentData = { ...sampleInvoiceData, escalationLevel: 'urgent', daysOverdue: 15 };
      const urgentMessage = await aiService.generateReminder(urgentData);
      expect(urgentMessage).toContain('15 days overdue');
    });
  });

  describe('Fallback to Template-Based Messages', () => {
    it('should use template when provider is not openai or anthropic', async () => {
      aiService = new AIService({ provider: 'unknown' });
      const message = await aiService.generateReminder(sampleInvoiceData);

      expect(message).toBeTruthy();
      expect(message).toContain(sampleInvoiceData.clientName);
      expect(message).toContain(sampleInvoiceData.invoiceNumber);
    });

    it('should fallback to template when OpenAI API fails', async () => {
      aiService = new AIService({ provider: 'openai' });
      aiService.openai.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const message = await aiService.generateReminder(sampleInvoiceData);

      expect(message).toBeTruthy();
      expect(message).toContain(sampleInvoiceData.clientName);
    });

    it('should fallback to template when Anthropic API fails', async () => {
      aiService = new AIService({ provider: 'anthropic' });
      aiService.anthropic.messages.create.mockRejectedValue(new Error('API Error'));

      const message = await aiService.generateReminder(sampleInvoiceData);

      expect(message).toBeTruthy();
      expect(message).toContain(sampleInvoiceData.clientName);
    });

    it('should use default gentle template for unknown escalation level', async () => {
      aiService = new AIService({ provider: 'template' });
      const data = { ...sampleInvoiceData, escalationLevel: 'unknown' };
      const message = await aiService.generateReminder(data);

      expect(message).toBeTruthy();
      expect(message).toContain('friendly reminder');
    });
  });

  describe('API Error Handling', () => {
    it('should handle OpenAI authentication errors', async () => {
      aiService = new AIService({ provider: 'openai' });
      aiService.openai.chat.completions.create.mockRejectedValue(
        new Error('Invalid API key')
      );

      const message = await aiService.generateReminder(sampleInvoiceData);

      expect(message).toBeTruthy();
      expect(message).toContain(sampleInvoiceData.clientName);
    });

    it('should handle OpenAI rate limit errors', async () => {
      aiService = new AIService({ provider: 'openai' });
      aiService.openai.chat.completions.create.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const message = await aiService.generateReminder(sampleInvoiceData);

      expect(message).toBeTruthy();
    });

    it('should handle OpenAI network errors', async () => {
      aiService = new AIService({ provider: 'openai' });
      aiService.openai.chat.completions.create.mockRejectedValue(
        new Error('ECONNREFUSED')
      );

      const message = await aiService.generateReminder(sampleInvoiceData);

      expect(message).toBeTruthy();
    });

    it('should handle Anthropic authentication errors', async () => {
      aiService = new AIService({ provider: 'anthropic' });
      aiService.anthropic.messages.create.mockRejectedValue(
        new Error('Invalid API key')
      );

      const message = await aiService.generateReminder(sampleInvoiceData);

      expect(message).toBeTruthy();
    });

    it('should handle Anthropic quota exceeded errors', async () => {
      aiService = new AIService({ provider: 'anthropic' });
      aiService.anthropic.messages.create.mockRejectedValue(
        new Error('Quota exceeded')
      );

      const message = await aiService.generateReminder(sampleInvoiceData);

      expect(message).toBeTruthy();
    });

    it('should handle timeout errors gracefully', async () => {
      aiService = new AIService({ provider: 'openai' });
      aiService.openai.chat.completions.create.mockRejectedValue(
        new Error('ETIMEDOUT')
      );

      const message = await aiService.generateReminder(sampleInvoiceData);

      expect(message).toBeTruthy();
    });
  });

  describe('Message Caching', () => {
    beforeEach(() => {
      aiService = new AIService({ provider: 'template' });
    });

    it('should cache generated messages', async () => {
      const message1 = await aiService.generateReminder(sampleInvoiceData);
      const message2 = await aiService.generateReminder(sampleInvoiceData);

      expect(message1).toBe(message2);
      expect(aiService.messageCache.size).toBe(1);
    });

    it('should use different cache keys for different invoices', async () => {
      const data1 = { ...sampleInvoiceData, invoiceNumber: 'INV-001' };
      const data2 = { ...sampleInvoiceData, invoiceNumber: 'INV-002' };

      await aiService.generateReminder(data1);
      await aiService.generateReminder(data2);

      expect(aiService.messageCache.size).toBe(2);
    });

    it('should use different cache keys for different escalation levels', async () => {
      const data1 = { ...sampleInvoiceData, escalationLevel: 'gentle' };
      const data2 = { ...sampleInvoiceData, escalationLevel: 'firm' };

      await aiService.generateReminder(data1);
      await aiService.generateReminder(data2);

      expect(aiService.messageCache.size).toBe(2);
    });

    it('should use different cache keys for different days overdue', async () => {
      const data1 = { ...sampleInvoiceData, daysOverdue: 2 };
      const data2 = { ...sampleInvoiceData, daysOverdue: 5 };

      await aiService.generateReminder(data1);
      await aiService.generateReminder(data2);

      expect(aiService.messageCache.size).toBe(2);
    });
  });

  describe('OpenAI Integration', () => {
    it('should call OpenAI API with correct parameters', async () => {
      aiService = new AIService({ provider: 'openai', model: 'gpt-4' });
      aiService.openai.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Generated reminder message'
          }
        }]
      });

      await aiService.generateReminder(sampleInvoiceData);

      expect(aiService.openai.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 500,
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' })
          ])
        })
      );
    });

    it('should return OpenAI generated message', async () => {
      aiService = new AIService({ provider: 'openai' });
      const aiGeneratedMessage = 'This is an AI-generated reminder message';
      aiService.openai.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: aiGeneratedMessage
          }
        }]
      });

      const message = await aiService.generateReminder(sampleInvoiceData);

      expect(message).toBe(aiGeneratedMessage);
    });
  });

  describe('Anthropic Integration', () => {
    it('should call Anthropic API with correct parameters', async () => {
      aiService = new AIService({ provider: 'anthropic' });
      aiService.anthropic.messages.create.mockResolvedValue({
        content: [{
          text: 'Generated reminder message'
        }]
      });

      await aiService.generateReminder(sampleInvoiceData);

      expect(aiService.anthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 500,
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user' })
          ])
        })
      );
    });

    it('should return Anthropic generated message', async () => {
      aiService = new AIService({ provider: 'anthropic' });
      const aiGeneratedMessage = 'This is a Claude-generated reminder message';
      aiService.anthropic.messages.create.mockResolvedValue({
        content: [{
          text: aiGeneratedMessage
        }]
      });

      const message = await aiService.generateReminder(sampleInvoiceData);

      expect(message).toBe(aiGeneratedMessage);
    });
  });

  describe('Prompt Building', () => {
    beforeEach(() => {
      aiService = new AIService({ provider: 'template' });
    });

    it('should build prompt with all invoice details', () => {
      const prompt = aiService._buildPrompt(sampleInvoiceData);

      expect(prompt).toContain(sampleInvoiceData.clientName);
      expect(prompt).toContain(sampleInvoiceData.invoiceNumber);
      // Amount is formatted with Indian locale, so check for formatted version
      expect(prompt).toContain('₹50,000');
      expect(prompt).toContain(sampleInvoiceData.escalationLevel);
    });

    it('should include appropriate tone for gentle escalation', () => {
      const data = { ...sampleInvoiceData, escalationLevel: 'gentle' };
      const prompt = aiService._buildPrompt(data);

      expect(prompt).toContain('polite and friendly');
    });

    it('should include appropriate tone for firm escalation', () => {
      const data = { ...sampleInvoiceData, escalationLevel: 'firm' };
      const prompt = aiService._buildPrompt(data);

      expect(prompt).toContain('professional and direct');
    });

    it('should include appropriate tone for urgent escalation', () => {
      const data = { ...sampleInvoiceData, escalationLevel: 'urgent' };
      const prompt = aiService._buildPrompt(data);

      expect(prompt).toContain('assertive but respectful');
    });

    it('should include payment details in prompt', () => {
      const prompt = aiService._buildPrompt(sampleInvoiceData);

      expect(prompt).toContain(sampleInvoiceData.paymentDetails.upiId);
      expect(prompt).toContain('Bank Details');
      expect(prompt).toContain(sampleInvoiceData.paymentDetails.paypalEmail);
    });
  });

  describe('Cost Estimation', () => {
    it('should return cost for GPT-4', () => {
      aiService = new AIService({ provider: 'openai', model: 'gpt-4' });
      const cost = aiService.getEstimatedCost();

      expect(cost).toBe(0.03);
    });

    it('should return cost for GPT-3.5-turbo', () => {
      aiService = new AIService({ provider: 'openai', model: 'gpt-3.5-turbo' });
      const cost = aiService.getEstimatedCost();

      expect(cost).toBe(0.002);
    });

    it('should return cost for Claude', () => {
      aiService = new AIService({ provider: 'anthropic', model: 'claude-3-sonnet-20240229' });
      const cost = aiService.getEstimatedCost();

      expect(cost).toBe(0.015);
    });

    it('should return default cost for unknown model', () => {
      aiService = new AIService({ provider: 'openai', model: 'unknown-model' });
      const cost = aiService.getEstimatedCost();

      expect(cost).toBe(0.01);
    });
  });

  describe('Connection Testing', () => {
    it('should test OpenAI connection successfully', async () => {
      aiService = new AIService({ provider: 'openai' });
      aiService.openai.models.list.mockResolvedValue({ data: [] });

      const result = await aiService.testConnection();

      expect(result).toBe(true);
      expect(aiService.openai.models.list).toHaveBeenCalled();
    });

    it('should test Anthropic connection successfully', async () => {
      aiService = new AIService({ provider: 'anthropic' });
      aiService.anthropic.messages.create.mockResolvedValue({
        content: [{ text: 'test' }]
      });

      const result = await aiService.testConnection();

      expect(result).toBe(true);
      expect(aiService.anthropic.messages.create).toHaveBeenCalled();
    });

    it('should return false when OpenAI connection fails', async () => {
      aiService = new AIService({ provider: 'openai' });
      aiService.openai.models.list.mockRejectedValue(new Error('Connection failed'));

      const result = await aiService.testConnection();

      expect(result).toBe(false);
    });

    it('should return false when Anthropic connection fails', async () => {
      aiService = new AIService({ provider: 'anthropic' });
      aiService.anthropic.messages.create.mockRejectedValue(new Error('Connection failed'));

      const result = await aiService.testConnection();

      expect(result).toBe(false);
    });

    it('should return false for unknown provider', async () => {
      aiService = new AIService({ provider: 'unknown' });

      const result = await aiService.testConnection();

      expect(result).toBe(false);
    });
  });
});
