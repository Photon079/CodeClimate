/**
 * Invoice Routes - API endpoints for invoice management
 */

import express from 'express';
const router = express.Router();

// In-memory storage (replace with database in production)
let invoices = [];

/**
 * GET /api/invoices
 * Get all invoices
 */
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/invoices/:id
 * Get single invoice by ID
 */
router.get('/:id', (req, res) => {
  try {
    const invoice = invoices.find(inv => inv.id === req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/invoices
 * Create new invoice
 */
router.post('/', (req, res) => {
  try {
    const newInvoice = {
      id: crypto.randomUUID(),
      ...req.body,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString()
    };
    
    invoices.push(newInvoice);
    
    res.status(201).json({
      success: true,
      data: newInvoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/invoices/:id
 * Update invoice
 */
router.put('/:id', (req, res) => {
  try {
    const index = invoices.findIndex(inv => inv.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    invoices[index] = {
      ...invoices[index],
      ...req.body,
      id: req.params.id, // Preserve ID
      updatedDate: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: invoices[index]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/invoices/:id
 * Delete invoice
 */
router.delete('/:id', (req, res) => {
  try {
    const index = invoices.findIndex(inv => inv.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    invoices.splice(index, 1);
    
    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/invoices/stats/summary
 * Get invoice statistics
 */
router.get('/stats/summary', (req, res) => {
  try {
    const pending = invoices.filter(inv => inv.status === 'pending');
    const paid = invoices.filter(inv => inv.status === 'paid');
    
    const totalOutstanding = pending.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = paid.reduce((sum, inv) => sum + inv.amount, 0);
    
    const today = new Date();
    const overdue = pending.filter(inv => new Date(inv.dueDate) < today);
    const overdueAmount = overdue.reduce((sum, inv) => sum + inv.amount, 0);
    
    res.json({
      success: true,
      data: {
        totalInvoices: invoices.length,
        pendingInvoices: pending.length,
        paidInvoices: paid.length,
        totalOutstanding,
        totalPaid,
        overdueCount: overdue.length,
        overdueAmount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
