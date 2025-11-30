/**
 * Analytics Module - Advanced analytics and insights
 */

import { formatCurrency } from './formatter.js';

/**
 * Calculate revenue trends over time
 * @param {Array} invoices - Array of invoices
 * @returns {Object} Revenue trends data
 */
export function calculateRevenueTrends(invoices) {
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  
  // Group by month
  const monthlyRevenue = {};
  paidInvoices.forEach(inv => {
    const date = new Date(inv.createdDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyRevenue[monthKey]) {
      monthlyRevenue[monthKey] = 0;
    }
    monthlyRevenue[monthKey] += inv.amount;
  });
  
  return {
    monthlyRevenue,
    totalRevenue: paidInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    averageInvoiceValue: paidInvoices.length > 0 
      ? paidInvoices.reduce((sum, inv) => sum + inv.amount, 0) / paidInvoices.length 
      : 0
  };
}

/**
 * Calculate client statistics
 * @param {Array} invoices - Array of invoices
 * @returns {Object} Client statistics
 */
export function calculateClientStats(invoices) {
  const clientData = {};
  
  invoices.forEach(inv => {
    if (!clientData[inv.clientName]) {
      clientData[inv.clientName] = {
        totalInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0
      };
    }
    
    const client = clientData[inv.clientName];
    client.totalInvoices++;
    client.totalAmount += inv.amount;
    
    if (inv.status === 'paid') {
      client.paidAmount += inv.amount;
    } else {
      client.pendingAmount += inv.amount;
      if (inv.daysOverdue > 0) {
        client.overdueAmount += inv.amount;
      }
    }
  });
  
  // Convert to array and sort by total amount
  const clientArray = Object.entries(clientData).map(([name, data]) => ({
    name,
    ...data
  })).sort((a, b) => b.totalAmount - a.totalAmount);
  
  return {
    clients: clientArray,
    topClients: clientArray.slice(0, 5),
    totalClients: clientArray.length
  };
}

/**
 * Calculate payment method statistics
 * @param {Array} invoices - Array of invoices
 * @returns {Object} Payment method stats
 */
export function calculatePaymentMethodStats(invoices) {
  const methodStats = {};
  
  invoices.forEach(inv => {
    const method = inv.paymentMethod || 'Other';
    if (!methodStats[method]) {
      methodStats[method] = {
        count: 0,
        totalAmount: 0,
        paidAmount: 0
      };
    }
    
    methodStats[method].count++;
    methodStats[method].totalAmount += inv.amount;
    
    if (inv.status === 'paid') {
      methodStats[method].paidAmount += inv.amount;
    }
  });
  
  return methodStats;
}

/**
 * Calculate collection efficiency
 * @param {Array} invoices - Array of invoices
 * @returns {Object} Collection efficiency metrics
 */
export function calculateCollectionEfficiency(invoices) {
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const overdueInvoices = invoices.filter(inv => inv.daysOverdue > 0).length;
  
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = invoices.filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);
  
  // Calculate average days to payment for paid invoices
  const paidWithDates = invoices.filter(inv => inv.status === 'paid' && inv.paidDate);
  const avgDaysToPayment = paidWithDates.length > 0
    ? paidWithDates.reduce((sum, inv) => {
        const created = new Date(inv.createdDate);
        const paid = new Date(inv.paidDate);
        const days = Math.floor((paid - created) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / paidWithDates.length
    : 0;
  
  return {
    collectionRate: totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0,
    overdueRate: totalInvoices > 0 ? (overdueInvoices / totalInvoices) * 100 : 0,
    amountCollectionRate: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
    averageDaysToPayment: Math.round(avgDaysToPayment),
    totalInvoices,
    paidInvoices,
    overdueInvoices
  };
}

/**
 * Generate insights and recommendations
 * @param {Array} invoices - Array of invoices
 * @returns {Array} Array of insight objects
 */
export function generateInsights(invoices) {
  const insights = [];
  
  // Check for overdue invoices
  const overdueInvoices = invoices.filter(inv => inv.daysOverdue > 0);
  if (overdueInvoices.length > 0) {
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    insights.push({
      type: 'warning',
      title: 'Overdue Invoices',
      message: `You have ${overdueInvoices.length} overdue invoices totaling ${formatCurrency(overdueAmount)}`,
      action: 'Send reminders to improve cash flow',
      priority: 'high'
    });
  }
  
  // Check for invoices due soon
  const dueSoon = invoices.filter(inv => {
    const daysUntilDue = Math.floor((new Date(inv.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilDue > 0 && daysUntilDue <= 3 && inv.status === 'pending';
  });
  
  if (dueSoon.length > 0) {
    insights.push({
      type: 'info',
      title: 'Invoices Due Soon',
      message: `${dueSoon.length} invoices are due within 3 days`,
      action: 'Follow up with clients proactively',
      priority: 'medium'
    });
  }
  
  // Check collection rate
  const efficiency = calculateCollectionEfficiency(invoices);
  if (efficiency.collectionRate < 70 && invoices.length > 5) {
    insights.push({
      type: 'warning',
      title: 'Low Collection Rate',
      message: `Your collection rate is ${efficiency.collectionRate.toFixed(1)}%`,
      action: 'Consider implementing automated reminders',
      priority: 'medium'
    });
  }
  
  // Check for high-value clients
  const clientStats = calculateClientStats(invoices);
  if (clientStats.topClients.length > 0) {
    const topClient = clientStats.topClients[0];
    insights.push({
      type: 'success',
      title: 'Top Client',
      message: `${topClient.name} has ${topClient.totalInvoices} invoices worth ${formatCurrency(topClient.totalAmount)}`,
      action: 'Maintain strong relationship with this client',
      priority: 'low'
    });
  }
  
  // Check average payment time
  if (efficiency.averageDaysToPayment > 30) {
    insights.push({
      type: 'info',
      title: 'Payment Delays',
      message: `Average payment time is ${efficiency.averageDaysToPayment} days`,
      action: 'Consider offering early payment discounts',
      priority: 'low'
    });
  }
  
  return insights;
}

/**
 * Calculate forecast for next month
 * @param {Array} invoices - Array of invoices
 * @returns {Object} Forecast data
 */
export function calculateForecast(invoices) {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthAfter = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  
  // Get invoices due next month
  const nextMonthInvoices = invoices.filter(inv => {
    const dueDate = new Date(inv.dueDate);
    return dueDate >= nextMonth && dueDate < monthAfter && inv.status === 'pending';
  });
  
  const expectedRevenue = nextMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  
  // Calculate based on historical collection rate
  const efficiency = calculateCollectionEfficiency(invoices);
  const projectedRevenue = expectedRevenue * (efficiency.collectionRate / 100);
  
  return {
    expectedRevenue,
    projectedRevenue,
    invoiceCount: nextMonthInvoices.length,
    collectionRate: efficiency.collectionRate
  };
}

export default {
  calculateRevenueTrends,
  calculateClientStats,
  calculatePaymentMethodStats,
  calculateCollectionEfficiency,
  generateInsights,
  calculateForecast
};
