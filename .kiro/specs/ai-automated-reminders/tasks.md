# Implementation Plan - AI Automated Reminders

## Task List

- [x] 1. Database Schema and Models Setup
  - Create database migrations for new tables
  - Implement ClientContact model
  - Implement ReminderLog model
  - Implement ReminderConfig model
  - Implement ServiceConfig model
  - _Requirements: 1.1, 1.4_

- [x] 1.1 Write property tests for data models
  - **Property 1: Contact Information Validation**
  - **Validates: Requirements 1.2**

- [x] 1.2 Write property tests for phone validation
  - **Property 2: Phone Number Validation**
  - **Validates: Requirements 1.3**

- [x] 2. Backend API - Contact Management
  - Create POST /api/contacts endpoint for adding client contacts
  - Create PUT /api/contacts/:id endpoint for updating contacts
  - Create GET /api/contacts endpoint for retrieving contacts
  - Create GET /api/contacts/:id endpoint for retrieving specific contact
  - Create POST /api/contacts/opt-out endpoint for opt-out mechanism
  - Implement email validation middleware
  - Implement phone validation middleware
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.2, 12.3_

- [x] 2.1 Write unit tests for contact endpoints
  - Test contact creation
  - Test contact updates
  - Test validation errors
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. AI Service Integration (Basic Implementation)
  - Create AIService class with OpenAI integration
  - Implement generateReminder method
  - Implement message personalization logic
  - Implement escalation level determination
  - Add fallback to template-based messages
  - Implement API key encryption/decryption
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 3.1 Write property tests for AI message generation
  - **Property 3: AI Message Generation Consistency**
  - **Validates: Requirements 2.3, 2.4, 2.5**

- [x] 3.2 Install AI service dependencies









  - Install openai npm package
  - Install @anthropic-ai/sdk npm package
  - Update .env.example with AI service configuration
  - _Requirements: 2.1, 8.1, 8.2, 8.3_

- [x] 3.3 Write unit tests for AI service







  - Test message generation for different escalation levels
  - Test personalization with different invoice data
  - Test fallback to templates
  - Test API error handling
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Email Service Integration (Basic Implementation)
  - Create EmailService class with SendGrid integration
  - Implement sendEmail method
  - Implement HTML email template
  - Add unsubscribe footer to emails
  - Support for SendGrid, Resend, and SMTP providers
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 9.1, 9.2, 9.3, 9.4_

- [x] 4.1 Install email service dependencies





  - Install @sendgrid/mail npm package
  - Install resend npm package
  - Install nodemailer npm package
  - Update .env.example with email service configuration
  - _Requirements: 4.1, 9.1, 9.2, 9.3_

- [x] 4.2 Implement email retry logic





  - Add retry logic with exponential backoff
  - Implement delivery status tracking
  - _Requirements: 4.6, 13.1, 13.2_

- [x] 4.3 Write property tests for email delivery





  - **Property 9: Email Delivery Logging**
  - **Validates: Requirements 4.5**

- [x] 4.4 Write unit tests for email service




  - Test email sending
  - Test retry logic
  - Test error handling
  - Test unsubscribe mechanism
  - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7_

- [x] 5. SMS Service Integration






  - Create backend/services/smsService.js with SMSService class
  - Implement Twilio integration
  - Implement sendSMS method with retry logic
  - Implement message truncation to 160 characters
  - Implement credit balance checking
  - Implement low credit notifications
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 5.1 Install SMS service dependencies


  - Install twilio npm package in backend
  - Update backend/.env.example with SMS service configuration
  - _Requirements: 5.1, 10.1, 10.2_

- [x] 5.2 Write property tests for SMS delivery



  - **Property 10: SMS Character Limit**
  - **Validates: Requirements 5.2**

- [x] 5.3 Write unit tests for SMS service



  - Test SMS sending
  - Test message truncation
  - Test retry logic
  - Test credit balance checking
  - _Requirements: 5.1, 5.2, 5.3, 5.6, 5.7_

- [x] 6. Scheduler Service Implementation



  - Install node-cron package in backend
  - Create backend/services/schedulerService.js with SchedulerService class
  - Implement checkOverdueInvoices method to scan for overdue invoices
  - Implement sendReminder method to generate and send reminders
  - Implement business hours checking logic
  - Implement weekend exclusion logic
  - Implement reminder interval enforcement (check last reminder time)
  - Integrate with pause/resume functionality from reminders routes
  - Integrate with opt-out checking from ClientContact model
  - Integrate with AIService for message generation
  - Integrate with EmailService and SMSService for delivery
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.5, 6.6, 11.3, 12.3_

- [x] 6.1 Write property tests for scheduler logic





  - **Property 4: Reminder Interval Enforcement**
  - **Validates: Requirements 3.5**
  - **Property 5: Business Hours Compliance**
  - **Validates: Requirements 6.5**
  - **Property 6: Weekend Exclusion**
  - **Validates: Requirements 6.6**

- [ ]* 6.2 Write unit tests for scheduler service
  - Test overdue invoice detection
  - Test reminder interval calculation
  - Test business hours checking
  - Test weekend exclusion
  - _Requirements: 3.1, 3.2, 3.5, 6.5, 6.6_

- [x] 7. Reminder Configuration API



  - Create backend/routes/reminderConfig.js
  - Create POST /api/reminder-config endpoint for creating configuration
  - Create GET /api/reminder-config endpoint for retrieving configuration
  - Create PUT /api/reminder-config endpoint for updating configuration
  - Implement configuration validation middleware
  - Implement default configuration setup for new users
  - Register routes in backend/server.js
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ]* 7.1 Write unit tests for configuration endpoints
  - Test configuration creation
  - Test configuration updates
  - Test validation
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Reminder History and Logging API





  - Create backend/routes/reminderLogs.js
  - Create POST /api/reminder-logs endpoint for creating log entries
  - Create GET /api/reminder-logs endpoint for retrieving all logs with filters
  - Create GET /api/reminder-logs/:invoiceId endpoint for invoice-specific logs
  - Implement cost tracking in log entries
  - Register routes in backend/server.js
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 14.1, 14.2_

- [x] 8.1 Write property tests for cost tracking



  - **Property 12: Cost Tracking**
  - **Validates: Requirements 14.1, 14.2**

- [ ]* 8.2 Write unit tests for reminder logging
  - Test log creation
  - Test log retrieval
  - Test cost calculation
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 9. Manual Override Controls (Basic Implementation)
  - Create POST /api/reminders/send-now endpoint
  - Create POST /api/reminders/pause endpoint
  - Create POST /api/reminders/resume endpoint
  - Create GET /api/reminders/status/:invoiceId endpoint
  - Implement manual trigger logic
  - Implement pause/resume logic
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 9.1 Integrate manual controls with actual services





  - Update send-now endpoint to integrate with AIService for message generation
  - Update send-now endpoint to integrate with EmailService/SMSService for delivery
  - Implement proper error handling and retry logic
  - Update ReminderLog with actual delivery status
  - _Requirements: 11.1, 11.5_

- [ ]* 9.2 Write unit tests for manual controls
  - Test manual send with AI and delivery integration
  - Test pause functionality
  - Test resume functionality
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 10. Privacy and Opt-Out System Integration





  - Implement opt-out checking in scheduler service (check ClientContact.optedOut before sending)
  - Update EmailService to include unsubscribe link in email footer (replace {{unsubscribe_url}} placeholder)
  - Create public opt-out page/endpoint for clients to unsubscribe
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 10.1 Write property tests for opt-out enforcement
  - **Property 8: Opt-Out Enforcement**
  - **Validates: Requirements 12.3**
  - **Property 14: Encryption of Sensitive Data**
  - **Validates: Requirements 12.1**

- [ ]* 10.2 Write unit tests for privacy features
  - Test opt-out mechanism
  - Test data encryption
  - Test opt-out checking
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 11. Error Handling and Notifications





  - Create backend/services/notificationService.js for user notifications
  - Create backend/routes/notifications.js
  - Create POST /api/notifications endpoint for sending notifications to users
  - Implement error notification logic in scheduler when multiple reminders fail
  - Implement API quota exceeded notifications
  - Implement low SMS credit notifications
  - Register routes in backend/server.js
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 11.1 Write property tests for retry logic


  - **Property 11: Retry Logic**
  - **Validates: Requirements 4.6, 5.6**

- [ ]* 11.2 Write unit tests for error handling
  - Test retry logic
  - Test error notifications
  - _Requirements: 13.1, 13.2, 13.3, 13.5_

- [x] 12. Cost Management and Budget Monitoring











  - Create backend/routes/costs.js
  - Create GET /api/costs/monthly endpoint to calculate monthly costs from ReminderLog
  - Create GET /api/costs/usage endpoint to show usage statistics
  - Create POST /api/costs/budget endpoint to set budget limits
  - Create GET /api/costs/budget endpoint to retrieve budget configuration
  - Implement cost calculation logic (aggregate from ReminderLog.cost)
  - Implement budget limit enforcement in scheduler
  - Implement cost warning notifications when threshold reached
  - Register routes in backend/server.js
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ]* 12.1 Write property tests for budget enforcement
  - **Property 13: Budget Limit Enforcement**
  - **Validates: Requirements 14.5**

- [ ]* 12.2 Write unit tests for cost management
  - Test cost calculation
  - Test budget enforcement
  - Test warning notifications
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 13. Service Configuration API












  - Create backend/routes/serviceConfig.js
  - Create POST /api/service-config endpoint for creating service configurations
  - Create GET /api/service-config endpoint for retrieving configurations
  - Create PUT /api/service-config/:id endpoint for updating configurations
  - Create POST /api/service-config/test endpoint for testing connections
  - Implement configuration validation middleware
  - Use ServiceConfig.encryptAPIKey() for encrypting API keys before storage
  - Integrate with AIService.testConnection(), EmailService.testConnection(), SMSService.testConnection()
  - Register routes in backend/server.js
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 13.1 Write unit tests for service configuration
  - Test configuration creation
  - Test configuration updates
  - Test API key encryption
  - Test connection testing
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 10.1, 10.2_

- [x] 14. Testing and Preview Features





  - Create backend/routes/test.js
  - Create POST /api/test/ai-message endpoint to generate sample AI messages
  - Create POST /api/test/email endpoint to send test emails
  - Create POST /api/test/sms endpoint to send test SMS
  - Integrate with AIService.generateReminder() for message preview
  - Integrate with EmailService.sendEmail() for test emails
  - Integrate with SMSService.sendSMS() for test SMS
  - Register routes in backend/server.js
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 14.1 Write unit tests for testing features
  - Test message preview
  - Test email testing
  - Test SMS testing
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 15. Frontend - Invoice Form Updates





  - Update frontend/index.html to add email input field to invoice form
  - Update frontend/index.html to add phone input field to invoice form
  - Update frontend/js/validator.js to add client-side email validation
  - Update frontend/js/validator.js to add client-side phone validation (Indian format)
  - Update frontend/js/invoice.js to save email and phone with invoice data
  - Implement contact autocomplete from previous invoices using stored contacts
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 16. Frontend - Reminder Settings Panel





  - Create reminder settings component
  - Add enable/disable toggle
  - Add channel selection (email, SMS, both)
  - Add interval configuration
  - Add business hours configuration
  - Add weekend exclusion toggle
  - Add max reminders configuration
  - Implement settings save functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 17. Frontend - Service Configuration Panel





  - Create AI service configuration component
  - Create email service configuration component
  - Create SMS service configuration component
  - Add API key input fields
  - Add provider selection dropdowns
  - Add test connection buttons
  - Implement configuration save functionality
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_

- [x] 18. Frontend - Reminder History Viewer





  - Create reminder history component
  - Display reminder logs in table format
  - Add filters for channel and status
  - Add date range selector
  - Display message content in modal
  - Show delivery status and errors
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 19. Frontend - Manual Control Buttons





  - Add "Send Reminder Now" button to invoice actions
  - Add "Pause Reminders" button to invoice actions
  - Add "Resume Reminders" button to invoice actions
  - Implement button click handlers
  - Add confirmation dialogs
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 20. Frontend - Cost Dashboard





  - Create cost monitoring component
  - Display monthly costs breakdown
  - Display usage statistics
  - Add budget configuration
  - Show cost warnings
  - Display service credit balances
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 10.5_

- [x] 21. Frontend - Test and Preview Features





  - Create test message preview modal
  - Add "Test AI Message" button
  - Add "Send Test Email" button
  - Add "Send Test SMS" button
  - Display generated messages
  - Show test results
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 22. Security Implementation






  - Implement API key encryption (COMPLETED in ServiceConfig model)
  - Add rate limiting middleware
  - Implement CORS configuration (COMPLETED in server.js)
  - Add authentication middleware
  - Implement audit logging
  - Add input sanitization
  - _Requirements: 12.1_

- [ ] 23. Performance Optimization
  - Implement message caching (COMPLETED in AIService)
  - Add batch processing for reminders
  - Create database indexes (COMPLETED in models)
  - Implement connection pooling
  - Add request throttling
  - _Requirements: 3.1, 3.2_

- [ ] 24. Monitoring and Alerts Setup
  - Set up Prometheus metrics
  - Create monitoring dashboard
  - Implement alert rules
  - Add health check endpoints (COMPLETED in server.js)
  - Set up error tracking (Sentry)
  - _Requirements: 13.2, 13.3, 13.4_

- [ ]* 25. Documentation
  - Write API documentation
  - Create user guide for reminder setup
  - Document service configuration steps
  - Create troubleshooting guide
  - Write deployment guide
  - _Requirements: All_

- [ ]* 26. Integration Testing
  - Test end-to-end reminder flow
  - Test AI service integration
  - Test email service integration
  - Test SMS service integration
  - Test scheduler execution
  - Test error scenarios
  - _Requirements: All_

- [ ]* 27. Deployment Configuration
  - Set up environment variables
  - Configure cron job on server
  - Set up monitoring
  - Configure backup strategy
  - Set up CI/CD pipeline
  - _Requirements: All_

- [ ] 28. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
