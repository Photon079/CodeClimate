/**
 * Cost Management Routes
 * 
 * Features:
 * - Monthly cost calculation from ReminderLog
 * - Usage statistics
 * - Budget limit configuration
 * - Cost warning notifications
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

import express from 'express';
import ReminderLog from '../models/ReminderLog.js';
import ReminderConfig from '../models/ReminderConfig.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// In-memory budget storage (in production, this should be in database)
const budgetConfigs = new Map();

/**
 * GET /api/costs/monthly
 * Calculate monthly costs from ReminderLog
 * Requirements: 14.1, 14.2
 */
router.get('/monthly', async (req, res) => {
  try {
    const { year, month, userId } = req.query;

    // Default to current month if not specified
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;

    // Calculate date range for the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Aggregate costs from ReminderLog
    const costAggregation = await ReminderLog.aggregate([
      {
        $match: {
          sentAt: {
            $gte: startDate,
            $lte: endDate
          },
          status: 'sent', // Only count successfully sent reminders
          cost: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$channel',
          totalCost: { $sum: '$cost' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Format results
    const costsByChannel = {};
    let totalCost = 0;

    costAggregation.forEach(item => {
      costsByChannel[item._id] = {
        cost: parseFloat(item.totalCost.toFixed(4)),
        count: item.count
      };
      totalCost += item.totalCost;
    });

    // Get budget configuration if userId provided
    let budgetInfo = null;
    if (userId) {
      const budget = budgetConfigs.get(userId);
      if (budget) {
        const percentUsed = budget.monthlyLimit > 0 
          ? (totalCost / budget.monthlyLimit) * 100 
          : 0;
        
        budgetInfo = {
          monthlyLimit: budget.monthlyLimit,
          currentSpend: parseFloat(totalCost.toFixed(4)),
          remaining: parseFloat((budget.monthlyLimit - totalCost).toFixed(4)),
          percentUsed: parseFloat(percentUsed.toFixed(2)),
          warningThreshold: budget.warningThreshold
        };
      }
    }

    res.json({
      success: true,
      period: {
        year: targetYear,
        month: targetMonth,
        startDate,
        endDate
      },
      costs: {
        total: parseFloat(totalCost.toFixed(4)),
        byChannel: costsByChannel
      },
      budget: budgetInfo
    });
  } catch (error) {
    console.error('❌ Error calculating monthly costs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate monthly costs',
      message: error.message
    });
  }
});

/**
 * GET /api/costs/usage
 * Show usage statistics
 * Requirements: 14.2
 */
router.get('/usage', async (req, res) => {
  try {
    const { period = 'month', userId } = req.query;

    // Calculate date range based on period
    let startDate;
    const endDate = new Date();

    switch (period) {
      case 'day':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get usage statistics
    const usageStats = await ReminderLog.aggregate([
      {
        $match: {
          sentAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            channel: '$channel',
            status: '$status'
          },
          count: { $sum: 1 },
          totalCost: { $sum: { $ifNull: ['$cost', 0] } }
        }
      }
    ]);

    // Format statistics
    const stats = {
      email: { sent: 0, failed: 0, pending: 0, cost: 0 },
      sms: { sent: 0, failed: 0, pending: 0, cost: 0 }
    };

    usageStats.forEach(item => {
      const channel = item._id.channel;
      const status = item._id.status;
      
      if (stats[channel]) {
        stats[channel][status] = item.count;
        stats[channel].cost += item.totalCost;
      }
    });

    // Calculate totals
    const totals = {
      sent: stats.email.sent + stats.sms.sent,
      failed: stats.email.failed + stats.sms.failed,
      pending: stats.email.pending + stats.sms.pending,
      cost: parseFloat((stats.email.cost + stats.sms.cost).toFixed(4))
    };

    // Calculate success rate
    const totalAttempts = totals.sent + totals.failed;
    const successRate = totalAttempts > 0 
      ? parseFloat(((totals.sent / totalAttempts) * 100).toFixed(2))
      : 0;

    res.json({
      success: true,
      period: {
        type: period,
        startDate,
        endDate
      },
      usage: {
        byChannel: {
          email: {
            ...stats.email,
            cost: parseFloat(stats.email.cost.toFixed(4))
          },
          sms: {
            ...stats.sms,
            cost: parseFloat(stats.sms.cost.toFixed(4))
          }
        },
        totals,
        successRate
      }
    });
  } catch (error) {
    console.error('❌ Error fetching usage statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/costs/budget
 * Set budget limits
 * Requirements: 14.4
 */
router.post('/budget', async (req, res) => {
  try {
    const {
      userId,
      monthlyLimit,
      warningThreshold = 0.8, // Default 80%
      userEmail
    } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    if (monthlyLimit === undefined || monthlyLimit < 0) {
      return res.status(400).json({
        success: false,
        error: 'monthlyLimit must be a non-negative number'
      });
    }

    if (warningThreshold < 0 || warningThreshold > 1) {
      return res.status(400).json({
        success: false,
        error: 'warningThreshold must be between 0 and 1'
      });
    }

    // Store budget configuration
    const budgetConfig = {
      userId,
      monthlyLimit: parseFloat(monthlyLimit),
      warningThreshold: parseFloat(warningThreshold),
      userEmail,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    budgetConfigs.set(userId, budgetConfig);

    res.json({
      success: true,
      message: 'Budget configuration saved',
      budget: {
        userId: budgetConfig.userId,
        monthlyLimit: budgetConfig.monthlyLimit,
        warningThreshold: budgetConfig.warningThreshold
      }
    });
  } catch (error) {
    console.error('❌ Error setting budget:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set budget',
      message: error.message
    });
  }
});

/**
 * GET /api/costs/budget
 * Retrieve budget configuration
 * Requirements: 14.4
 */
router.get('/budget', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const budgetConfig = budgetConfigs.get(userId);

    if (!budgetConfig) {
      return res.status(404).json({
        success: false,
        error: 'Budget configuration not found'
      });
    }

    res.json({
      success: true,
      budget: {
        userId: budgetConfig.userId,
        monthlyLimit: budgetConfig.monthlyLimit,
        warningThreshold: budgetConfig.warningThreshold,
        createdAt: budgetConfig.createdAt,
        updatedAt: budgetConfig.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Error retrieving budget:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve budget',
      message: error.message
    });
  }
});

/**
 * Check if budget limit is reached and send notifications
 * This function is called by the scheduler service
 * Requirements: 14.3, 14.5
 * 
 * @param {string} userId - User ID to check
 * @returns {Promise<Object>} Result with budget status
 */
export async function checkBudgetLimit(userId) {
  try {
    const budgetConfig = budgetConfigs.get(userId);
    
    if (!budgetConfig || budgetConfig.monthlyLimit === 0) {
      return {
        withinBudget: true,
        message: 'No budget limit set'
      };
    }

    // Get current month costs
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const costResult = await ReminderLog.aggregate([
      {
        $match: {
          sentAt: {
            $gte: startDate,
            $lte: endDate
          },
          status: 'sent',
          cost: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$cost' }
        }
      }
    ]);

    const currentSpend = costResult.length > 0 ? costResult[0].totalCost : 0;
    const percentUsed = (currentSpend / budgetConfig.monthlyLimit);

    // Check if budget limit reached
    if (currentSpend >= budgetConfig.monthlyLimit) {
      // Send notification if email provided
      if (budgetConfig.userEmail) {
        await notificationService.sendNotification({
          to: budgetConfig.userEmail,
          type: 'budget_limit_reached',
          subject: 'Monthly Budget Limit Reached',
          message: `Your monthly reminder budget limit of $${budgetConfig.monthlyLimit.toFixed(2)} has been reached. Current spend: $${currentSpend.toFixed(2)}. Automated reminders have been paused.`,
          severity: 'error',
          metadata: {
            monthlyLimit: budgetConfig.monthlyLimit,
            currentSpend,
            percentUsed: percentUsed * 100
          }
        });
      }

      return {
        withinBudget: false,
        limitReached: true,
        currentSpend,
        monthlyLimit: budgetConfig.monthlyLimit,
        percentUsed: percentUsed * 100,
        message: 'Budget limit reached'
      };
    }

    // Check if warning threshold reached
    if (percentUsed >= budgetConfig.warningThreshold) {
      // Send warning notification if email provided
      if (budgetConfig.userEmail) {
        await notificationService.sendNotification({
          to: budgetConfig.userEmail,
          type: 'budget_warning',
          subject: 'Budget Warning - Approaching Limit',
          message: `You have used ${(percentUsed * 100).toFixed(1)}% of your monthly reminder budget. Current spend: $${currentSpend.toFixed(2)} of $${budgetConfig.monthlyLimit.toFixed(2)}.`,
          severity: 'warning',
          metadata: {
            monthlyLimit: budgetConfig.monthlyLimit,
            currentSpend,
            percentUsed: percentUsed * 100,
            warningThreshold: budgetConfig.warningThreshold * 100
          }
        });
      }

      return {
        withinBudget: true,
        warningTriggered: true,
        currentSpend,
        monthlyLimit: budgetConfig.monthlyLimit,
        percentUsed: percentUsed * 100,
        message: 'Budget warning threshold reached'
      };
    }

    return {
      withinBudget: true,
      currentSpend,
      monthlyLimit: budgetConfig.monthlyLimit,
      percentUsed: percentUsed * 100,
      message: 'Within budget'
    };
  } catch (error) {
    console.error('❌ Error checking budget limit:', error);
    return {
      withinBudget: true, // Allow reminders to continue on error
      error: error.message
    };
  }
}

export default router;
