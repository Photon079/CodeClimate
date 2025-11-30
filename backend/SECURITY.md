# Security Implementation Guide

## Overview

This document describes the security features implemented in the Invoice Guard backend API to protect against common vulnerabilities and ensure data privacy.

## Security Features

### 1. Rate Limiting

Rate limiting protects the API from abuse, DDoS attacks, and brute force attempts.

#### Implementation

- **General API Rate Limiter**: 100 requests per 15 minutes per IP
- **Strict Rate Limiter**: 5 requests per 15 minutes (for auth endpoints)
- **Reminder Rate Limiter**: 50 reminder sends per hour
- **Test Rate Limiter**: 20 test requests per hour

#### Configuration

Rate limits can be configured via environment variables:

```bash
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100  # Maximum requests per window
```

#### Usage

Rate limiters are automatically applied to all `/api/*` routes. Specific limiters are applied to sensitive endpoints:

- `/api/reminders/send-now` - Reminder limiter
- `/api/test/*` - Test limiter
- `/api/auth/*` - Strict limiter (when implemented)

### 2. Authentication & Authorization

JWT-based authentication system for securing API endpoints.

#### Implementation

- **JWT Token Generation**: Creates signed tokens with user information
- **Token Verification**: Validates tokens on protected routes
- **Optional Authentication**: Allows endpoints to work with or without auth
- **Ownership Verification**: Ensures users can only access their own resources

#### Configuration

```bash
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d  # Token expiration time
```

#### Usage

```javascript
import { authenticateToken, optionalAuth } from './middleware/auth.js';

// Require authentication
router.get('/protected', authenticateToken, (req, res) => {
  // req.user contains decoded token data
});

// Optional authentication
router.get('/public', optionalAuth, (req, res) => {
  // req.user is null if no token provided
});
```

### 3. Audit Logging

Comprehensive logging of all security-relevant actions for compliance and forensics.

#### Implementation

- **Automatic Request Logging**: Logs all requests to sensitive endpoints
- **Security Event Logging**: Logs authentication failures, permission denials, etc.
- **Log Rotation**: Daily log files for easy management
- **Sensitive Data Redaction**: Automatically removes passwords, API keys, etc.

#### Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userId": "user123",
  "action": "SEND_REMINDER",
  "resource": "reminder",
  "resourceId": "inv-001",
  "method": "POST",
  "path": "/api/reminders/send-now",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "status": 200,
  "details": {}
}
```

#### Usage

```javascript
import { auditLogger, logSecurityEvent } from './middleware/auditLog.js';

// Audit log a route
router.post('/sensitive', auditLogger('ACTION_NAME', 'resource_type'), handler);

// Log a security event
logSecurityEvent('LOGIN_FAILURE', {
  userId: 'user123',
  ip: req.ip,
  reason: 'Invalid password'
});
```

#### Viewing Audit Logs

Access audit logs via the API:

```bash
GET /api/audit-logs?userId=user123&startDate=2024-01-01&limit=100
GET /api/audit-logs/summary
```

### 4. Input Sanitization

Protection against XSS, SQL injection, and NoSQL injection attacks.

#### Implementation

- **HTML Entity Escaping**: Prevents XSS attacks
- **Script Tag Removal**: Strips malicious scripts
- **Event Handler Removal**: Removes inline event handlers
- **NoSQL Injection Prevention**: Blocks MongoDB operators in user input
- **Email Validation**: RFC 5322 compliant email validation
- **Phone Number Validation**: Indian mobile number format validation

#### Usage

Sanitization is automatically applied to all routes via middleware:

```javascript
// Applied globally in server.js
app.use(sanitizeAll);
app.use(preventNoSQLInjection);
```

Manual sanitization for specific fields:

```javascript
import { sanitizeEmail, sanitizePhone, sanitizeInvoiceData } from './middleware/sanitizer.js';

const email = sanitizeEmail(userInput.email);
const phone = sanitizePhone(userInput.phone);
const invoice = sanitizeInvoiceData(invoiceData);
```

### 5. Security Headers

HTTP security headers via Helmet middleware.

#### Headers Set

- **X-Content-Type-Options**: nosniff
- **X-Frame-Options**: DENY
- **X-XSS-Protection**: 1; mode=block
- **Strict-Transport-Security**: max-age=31536000; includeSubDomains
- **Content-Security-Policy**: Configurable CSP rules

#### Configuration

Helmet is automatically applied in server.js:

```javascript
import helmet from 'helmet';
app.use(helmet());
```

### 6. CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured to control which domains can access the API.

#### Current Configuration

```javascript
app.use(cors()); // Currently allows all origins
```

#### Production Configuration

For production, restrict CORS to specific domains:

```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'https://yourdomain.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 7. API Key Encryption

All API keys are encrypted before storage using AES-256 encryption.

#### Implementation

Encryption is handled automatically by the ServiceConfig model:

```javascript
// Encryption happens automatically on save
const config = new ServiceConfig({
  serviceType: 'ai',
  provider: 'openai',
  apiKey: 'sk-...' // Will be encrypted
});
await config.save();

// Decryption happens automatically on retrieval
const decryptedKey = config.getDecryptedAPIKey();
```

#### Configuration

```bash
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**Important**: Keep the encryption key secure and never commit it to version control.

## Security Best Practices

### 1. Environment Variables

- Never commit `.env` files to version control
- Use strong, unique values for all secrets
- Rotate secrets regularly
- Use different secrets for development and production

### 2. API Keys

- Store all API keys encrypted in the database
- Never log API keys
- Implement key rotation policies
- Monitor API key usage

### 3. Authentication

- Use strong JWT secrets (minimum 32 characters)
- Implement token refresh mechanisms
- Set appropriate token expiration times
- Implement logout functionality

### 4. Rate Limiting

- Adjust rate limits based on your usage patterns
- Monitor rate limit violations
- Implement IP whitelisting for trusted sources
- Consider implementing user-based rate limiting

### 5. Audit Logging

- Review audit logs regularly
- Set up alerts for suspicious activity
- Implement log retention policies
- Ensure logs are backed up securely

### 6. Input Validation

- Always validate and sanitize user input
- Use parameterized queries for database operations
- Implement strict type checking
- Validate file uploads

### 7. HTTPS

- Always use HTTPS in production
- Implement HSTS headers
- Use valid SSL certificates
- Redirect HTTP to HTTPS

## Security Checklist

Before deploying to production:

- [ ] Change all default secrets and keys
- [ ] Configure CORS for specific domains
- [ ] Enable HTTPS and HSTS
- [ ] Set up rate limiting
- [ ] Configure audit logging
- [ ] Implement authentication on all sensitive endpoints
- [ ] Review and test input validation
- [ ] Set up monitoring and alerts
- [ ] Implement backup and recovery procedures
- [ ] Review and update security headers
- [ ] Test for common vulnerabilities (OWASP Top 10)
- [ ] Implement API key rotation policies
- [ ] Set up intrusion detection
- [ ] Configure firewall rules
- [ ] Implement DDoS protection

## Vulnerability Reporting

If you discover a security vulnerability, please email security@invoiceguard.com with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

Please do not publicly disclose vulnerabilities until they have been addressed.

## Security Updates

This document will be updated as new security features are implemented or vulnerabilities are discovered.

Last updated: 2024-01-15
