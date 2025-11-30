/**
 * Reminder Logs Routes
 * API endpoints for reminder history and logging
 */

import express from 'express';
import { ReminderLog } from '../models/index.js';

const router = express.Router();

/**
 * POST /api/reminder-logs
 * Create a new reminder log entry
 */
router.post('/', async (req, res) => {
  try {
    const {
      invoiceId,
      channel,
      status,
      message,
      escalationLevel,
      sentAt,
      deliveredAt,
      error,
      cost
    } = req.body;

    // Validate required fields
    if (!invoiceId || !channel || !message || !escalationLevel) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['invoiceId', 'channel', 'message', 'escalationLevel']
      });
    }

    // Validate channel
    if (!['email', 'sms'].includes(channel)) {
      return res.status(400).json({
        error: 'Invalid channel',
        message: 'Channel must be either "email" or "sms"'
      });
    }

    // Validate escalation level
    if (!['gentle', 'firm', 'urgent'].includes(escalationLevel)) {
      return res.status(400).json({
        error: 'Invalid escalation level',
        message: 'Escalation level must be "gentle", "firm", or "urgent"'
      });
    }

    // Validate status if provided
    if (status && !['sent', 'failed', 'pending'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be "sent", "failed", or "pending"'
      });
    }

    // Validate cost if provided
    if (cost !== undefined && cost !== null) {
      if (typeof cost !== 'number' || cost < 0) {
        return res.status(400).json({
          error: 'Invalid cost',
          message: 'Cost must be a non-negative number'
        });
      }
    }

    // Create reminder log
    const reminderLog = await ReminderLog.create({
      invoiceId,
      channel,
      status: status || 'pending',
      message,
      escalationLevel,
      sentAt: sentAt || new Date(),
      deliveredAt,
      error,
      cost
    });

    res.status(201).json({
      success: true,
      data: reminderLog
    });
  } catch (error) {
    console.error('Error creating reminder log:', error);
    res.status(500).json({
      error: 'Failed to create reminder log',
      message: error.message
    });
  }
});

/**
 * GET /api/reminder-logs
 * Retrieve all reminder logs with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      channel,
      status,
      escalationLevel,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    // Build query
    const query = {};

    if (channel) {
      if (!['email', 'sms'].includes(channel)) {
        return res.status(400).json({
          error: 'Invalid channel filter',
          message: 'Channel must be either "email" or "sms"'
        });
      }
      query.channel = channel;
    }

    if (status) {
      if (!['sent', 'failed', 'pending'].includes(status)) {
        return res.status(400).json({
          error: 'Invalid status filter',
          message: 'Status must be "sent", "failed", or "pending"'
        });
      }
      query.status = status;
    }

    if (escalationLevel) {
      if (!['gentle', 'firm', 'urgent'].includes(escalationLevel)) {
        return res.status(400).json({
          error: 'Invalid escalation level filter',
          message: 'Escalation level must be "gentle", "firm", or "urgent"'
        });
      }
      query.escalationLevel = escalationLevel;
    }

    // Date range filter
    if (startDate || endDate) {
      query.sentAt = {};
      if (startDate) {
        query.sentAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.sentAt.$lte = new Date(endDate);
      }
    }

    // Execute query with pagination
    const logs = await ReminderLog.find(query)
      .sort({ sentAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Get total count for pagination
    const total = await ReminderLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + logs.length
      }
    });
  } catch (error) {
    console.error('Error retrieving reminder logs:', error);
    res.status(500).json({
      error: 'Failed to retrieve reminder logs',
      message: error.message
    });
  }
});

/**
 * GET /api/reminder-logs/:invoiceId
 * Retrieve reminder logs for a specific invoice
 */
router.get('/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;

    if (!invoiceId) {
      return res.status(400).json({
        error: 'Missing invoice ID',
        message: 'Invoice ID is required'
      });
    }

    // Find all logs for this invoice
    const logs = await ReminderLog.find({ invoiceId })
      .sort({ sentAt: -1 });

    // Calculate total cost for this invoice
    const totalCost = logs.reduce((sum, log) => {
      return sum + (log.cost || 0);
    }, 0);

    // Count by status
    const statusCounts = {
      sent: logs.filter(log => log.status === 'sent').length,
      failed: logs.filter(log => log.status === 'failed').length,
      pending: logs.filter(log => log.status === 'pending').length
    };

    // Count by channel
    const channelCounts = {
      email: logs.filter(log => log.channel === 'email').length,
      sms: logs.filter(log => log.channel === 'sms').length
    };

    res.json({
      success: true,
      data: logs,
      summary: {
        total: logs.length,
        totalCost,
        statusCounts,
        channelCounts
      }
    });
  } catch (error) {
    console.error('Error retrieving invoice reminder logs:', error);
    res.status(500).json({
      error: 'Failed to retrieve invoice reminder logs',
      message: error.message
    });
  }
});

export default router;
