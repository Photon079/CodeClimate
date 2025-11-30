/**
 * AI Service - Handles AI-powered message generation
 * Supports OpenAI and Anthropic APIs
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'openai';
    this.model = process.env.AI_MODEL || 'gpt-4';
    
    // Initialize clients only if API keys are provided
    if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else if (this.provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
    
    // Message cache to reduce API calls
    this.messageCache = new Map();
  }

  /**
   * Generate a personalized payment reminder message
   * @param {Object} params - Invoice and client details
   * @returns {Promise<string>} Generated reminder message
   */
  async generateReminder(params) {
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

    // Check cache first
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
        // Fallback to template-based message
        message = this._generateTemplateMessage(params);
      }

      // Cache the message
      this.messageCache.set(cacheKey, message);
      
      // Clear cache after 1 hour
      setTimeout(() => this.messageCache.delete(cacheKey), 3600000);

      return message;
    } catch (error) {
      console.error('AI message generation failed:', error);
      // Fallback to template-based message
      return this._generateTemplateMessage(params);
    }
  }

  /**
   * Build the AI prompt based on invoice details
   * @private
   */
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

  /**
   * Generate message using OpenAI
   * @private
   */
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

  /**
   * Generate message using Anthropic Claude
   * @private
   */
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

  /**
   * Generate template-based message as fallback
   * @private
   */
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

  /**
   * Generate cache key for message caching
   * @private
   */
  _getCacheKey(params) {
    const key = `${params.invoiceNumber}-${params.daysOverdue}-${params.escalationLevel}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Test AI service connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      if (this.provider === 'openai') {
        await this.openai.models.list();
        return true;
      } else if (this.provider === 'anthropic') {
        // Anthropic doesn't have a simple test endpoint, so we'll try a minimal request
        await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('AI service connection test failed:', error);
      return false;
    }
  }

  /**
   * Get estimated cost for a message generation
   * @returns {number} Cost in USD
   */
  getEstimatedCost() {
    const costs = {
      'gpt-4': 0.03,  // per 1K tokens (approximate)
      'gpt-3.5-turbo': 0.002,
      'claude-3-sonnet-20240229': 0.015
    };
    return costs[this.model] || 0.01;
  }
}

export default AIService;
