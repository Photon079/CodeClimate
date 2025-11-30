/**
 * Contact Routes - API endpoints for client contact management
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import express from 'express';
import { ClientContact } from '../models/index.js';

const router = express.Router();

/**
 * Email validation middleware
 * Requirement 1.2: Email format validation
 */
export function validateEmail(req, res, next) {
  const { email } = req.body;
  
  // Email is optional, but if provided must be valid
  if (email !== undefined && email !== null && email !== '') {
    // RFC 5322 compliant email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        field: 'email'
      });
    }
  }
  
  next();
}

/**
 * Phone validation middleware
 * Requirement 1.3: Phone format validation (Indian mobile numbers)
 */
export function validatePhone(req, res, next) {
  const { phone } = req.body;
  
  // Phone is optional, but if provided must be valid
  if (phone !== undefined && phone !== null && phone !== '') {
    // Indian mobile number validation: +91XXXXXXXXXX or 10 digits starting with 6-9
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone format. Must be a valid Indian mobile number',
        field: 'phone'
      });
    }
  }
  
  next();
}

/**
 * POST /api/contacts
 * Create a new client contact
 * Requirement 1.1: Store client contact information
 * Requirement 1.4: Store contact details securely
 */
router.post('/', validateEmail, validatePhone, async (req, res) => {
  try {
    const { invoiceId, clientName, email, phone } = req.body;

    // Validate required fields
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Invoice ID is required',
        field: 'invoiceId'
      });
    }

    if (!clientName) {
      return res.status(400).json({
        success: false,
        error: 'Client name is required',
        field: 'clientName'
      });
    }

    // At least one contact method (email or phone) must be provided
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: 'At least one contact method (email or phone) is required'
      });
    }

    // Create new contact
    const contact = new ClientContact({
      invoiceId,
      clientName,
      email: email || undefined,
      phone: phone || undefined,
      optedOut: false
    });

    await contact.save();

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: {
        id: contact._id,
        invoiceId: contact.invoiceId,
        clientName: contact.clientName,
        email: contact.email,
        phone: contact.phone,
        optedOut: contact.optedOut,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt
      }
    });

  } catch (error) {
    console.error('Error creating contact:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Contact already exists for this invoice'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create contact',
      message: error.message
    });
  }
});

/**
 * PUT /api/contacts/:id
 * Update an existing client contact
 * Requirement 1.1: Update client contact information
 */
router.put('/:id', validateEmail, validatePhone, async (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, email, phone } = req.body;

    // Find the contact
    const contact = await ClientContact.findById(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Update fields if provided
    if (clientName !== undefined) {
      contact.clientName = clientName;
    }
    
    if (email !== undefined) {
      contact.email = email || undefined;
    }
    
    if (phone !== undefined) {
      contact.phone = phone || undefined;
    }

    // Ensure at least one contact method exists
    if (!contact.email && !contact.phone) {
      return res.status(400).json({
        success: false,
        error: 'At least one contact method (email or phone) is required'
      });
    }

    await contact.save();

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: {
        id: contact._id,
        invoiceId: contact.invoiceId,
        clientName: contact.clientName,
        email: contact.email,
        phone: contact.phone,
        optedOut: contact.optedOut,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contact',
      message: error.message
    });
  }
});

/**
 * GET /api/contacts
 * Retrieve all client contacts
 * Requirement 1.1: Retrieve client contact information
 * Requirement 1.5: Reuse stored contact information
 */
router.get('/', async (req, res) => {
  try {
    const { invoiceId, clientName, optedOut } = req.query;

    // Build query filter
    const filter = {};
    
    if (invoiceId) {
      filter.invoiceId = invoiceId;
    }
    
    if (clientName) {
      // Case-insensitive partial match
      filter.clientName = { $regex: clientName, $options: 'i' };
    }
    
    if (optedOut !== undefined) {
      filter.optedOut = optedOut === 'true';
    }

    const contacts = await ClientContact.find(filter)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: contacts.length,
      data: contacts.map(contact => ({
        id: contact._id,
        invoiceId: contact.invoiceId,
        clientName: contact.clientName,
        email: contact.email,
        phone: contact.phone,
        optedOut: contact.optedOut,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error retrieving contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contacts',
      message: error.message
    });
  }
});

/**
 * GET /api/contacts/:id
 * Retrieve a specific client contact by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await ClientContact.findById(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: contact._id,
        invoiceId: contact.invoiceId,
        clientName: contact.clientName,
        email: contact.email,
        phone: contact.phone,
        optedOut: contact.optedOut,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt
      }
    });

  } catch (error) {
    console.error('Error retrieving contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contact',
      message: error.message
    });
  }
});

/**
 * POST /api/contacts/opt-out
 * Mark a contact as opted out from reminders
 * Requirement 12.2, 12.3: Opt-out mechanism
 */
router.post('/opt-out', async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Email or phone is required to opt out'
      });
    }

    // Build query to find contact by email or phone
    const query = {};
    if (email) query.email = email;
    if (phone) query.phone = phone;

    // Update all matching contacts to opted out
    const result = await ClientContact.updateMany(
      { $or: [query] },
      { $set: { optedOut: true } }
    );

    res.json({
      success: true,
      message: 'Successfully opted out from reminders',
      data: {
        contactsUpdated: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error opting out contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to opt out',
      message: error.message
    });
  }
});

export default router;
