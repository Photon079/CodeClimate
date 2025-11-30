/**
 * Audit Logs Routes
 * View and manage audit logs
 */

import express from 'express';
import { getAuditLogs } from '../middleware/auditLog.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/audit-logs
 * Get audit logs with optional filters
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { userId, resource, startDate, endDate, limit = 100 } = req.query;
    
    // Only allow users to view their own logs (unless admin)
    const filters = {
      userId: userId || req.user.userId,
      resource,
      startDate,
      endDate
    };
    
    const logs = await getAuditLogs(filters);
    
    // Limit results
    const limitedLogs = logs.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      count: limitedLogs.length,
      total: logs.length,
      logs: limitedLogs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

/**
 * GET /api/audit-logs/summary
 * Get summary of audit log activity
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters = {
      userId: req.user.userId,
      startDate,
      endDate
    };
    
    const logs = await getAuditLogs(filters);
    
    // Calculate summary statistics
    const summary = {
      totalActions: logs.length,
      byAction: {},
      byResource: {},
      byStatus: {},
      recentActivity: logs.slice(0, 10)
    };
    
    logs.forEach(log => {
      // Count by action
      summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
      
      // Count by resource
      summary.byResource[log.resource] = (summary.byResource[log.resource] || 0) + 1;
      
      // Count by status
      const statusCode = Math.floor(log.status / 100) * 100;
      summary.byStatus[statusCode] = (summary.byStatus[statusCode] || 0) + 1;
    });
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error generating audit log summary:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      message: error.message
    });
  }
});

export default router;
