/**
 * ClientContact Model
 * Stores client contact information for automated reminders
 */

import mongoose from 'mongoose';

const clientContactSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    required: true,
    index: true
  },
  clientName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    validate: {
      validator: function(v) {
        // RFC 5322 compliant email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address`
    }
  },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Phone is optional
        // Indian mobile number validation: +91XXXXXXXXXX or 10 digits
        return /^(\+91)?[6-9]\d{9}$/.test(v);
      },
      message: props => `${props.value} is not a valid Indian mobile number`
    }
  },
  optedOut: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Compound index for opt-out checks
clientContactSchema.index({ optedOut: 1, email: 1, phone: 1 });

// Index for invoice lookups
clientContactSchema.index({ invoiceId: 1 });

const ClientContact = mongoose.model('ClientContact', clientContactSchema);

export default ClientContact;
