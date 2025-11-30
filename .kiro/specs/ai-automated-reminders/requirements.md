# Requirements Document - AI Automated Reminders

## Introduction

The AI Automated Reminders feature enables Invoice Guard to automatically generate personalized payment reminder messages using AI and send them to clients via email and SMS without manual intervention. This feature leverages AI to create contextually appropriate, polite, and professional reminder messages that escalate in tone based on payment status.

## Glossary

- **AI Agent**: An artificial intelligence service (OpenAI/Anthropic) that generates personalized reminder messages
- **Reminder System**: The automated system that checks invoices and sends reminders
- **Scheduler**: A cron-based system that runs periodic checks for overdue invoices
- **Email Service**: Third-party service (SendGrid/Resend) for sending emails
- **SMS Service**: Third-party service (Twilio) for sending text messages
- **Reminder Rule**: User-defined configuration for when and how reminders are sent
- **Client Contact**: Email address and/or phone number for invoice recipients
- **Message Template**: AI-generated message customized for specific invoice context
- **Escalation Level**: The urgency level of reminder (gentle, firm, urgent)

## Requirements

### Requirement 1: Client Contact Management

**User Story:** As a freelancer, I want to store client contact information (email and phone), so that the system can automatically send reminders to them.

#### Acceptance Criteria

1. WHEN creating or editing an invoice, THE Invoice Guard System SHALL provide fields for client email and phone number
2. WHEN a user enters a client email, THE Invoice Guard System SHALL validate the email format
3. WHEN a user enters a phone number, THE Invoice Guard System SHALL validate the phone format (Indian mobile numbers)
4. WHEN saving an invoice with contact information, THE Invoice Guard System SHALL store the contact details securely
5. WHERE a client has multiple invoices, THE Invoice Guard System SHALL allow reusing stored contact information

### Requirement 2: AI Message Generation

**User Story:** As a freelancer, I want AI to generate personalized reminder messages, so that my communications are professional and contextually appropriate.

#### Acceptance Criteria

1. WHEN generating a reminder, THE Invoice Guard System SHALL send invoice details to the AI Agent
2. WHEN the AI Agent receives invoice data, THE AI Agent SHALL generate a personalized message based on days overdue
3. WHEN an invoice is 1-3 days overdue, THE AI Agent SHALL generate a gentle reminder message
4. WHEN an invoice is 4-7 days overdue, THE AI Agent SHALL generate a firm reminder message
5. WHEN an invoice is 8+ days overdue, THE AI Agent SHALL generate an urgent reminder message
6. WHEN generating messages, THE AI Agent SHALL include invoice number, amount, due date, and payment details
7. WHEN generating messages, THE AI Agent SHALL maintain a professional and polite tone
8. WHEN generating messages, THE AI Agent SHALL personalize content using client name and invoice specifics

### Requirement 3: Automated Reminder Scheduling

**User Story:** As a freelancer, I want the system to automatically check for overdue invoices and send reminders, so that I don't have to manually track and follow up.

#### Acceptance Criteria

1. WHEN the Scheduler runs, THE Invoice Guard System SHALL check all pending invoices for overdue status
2. WHEN an overdue invoice is found, THE Invoice Guard System SHALL check if a reminder should be sent based on reminder rules
3. WHEN a reminder is due, THE Invoice Guard System SHALL generate an AI message and send it via configured channels
4. WHEN a reminder is sent, THE Invoice Guard System SHALL log the reminder with timestamp and channel
5. WHEN multiple reminders are needed, THE Invoice Guard System SHALL respect minimum interval between reminders (default 3 days)
6. WHEN the system is disabled, THE Invoice Guard System SHALL not send any automated reminders

### Requirement 4: Email Reminder Delivery

**User Story:** As a freelancer, I want reminders sent via email, so that clients receive professional payment notifications in their inbox.

#### Acceptance Criteria

1. WHEN sending an email reminder, THE Invoice Guard System SHALL use the Email Service to deliver the message
2. WHEN composing an email, THE Invoice Guard System SHALL include a professional subject line with invoice number
3. WHEN composing an email, THE Invoice Guard System SHALL format the AI-generated message as HTML
4. WHEN composing an email, THE Invoice Guard System SHALL include payment instructions and details
5. WHEN an email is sent successfully, THE Invoice Guard System SHALL log the delivery status
6. IF email delivery fails, THEN THE Invoice Guard System SHALL log the error and retry after 1 hour
7. WHEN an email is sent, THE Invoice Guard System SHALL include a footer with unsubscribe option

### Requirement 5: SMS Reminder Delivery

**User Story:** As a freelancer, I want reminders sent via SMS, so that clients receive immediate notifications on their mobile devices.

#### Acceptance Criteria

1. WHEN sending an SMS reminder, THE Invoice Guard System SHALL use the SMS Service to deliver the message
2. WHEN composing an SMS, THE Invoice Guard System SHALL keep the message under 160 characters
3. WHEN composing an SMS, THE Invoice Guard System SHALL include invoice number and amount
4. WHEN composing an SMS, THE Invoice Guard System SHALL include a payment link or UPI ID
5. WHEN an SMS is sent successfully, THE Invoice Guard System SHALL log the delivery status
6. IF SMS delivery fails, THEN THE Invoice Guard System SHALL log the error and retry after 1 hour
7. WHEN SMS credits are low, THE Invoice Guard System SHALL notify the user

### Requirement 6: Reminder Rules Configuration

**User Story:** As a freelancer, I want to configure when and how reminders are sent, so that I have control over the automation behavior.

#### Acceptance Criteria

1. WHEN accessing settings, THE Invoice Guard System SHALL provide a reminder rules configuration section
2. WHEN configuring rules, THE Invoice Guard System SHALL allow enabling/disabling automated reminders
3. WHEN configuring rules, THE Invoice Guard System SHALL allow setting reminder intervals (e.g., every 3 days)
4. WHEN configuring rules, THE Invoice Guard System SHALL allow choosing reminder channels (email, SMS, or both)
5. WHEN configuring rules, THE Invoice Guard System SHALL allow setting business hours for sending reminders
6. WHEN configuring rules, THE Invoice Guard System SHALL allow excluding weekends from reminder schedule
7. WHEN configuring rules, THE Invoice Guard System SHALL allow setting maximum number of reminders per invoice

### Requirement 7: Reminder History and Tracking

**User Story:** As a freelancer, I want to see a history of all sent reminders, so that I can track my communication with clients.

#### Acceptance Criteria

1. WHEN viewing an invoice, THE Invoice Guard System SHALL display all reminders sent for that invoice
2. WHEN displaying reminder history, THE Invoice Guard System SHALL show timestamp, channel, and delivery status
3. WHEN displaying reminder history, THE Invoice Guard System SHALL show the message content sent
4. WHEN a reminder fails, THE Invoice Guard System SHALL display the error reason
5. WHEN viewing dashboard, THE Invoice Guard System SHALL show total reminders sent today/week/month
6. WHEN exporting data, THE Invoice Guard System SHALL include reminder history in the export

### Requirement 8: AI Service Integration

**User Story:** As a system administrator, I want to configure AI service credentials, so that the system can generate messages.

#### Acceptance Criteria

1. WHEN accessing AI settings, THE Invoice Guard System SHALL provide fields for API key configuration
2. WHEN configuring AI service, THE Invoice Guard System SHALL allow choosing between OpenAI and Anthropic
3. WHEN configuring AI service, THE Invoice Guard System SHALL allow setting AI model (GPT-4, Claude, etc.)
4. WHEN configuring AI service, THE Invoice Guard System SHALL validate API credentials
5. WHEN AI service is unavailable, THE Invoice Guard System SHALL fall back to template-based messages
6. WHEN AI quota is exceeded, THE Invoice Guard System SHALL notify the user and pause automation

### Requirement 9: Email Service Integration

**User Story:** As a system administrator, I want to configure email service credentials, so that the system can send emails.

#### Acceptance Criteria

1. WHEN accessing email settings, THE Invoice Guard System SHALL provide fields for SMTP or API configuration
2. WHEN configuring email service, THE Invoice Guard System SHALL allow choosing between SendGrid, Resend, or SMTP
3. WHEN configuring email service, THE Invoice Guard System SHALL validate credentials with a test email
4. WHEN configuring email service, THE Invoice Guard System SHALL allow setting sender name and email
5. WHEN email quota is exceeded, THE Invoice Guard System SHALL notify the user and pause email reminders

### Requirement 10: SMS Service Integration

**User Story:** As a system administrator, I want to configure SMS service credentials, so that the system can send text messages.

#### Acceptance Criteria

1. WHEN accessing SMS settings, THE Invoice Guard System SHALL provide fields for Twilio configuration
2. WHEN configuring SMS service, THE Invoice Guard System SHALL validate credentials with a test SMS
3. WHEN configuring SMS service, THE Invoice Guard System SHALL display current SMS credit balance
4. WHEN configuring SMS service, THE Invoice Guard System SHALL allow setting sender ID
5. WHEN SMS credits are low (< 10), THE Invoice Guard System SHALL send a notification to the user

### Requirement 11: Manual Override and Control

**User Story:** As a freelancer, I want to manually trigger or stop automated reminders, so that I have full control over client communications.

#### Acceptance Criteria

1. WHEN viewing an invoice, THE Invoice Guard System SHALL provide a button to send immediate reminder
2. WHEN viewing an invoice, THE Invoice Guard System SHALL provide a button to pause automated reminders
3. WHEN pausing reminders, THE Invoice Guard System SHALL not send any automated reminders for that invoice
4. WHEN resuming reminders, THE Invoice Guard System SHALL continue automated reminders based on rules
5. WHEN manually sending a reminder, THE Invoice Guard System SHALL log it in reminder history

### Requirement 12: Privacy and Consent

**User Story:** As a freelancer, I want to ensure client privacy and consent, so that I comply with data protection regulations.

#### Acceptance Criteria

1. WHEN storing client contact information, THE Invoice Guard System SHALL encrypt sensitive data
2. WHEN sending reminders, THE Invoice Guard System SHALL include an opt-out mechanism
3. WHEN a client opts out, THE Invoice Guard System SHALL stop all automated reminders to that client
4. WHEN a client opts out, THE Invoice Guard System SHALL log the opt-out request
5. WHEN exporting data, THE Invoice Guard System SHALL exclude opted-out clients from reminder lists

### Requirement 13: Error Handling and Notifications

**User Story:** As a freelancer, I want to be notified of any errors in the automated system, so that I can take corrective action.

#### Acceptance Criteria

1. WHEN a reminder fails to send, THE Invoice Guard System SHALL log the error with details
2. WHEN multiple reminders fail, THE Invoice Guard System SHALL send a notification to the user
3. WHEN API services are down, THE Invoice Guard System SHALL pause automation and notify the user
4. WHEN API quota is exceeded, THE Invoice Guard System SHALL notify the user with upgrade options
5. WHEN the scheduler fails, THE Invoice Guard System SHALL log the error and attempt recovery

### Requirement 14: Cost Management and Monitoring

**User Story:** As a freelancer, I want to monitor the costs of automated reminders, so that I can manage my expenses.

#### Acceptance Criteria

1. WHEN viewing dashboard, THE Invoice Guard System SHALL display estimated monthly costs for AI, email, and SMS
2. WHEN viewing dashboard, THE Invoice Guard System SHALL display usage statistics (messages sent, API calls)
3. WHEN costs exceed a threshold, THE Invoice Guard System SHALL send a warning notification
4. WHEN configuring budget, THE Invoice Guard System SHALL allow setting monthly spending limits
5. WHEN budget limit is reached, THE Invoice Guard System SHALL pause automation and notify the user

### Requirement 15: Testing and Preview

**User Story:** As a freelancer, I want to preview AI-generated messages before enabling automation, so that I can ensure quality.

#### Acceptance Criteria

1. WHEN configuring AI settings, THE Invoice Guard System SHALL provide a "Test Message" button
2. WHEN testing message generation, THE Invoice Guard System SHALL generate a sample message using AI
3. WHEN testing message generation, THE Invoice Guard System SHALL display the generated message for review
4. WHEN testing email delivery, THE Invoice Guard System SHALL send a test email to the user's email
5. WHEN testing SMS delivery, THE Invoice Guard System SHALL send a test SMS to the user's phone
