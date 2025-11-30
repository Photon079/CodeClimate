/**
 * Audit Logging Middleware
 * Logs all important actions for security and compliance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log entry structure
 */
class AuditLogEntry {
  constructor(data) {
    this.timestamp = new Date().toISOString();
    this.userId = data.userId || 'anonymous';
    this.action = data.action;
    this.resource = data.resource;
    this.resourceId = data.resourceId;
    this.method = data.method;
    this.path = data.path;
    this.ip = data.ip;
    this.userAgent = data.userAgent;
    this.status = data.status;
    this.details = data.details || {};
  }
}

/**
 * Write audit log to file
 */
const writeAuditLog = (entry) => {
  const logFile = path.join(logsDir, `audit-${new Date().toISOString().split('T')[0]}.log`);
  const logLine = JSON.stringify(entry) + '\n';
  
  fs.appendFile(logFile, logLine, (err) => {
    if (err) {
      console.error('Failed to write audit log:', err);
    }
  });
};

/**
 * Audit logging middleware
 * Logs all requests to sensitive endpoints
 */
export const auditLogger = (action, resource) => {
  return (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send function to capture response
    res.send = function(data) {
      // Create audit log entry
      const entry = new AuditLogEntry({
        userId: req.user?.userId,
        action,
        resource,
        resourceId: req.params.id || req.params.invoiceId || req.body.id,
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        status: res.statusCode,
        details: {
          query: req.query,
          body: sanitizeBody(req.body)
        }
      });
      
      // Write to log file
      writeAuditLog(entry);
      
      // Call original send
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Sanitize request body to remove sensitive data
 */
const sanitizeBody = (body) => {
  if (!body) return {};
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'apiKey', 'api_key', 'token', 'secret'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

/**
 * Log specific security events
 */
export const logSecurityEvent = (eventType, details) => {
  const entry = new AuditLogEntry({
    userId: details.userId || 'system',
    action: 'SECURITY_EVENT',
    resource: eventType,
    resourceId: details.resourceId,
    method: 'SYSTEM',
    path: details.path || 'N/A',
    ip: details.ip || 'N/A',
    userAgent: details.userAgent || 'N/A',
    status: details.status || 'INFO',
    details: details
  });
  
  writeAuditLog(entry);
};

/**
 * Get audit logs for a specific user or resource
 */
export const getAuditLogs = async (filters = {}) => {
  const { userId, resource, startDate, endDate } = filters;
  const logs = [];
  
  try {
    // Read log files
    const files = fs.readdirSync(logsDir);
    const logFiles = files.filter(f => f.startsWith('audit-') && f.endsWith('.log'));
    
    for (const file of logFiles) {
      const filePath = path.join(logsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          
          // Apply filters
          if (userId && entry.userId !== userId) continue;
          if (resource && entry.resource !== resource) continue;
          if (startDate && new Date(entry.timestamp) < new Date(startDate)) continue;
          if (endDate && new Date(entry.timestamp) > new Date(endDate)) continue;
          
          logs.push(entry);
        } catch (err) {
          // Skip invalid JSON lines
        }
      }
    }
    
    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return logs;
  } catch (error) {
    console.error('Error reading audit logs:', error);
    return [];
  }
};

export default {
  auditLogger,
  logSecurityEvent,
  getAuditLogs
};
