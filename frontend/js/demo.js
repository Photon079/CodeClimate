/**
 * Demo Data Module - Generate sample data for demonstration
 */

/**
 * Generate demo invoices
 * @returns {Array} Array of demo invoices
 */
export function generateDemoData() {
  const today = new Date();
  
  return [
    {
      id: crypto.randomUUID(),
      clientName: 'Acme Corporation',
      invoiceNumber: 'INV-202511-001',
      amount: 25000,
      dueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentMethod: 'UPI',
      status: 'pending',
      notes: 'Website redesign and development project - Phase 1',
      createdDate: new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      reminderSent: true,
      lateFee: 0
    },
    {
      id: crypto.randomUUID(),
      clientName: 'Tech Startup Inc',
      invoiceNumber: 'INV-202511-002',
      amount: 50000,
      dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      status: 'pending',
      notes: 'Mobile app development - MVP delivery',
      createdDate: new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString(),
      reminderSent: false,
      lateFee: 0
    },
    {
      id: crypto.randomUUID(),
      clientName: 'Global Solutions Ltd',
      invoiceNumber: 'INV-202511-003',
      amount: 15000,
      dueDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentMethod: 'PayPal',
      status: 'pending',
      notes: 'Brand identity design package',
      createdDate: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      reminderSent: false,
      lateFee: 0
    },
    {
      id: crypto.randomUUID(),
      clientName: 'E-commerce Ventures',
      invoiceNumber: 'INV-202510-015',
      amount: 35000,
      dueDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentMethod: 'UPI',
      status: 'paid',
      notes: 'Payment gateway integration and testing',
      createdDate: new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString(),
      reminderSent: false,
      lateFee: 0
    },
    {
      id: crypto.randomUUID(),
      clientName: 'Digital Marketing Pro',
      invoiceNumber: 'INV-202511-004',
      amount: 20000,
      dueDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      status: 'pending',
      notes: 'Social media campaign management - November',
      createdDate: new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      reminderSent: false,
      lateFee: 0
    },
    {
      id: crypto.randomUUID(),
      clientName: 'Retail Chain Co',
      invoiceNumber: 'INV-202511-005',
      amount: 45000,
      dueDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      status: 'pending',
      notes: 'POS system customization and deployment',
      createdDate: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      reminderSent: true,
      lateFee: 0
    },
    {
      id: crypto.randomUUID(),
      clientName: 'Consulting Group',
      invoiceNumber: 'INV-202510-012',
      amount: 30000,
      dueDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentMethod: 'PayPal',
      status: 'paid',
      notes: 'Business process automation consulting',
      createdDate: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      reminderSent: false,
      lateFee: 0
    },
    {
      id: crypto.randomUUID(),
      clientName: 'Fashion Boutique',
      invoiceNumber: 'INV-202511-006',
      amount: 12000,
      dueDate: new Date(today.getTime()).toISOString().split('T')[0],
      paymentMethod: 'UPI',
      status: 'pending',
      notes: 'E-commerce website maintenance - November',
      createdDate: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      reminderSent: false,
      lateFee: 0
    }
  ];
}

/**
 * Check if demo data is already loaded
 * @param {Array} invoices - Current invoices
 * @returns {boolean} True if demo data exists
 */
export function hasDemoData(invoices) {
  return invoices.some(inv => inv.clientName === 'Acme Corporation' || inv.clientName === 'Tech Startup Inc');
}
