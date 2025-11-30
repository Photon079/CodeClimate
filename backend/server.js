/**
 * Invoice Guard Backend Server
 * Optional cloud sync and advanced features
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';

// Load environment variables
dotenv.config();

// Import security middleware
import { apiLimiter } from './middleware/rateLimiter.js';
import { sanitizeAll, preventNoSQLInjection } from './middleware/sanitizer.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet()); // Set security headers
app.use(cors()); // CORS configuration
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Apply input sanitization to all routes
app.use(sanitizeAll);
app.use(preventNoSQLInjection);

// Serve static files for public pages
app.use(express.static('../frontend'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Invoice Guard API is running',
    timestamp: new Date().toISOString()
  });
});

// Public unsubscribe page
app.get('/unsubscribe', (req, res) => {
  res.sendFile('unsubscribe.html', { root: '../frontend' });
});

// API Routes
import invoiceRoutes from './routes/invoices.js';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import reminderRoutes from './routes/reminders.js';
import contactRoutes from './routes/contacts.js';
import smsRoutes from './routes/sms.js';
import reminderConfigRoutes from './routes/reminderConfig.js';
import reminderLogsRoutes from './routes/reminderLogs.js';
import notificationRoutes from './routes/notifications.js';
import costsRoutes from './routes/costs.js';
import serviceConfigRoutes from './routes/serviceConfig.js';
import testRoutes from './routes/test.js';
import auditLogsRoutes from './routes/auditLogs.js';

app.use('/api/invoices', invoiceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/reminder-config', reminderConfigRoutes);
app.use('/api/reminder-logs', reminderLogsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/costs', costsRoutes);
app.use('/api/service-config', serviceConfigRoutes);
app.use('/api/test', testRoutes);
app.use('/api/audit-logs', auditLogsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Initialize services
const initializeServices = async () => {
  try {
    // Initialize SMS service
    const { default: smsService } = await import('./services/smsService.js');
    await smsService.initialize();
    
    // Initialize and start scheduler service
    if (process.env.ENABLE_SCHEDULER === 'true') {
      const { default: schedulerService } = await import('./services/schedulerService.js');
      const schedule = process.env.CRON_SCHEDULE || '0 */6 * * *';
      schedulerService.start(schedule);
      console.log('✅ Scheduler service started');
    }
    
    console.log('✅ Services initialized');
  } catch (error) {
    console.error('❌ Error initializing services:', error);
  }
};

// Start server
const startServer = async () => {
  await initializeServices();
  
  app.listen(PORT, () => {
    console.log(`🚀 Invoice Guard API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();

export default app;
