# Design Document - AI Automated Reminders

## Overview

The AI Automated Reminders system is a sophisticated feature that combines artificial intelligence, scheduling, and multi-channel communication to automatically send payment reminders to clients. The system monitors overdue invoices, generates contextually appropriate messages using AI, and delivers them via email and SMS based on user-defined rules.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React/Vue)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Invoice    │  │   Settings   │  │   Reminder   │     │
│  │   Manager    │  │   Panel      │  │   History    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend API (Node.js/Express)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Invoice    │  │   Reminder   │  │   Config     │     │
│  │   Routes     │  │   Routes     │  │   Routes     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Scheduler  │  │   AI Service │  │   Delivery   │     │
│  │   (Cron)     │  │   Manager    │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  OpenAI  │  │ SendGrid │  │  Twilio  │
        │   API    │  │   API    │  │   API    │
        └──────────┘  └──────────┘  └──────────┘
```

### Component Breakdown

1. **Frontend Components**
   - Invoice form with contact fields
   - Reminder settings panel
   - Reminder history viewer
   - Test message preview

2. **Backend Services**
   - Scheduler service (node-cron)
   - AI service manager
   - Email delivery service
   - SMS delivery service
   - Reminder logging service

3. **External Services**
   - OpenAI/Anthropic for AI generation
   - SendGrid/Resend for email
   - Twilio for SMS

## Components and Interfaces

### 1. Client Contact Model

```javascript
interface ClientContact {
  id: string;
  invoiceId: string;
  clientName: string;
  email: string;
  phone: string;
  optedOut: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Reminder Configuration Model

```javascript
interface ReminderConfig {
  enabled: boolean;
  channels: ('email' | 'sms')[];
  intervalDays: number;
  maxReminders: number;
  businessHoursOnly: boolean;
  excludeWeekends: boolean;
  businessHours: {
    start: string; // "09:00"
    end: string;   // "18:00"
  };
  escalationLevels: {
    gentle: { minDays: number; maxDays: number };
    firm: { minDays: number; maxDays: number };
    urgent: { minDays: number };
  };
}
```

### 3. Reminder Log Model

```javascript
interface ReminderLog {
  id: string;
  invoiceId: string;
  channel: 'email' | 'sms';
  status: 'sent' | 'failed' | 'pending';
  message: string;
  escalationLevel: 'gentle' | 'firm' | 'urgent';
  sentAt: Date;
  deliveredAt?: Date;
  error?: string;
  cost?: number;
}
```

### 4. AI Service Interface

```javascript
interface AIService {
  generateReminder(params: {
    clientName: string;
    invoiceNumber: string;
    amount: number;
    dueDate: Date;
    daysOverdue: number;
    escalationLevel: 'gentle' | 'firm' | 'urgent';
    paymentDetails: {
      upiId?: string;
      bankDetails?: string;
      paypalEmail?: string;
    };
    previousReminders: number;
  }): Promise<string>;
  
  testConnection(): Promise<boolean>;
}
```

### 5. Email Service Interface

```javascript
interface EmailService {
  sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
  
  testConnection(): Promise<boolean>;
}
```

### 6. SMS Service Interface

```javascript
interface SMSService {
  sendSMS(params: {
    to: string;
    message: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
  
  getBalance(): Promise<number>;
  testConnection(): Promise<boolean>;
}
```

### 7. Scheduler Service Interface

```javascript
interface SchedulerService {
  start(): void;
  stop(): void;
  checkOverdueInvoices(): Promise<void>;
  sendReminder(invoiceId: string): Promise<void>;
}
```

## Data Models

### Database Schema

```sql
-- Client Contacts Table
CREATE TABLE client_contacts (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  opted_out BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Reminder Logs Table
CREATE TABLE reminder_logs (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36) NOT NULL,
  channel ENUM('email', 'sms') NOT NULL,
  status ENUM('sent', 'failed', 'pending') NOT NULL,
  message TEXT NOT NULL,
  escalation_level ENUM('gentle', 'firm', 'urgent') NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP NULL,
  error TEXT NULL,
  cost DECIMAL(10, 4) NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Reminder Configuration Table
CREATE TABLE reminder_config (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  channels JSON NOT NULL,
  interval_days INT DEFAULT 3,
  max_reminders INT DEFAULT 5,
  business_hours_only BOOLEAN DEFAULT TRUE,
  exclude_weekends BOOLEAN DEFAULT TRUE,
  business_hours JSON NOT NULL,
  escalation_levels JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Service Configuration Table
CREATE TABLE service_config (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  service_type ENUM('ai', 'email', 'sms') NOT NULL,
  provider VARCHAR(50) NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  config JSON NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Contact Information Validation
*For any* client contact with an email address, the email format should be valid according to RFC 5322 standards.
**Validates: Requirements 1.2**

### Property 2: Phone Number Validation
*For any* client contact with a phone number, the phone format should match Indian mobile number patterns (+91XXXXXXXXXX or 10 digits).
**Validates: Requirements 1.3**

### Property 3: AI Message Generation Consistency
*For any* invoice with the same overdue days, the AI should generate messages with consistent escalation levels (gentle: 1-3 days, firm: 4-7 days, urgent: 8+ days).
**Validates: Requirements 2.3, 2.4, 2.5**

### Property 4: Reminder Interval Enforcement
*For any* invoice with reminder history, the time between consecutive reminders should be at least the configured interval days.
**Validates: Requirements 3.5**

### Property 5: Business Hours Compliance
*For any* reminder sent when business hours are enabled, the send time should fall within the configured business hours range.
**Validates: Requirements 6.5**

### Property 6: Weekend Exclusion
*For any* reminder sent when weekend exclusion is enabled, the send date should not be Saturday or Sunday.
**Validates: Requirements 6.6**

### Property 7: Maximum Reminders Limit
*For any* invoice, the total number of reminders sent should not exceed the configured maximum reminders limit.
**Validates: Requirements 6.7**

### Property 8: Opt-Out Enforcement
*For any* client who has opted out, no automated reminders should be sent to their contact information.
**Validates: Requirements 12.3**

### Property 9: Email Delivery Logging
*For any* email reminder sent, there should be a corresponding log entry with status, timestamp, and message content.
**Validates: Requirements 4.5**

### Property 10: SMS Character Limit
*For any* SMS reminder generated, the message length should not exceed 160 characters.
**Validates: Requirements 5.2**

### Property 11: Retry Logic
*For any* failed reminder delivery, the system should retry after 1 hour with exponential backoff.
**Validates: Requirements 4.6, 5.6**

### Property 12: Cost Tracking
*For any* reminder sent, the estimated cost should be logged and accumulated for budget monitoring.
**Validates: Requirements 14.1, 14.2**

### Property 13: Budget Limit Enforcement
*For any* user with a budget limit set, the system should pause automation when the monthly spending reaches the limit.
**Validates: Requirements 14.5**

### Property 14: Encryption of Sensitive Data
*For any* API key or client contact information stored, the data should be encrypted using AES-256 encryption.
**Validates: Requirements 12.1**

### Property 15: Scheduler Reliability
*For any* scheduled check interval, the scheduler should execute within ±5 minutes of the scheduled time.
**Validates: Requirements 3.1**

## Error Handling

### Error Categories

1. **AI Service Errors**
   - API key invalid
   - Quota exceeded
   - Service unavailable
   - Rate limit exceeded

2. **Email Service Errors**
   - Invalid recipient email
   - SMTP connection failed
   - Quota exceeded
   - Bounce/rejection

3. **SMS Service Errors**
   - Invalid phone number
   - Insufficient credits
   - Service unavailable
   - Delivery failed

4. **Scheduler Errors**
   - Cron job failure
   - Database connection lost
   - Memory overflow

### Error Handling Strategy

```javascript
class ReminderErrorHandler {
  async handleError(error: Error, context: {
    invoiceId: string;
    channel: 'email' | 'sms';
    attempt: number;
  }): Promise<void> {
    // Log error
    await this.logError(error, context);
    
    // Determine if retry is appropriate
    if (this.isRetryable(error) && context.attempt < 3) {
      await this.scheduleRetry(context, error);
    } else {
      await this.notifyUser(error, context);
    }
    
    // Update reminder status
    await this.updateReminderStatus(context.invoiceId, 'failed', error.message);
  }
  
  isRetryable(error: Error): boolean {
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'RATE_LIMIT_EXCEEDED',
      'SERVICE_UNAVAILABLE'
    ];
    return retryableErrors.some(code => error.message.includes(code));
  }
}
```

## Testing Strategy

### Unit Tests

1. **Contact Validation Tests**
   - Valid email formats
   - Invalid email formats
   - Valid phone formats
   - Invalid phone formats

2. **AI Message Generation Tests**
   - Gentle reminder generation
   - Firm reminder generation
   - Urgent reminder generation
   - Message personalization

3. **Scheduler Logic Tests**
   - Overdue invoice detection
   - Reminder interval calculation
   - Business hours checking
   - Weekend exclusion

### Property-Based Tests

1. **Email Validation Property**
   - Generate random email strings
   - Verify validation logic

2. **Phone Validation Property**
   - Generate random phone numbers
   - Verify Indian format validation

3. **Reminder Interval Property**
   - Generate random reminder histories
   - Verify interval enforcement

4. **Budget Limit Property**
   - Generate random spending scenarios
   - Verify budget enforcement

### Integration Tests

1. **AI Service Integration**
   - Test OpenAI API connection
   - Test message generation
   - Test error handling

2. **Email Service Integration**
   - Test SendGrid API connection
   - Test email delivery
   - Test bounce handling

3. **SMS Service Integration**
   - Test Twilio API connection
   - Test SMS delivery
   - Test credit balance checking

4. **End-to-End Tests**
   - Create invoice with contact
   - Wait for overdue
   - Verify reminder sent
   - Check reminder log

## Security Considerations

### API Key Management

```javascript
// Encrypt API keys before storage
const encryptAPIKey = (apiKey: string): string => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

// Decrypt API keys for use
const decryptAPIKey = (encryptedKey: string): string => {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
```

### Rate Limiting

```javascript
// Implement rate limiting for API calls
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/reminders', rateLimiter);
```

### Data Privacy

- Encrypt all client contact information
- Implement opt-out mechanism
- GDPR compliance for data deletion
- Secure API key storage
- Audit logging for all reminder activities

## Performance Optimization

### Caching Strategy

```javascript
// Cache AI-generated messages for similar invoices
const messageCache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

async function getCachedMessage(cacheKey: string): Promise<string | null> {
  return messageCache.get(cacheKey);
}

async function setCachedMessage(cacheKey: string, message: string): Promise<void> {
  messageCache.set(cacheKey, message);
}
```

### Batch Processing

```javascript
// Process reminders in batches to avoid overwhelming services
async function processBatchReminders(invoices: Invoice[]): Promise<void> {
  const batchSize = 10;
  for (let i = 0; i < invoices.length; i += batchSize) {
    const batch = invoices.slice(i, i + batchSize);
    await Promise.all(batch.map(invoice => sendReminder(invoice)));
    await sleep(1000); // Rate limiting
  }
}
```

### Database Indexing

```sql
-- Index for faster overdue invoice queries
CREATE INDEX idx_invoices_due_date ON invoices(due_date, status);

-- Index for reminder history queries
CREATE INDEX idx_reminder_logs_invoice ON reminder_logs(invoice_id, sent_at);

-- Index for opt-out checks
CREATE INDEX idx_client_contacts_opted_out ON client_contacts(opted_out, email, phone);
```

## Deployment Considerations

### Environment Variables

```bash
# AI Service
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=gpt-4

# Email Service
SENDGRID_API_KEY=SG...
RESEND_API_KEY=re_...
SENDER_EMAIL=noreply@invoiceguard.com
SENDER_NAME=Invoice Guard

# SMS Service
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Encryption
ENCRYPTION_KEY=...

# Scheduler
CRON_SCHEDULE=0 */6 * * *  # Every 6 hours
```

### Monitoring and Alerts

```javascript
// Set up monitoring for critical metrics
const metrics = {
  remindersSent: new Counter('reminders_sent_total'),
  remindersFailed: new Counter('reminders_failed_total'),
  aiApiCalls: new Counter('ai_api_calls_total'),
  emailsSent: new Counter('emails_sent_total'),
  smsSent: new Counter('sms_sent_total'),
  costs: new Gauge('monthly_costs_usd')
};

// Alert when failure rate exceeds threshold
if (metrics.remindersFailed.value / metrics.remindersSent.value > 0.1) {
  await sendAlert('High reminder failure rate detected');
}
```

## Future Enhancements

1. **Multi-language Support** - Generate reminders in client's preferred language
2. **WhatsApp Integration** - Send reminders via WhatsApp Business API
3. **Voice Calls** - Automated voice reminders for high-value invoices
4. **Smart Scheduling** - ML-based optimal send time prediction
5. **A/B Testing** - Test different message styles for effectiveness
6. **Client Portal** - Allow clients to view invoices and make payments
7. **Payment Links** - Include direct payment links in reminders
8. **Analytics Dashboard** - Track reminder effectiveness and payment rates
