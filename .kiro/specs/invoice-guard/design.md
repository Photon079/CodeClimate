# Design Document - Invoice Guard

## Overview

Invoice Guard is a client-side single-page application (SPA) built with vanilla JavaScript, HTML5, and Tailwind CSS. The architecture follows a modular component-based pattern with clear separation between data management, business logic, and UI rendering. All data persistence uses the browser's localStorage API, enabling a fully offline-capable application with zero backend dependencies.

The application prioritizes simplicity, performance, and mobile-first responsive design to serve Indian freelancers who need quick access to invoice status on any device.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│              User Interface Layer               │
│  (HTML Templates + Tailwind CSS + DOM Events)   │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│           Application Controller Layer          │
│     (Event Handlers + UI State Management)      │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│            Business Logic Layer                 │
│  (Invoice Calculations + Validation + Formatting)│
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│            Data Persistence Layer               │
│         (localStorage Wrapper + Schema)         │
└─────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend Framework**: Vanilla JavaScript (ES6+)
- **Styling**: Tailwind CSS (via CDN)
- **Date Handling**: Native JavaScript Date API
- **Storage**: Browser localStorage API
- **Build Tool**: None required (single HTML file deployment)
- **Property Testing**: fast-check (JavaScript property-based testing library)

### File Structure

```
invoice-guard/
├── index.html              # Main HTML file with embedded structure
├── css/
│   └── styles.css         # Custom styles (Tailwind overrides)
├── js/
│   ├── storage.js         # localStorage wrapper and data persistence
│   ├── invoice.js         # Invoice business logic and calculations
│   ├── validator.js       # Input validation functions
│   ├── formatter.js       # Currency and date formatting utilities
│   ├── reminder.js        # Reminder message generation
│   ├── ui.js              # DOM manipulation and rendering
│   └── app.js             # Application initialization and event binding
└── tests/
    ├── invoice.test.js    # Unit tests for invoice logic
    ├── validator.test.js  # Unit tests for validation
    ├── formatter.test.js  # Unit tests for formatting
    ├── reminder.test.js   # Unit tests for reminder generation
    └── properties.test.js # Property-based tests
```

## Components and Interfaces

### 1. Storage Module (`storage.js`)

Handles all localStorage interactions with error handling and data validation.

```javascript
interface StorageModule {
  // Load all invoices from localStorage
  loadInvoices(): Invoice[]
  
  // Save invoices array to localStorage
  saveInvoices(invoices: Invoice[]): boolean
  
  // Get user payment settings (UPI, bank, PayPal details)
  getPaymentSettings(): PaymentSettings
  
  // Save user payment settings
  savePaymentSettings(settings: PaymentSettings): boolean
  
  // Get late fee configuration
  getLateFeeConfig(): LateFeeConfig
  
  // Save late fee configuration
  saveLateFeeConfig(config: LateFeeConfig): boolean
  
  // Clear all data (for testing/reset)
  clearAllData(): void
}
```

### 2. Invoice Module (`invoice.js`)

Core business logic for invoice operations and calculations.

```javascript
interface InvoiceModule {
  // Create a new invoice with auto-generated fields
  createInvoice(data: InvoiceInput): Invoice
  
  // Update an existing invoice
  updateInvoice(id: string, updates: Partial<Invoice>): Invoice
  
  // Delete an invoice by ID
  deleteInvoice(id: string): boolean
  
  // Calculate invoice status and days overdue
  calculateStatus(invoice: Invoice): InvoiceStatus
  
  // Calculate late fee based on days overdue
  calculateLateFee(invoice: Invoice, config: LateFeeConfig): number
  
  // Generate next invoice number
  generateInvoiceNumber(existingInvoices: Invoice[]): string
  
  // Get all invoices with calculated status
  getInvoicesWithStatus(invoices: Invoice[]): InvoiceWithStatus[]
  
  // Calculate summary statistics
  calculateSummary(invoices: Invoice[]): SummaryStats
}
```

### 3. Validator Module (`validator.js`)

Input validation for all user-entered data.

```javascript
interface ValidatorModule {
  // Validate invoice form data
  validateInvoice(data: InvoiceInput): ValidationResult
  
  // Validate client name
  validateClientName(name: string): boolean
  
  // Validate amount (positive number)
  validateAmount(amount: number): boolean
  
  // Validate due date (not in past for new invoices)
  validateDueDate(date: string): boolean
  
  // Validate payment method
  validatePaymentMethod(method: string): boolean
}
```

### 4. Formatter Module (`formatter.js`)

Formatting utilities for display purposes.

```javascript
interface FormatterModule {
  // Format amount as Indian currency (₹XX,XXX)
  formatCurrency(amount: number): string
  
  // Format date for display (DD/MM/YYYY)
  formatDate(dateString: string): string
  
  // Format date for input fields (YYYY-MM-DD)
  formatDateForInput(dateString: string): string
  
  // Calculate and format days overdue
  formatDaysOverdue(dueDate: string): string
  
  // Format relative date (Today, Tomorrow, X days)
  formatRelativeDate(dateString: string): string
}
```

### 5. Reminder Module (`reminder.js`)

Generate customized reminder messages.

```javascript
interface ReminderModule {
  // Generate reminder message for an invoice
  generateReminder(invoice: Invoice, settings: PaymentSettings): string
  
  // Get tone based on days overdue
  getReminderTone(daysOverdue: number): ReminderTone
  
  // Format payment options section
  formatPaymentOptions(settings: PaymentSettings): string
}
```

### 6. UI Module (`ui.js`)

DOM manipulation and rendering functions.

```javascript
interface UIModule {
  // Render the complete dashboard
  renderDashboard(invoices: InvoiceWithStatus[], summary: SummaryStats): void
  
  // Render summary cards
  renderSummaryCards(summary: SummaryStats): void
  
  // Render invoice table
  renderInvoiceTable(invoices: InvoiceWithStatus[]): void
  
  // Render empty state
  renderEmptyState(): void
  
  // Show add/edit invoice modal
  showInvoiceModal(invoice?: Invoice): void
  
  // Hide invoice modal
  hideInvoiceModal(): void
  
  // Show reminder modal with generated text
  showReminderModal(reminderText: string): void
  
  // Show confirmation dialog
  showConfirmDialog(message: string): Promise<boolean>
  
  // Show toast notification
  showToast(message: string, type: 'success' | 'error' | 'info'): void
  
  // Copy text to clipboard
  copyToClipboard(text: string): Promise<boolean>
}
```

## Data Models

### Invoice Schema

```javascript
interface Invoice {
  id: string                    // UUID v4
  clientName: string            // Client/company name
  invoiceNumber: string         // Format: INV-YYYYMM-XXX
  amount: number                // Amount in INR (positive number)
  dueDate: string               // ISO 8601 date string
  paymentMethod: PaymentMethod  // Enum: 'UPI' | 'Bank Transfer' | 'PayPal' | 'Other'
  status: InvoiceStatus         // Enum: 'pending' | 'paid' | 'cancelled'
  notes: string                 // Optional notes
  createdDate: string           // ISO 8601 date string
  reminderSent: boolean         // Flag for reminder tracking
  lateFee: number               // Calculated late fee amount
}

type PaymentMethod = 'UPI' | 'Bank Transfer' | 'PayPal' | 'Other'
type InvoiceStatus = 'pending' | 'paid' | 'cancelled'

interface InvoiceInput {
  clientName: string
  amount: number
  dueDate?: string              // Optional, defaults to +14 days
  paymentMethod: PaymentMethod
  notes?: string
}

interface InvoiceWithStatus extends Invoice {
  statusBadge: StatusBadge
  daysOverdue: number
  displayAmount: string         // Formatted with ₹ symbol
  displayDueDate: string        // Formatted for display
}

interface StatusBadge {
  label: string                 // 'Not Due', 'Due Soon', 'Overdue', 'Paid'
  color: string                 // CSS color class
  icon: string                  // Emoji or icon
}
```

### Summary Statistics

```javascript
interface SummaryStats {
  totalOutstanding: number      // Sum of all unpaid invoices
  overdueAmount: number         // Sum of overdue unpaid invoices
  dueThisWeek: number          // Count of invoices due in next 7 days
  totalInvoices: number        // Total count of all invoices
  paidInvoices: number         // Count of paid invoices
}
```

### Payment Settings

```javascript
interface PaymentSettings {
  upiId: string                 // UPI ID for payments
  bankDetails: string           // Bank account details
  paypalEmail: string           // PayPal email
  userName: string              // User's name for signature
}
```

### Late Fee Configuration

```javascript
interface LateFeeConfig {
  enabled: boolean              // Whether to calculate late fees
  percentagePerWeek: number     // Default: 1.0 (1%)
}
```

### Validation Result

```javascript
interface ValidationResult {
  valid: boolean
  errors: {
    field: string
    message: string
  }[]
}
```

### Reminder Tone

```javascript
interface ReminderTone {
  greeting: string
  body: string
  closing: string
  urgency: 'low' | 'medium' | 'high'
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: UUID Uniqueness
*For any* set of invoices created, all invoice IDs should be unique UUIDs with no duplicates.
**Validates: Requirements 1.1**

### Property 2: Default Due Date
*For any* invoice created without a specified due date, the due date should be exactly 14 days from the creation date.
**Validates: Requirements 1.2**

### Property 3: Invoice Number Format and Sequencing
*For any* sequence of invoices created, each invoice number should match the format INV-YYYYMM-XXX where YYYYMM is the creation year-month and XXX increments sequentially starting from 001.
**Validates: Requirements 1.3**

### Property 4: Invalid Invoice Rejection
*For any* invoice data with missing required fields (clientName, amount, or paymentMethod), validation should fail and return appropriate error messages.
**Validates: Requirements 1.4**

### Property 5: Currency Formatting Consistency
*For any* numeric amount, the formatted currency string should contain the rupee symbol (₹) and use proper thousand separators (Indian numbering system).
**Validates: Requirements 2.2**

### Property 6: Days Overdue Calculation
*For any* unpaid invoice with a due date in the past, the calculated days overdue should equal the difference in days between the current date and the due date.
**Validates: Requirements 2.3**

### Property 7: Status Badge Assignment - Not Due
*For any* invoice with a due date more than one day in the future and status "pending", the status badge should be green with label "Not Due".
**Validates: Requirements 3.1**

### Property 8: Status Badge Assignment - Due Soon
*For any* invoice with a due date of today or tomorrow and status "pending", the status badge should be yellow with label "Due Soon".
**Validates: Requirements 3.2**

### Property 9: Status Badge Assignment - Overdue
*For any* invoice with a due date more than one day in the past and status "pending", the status badge should be red with label "Overdue".
**Validates: Requirements 3.3**

### Property 10: Status Badge Assignment - Paid
*For any* invoice with status "paid", the status badge should show a green checkmark with label "Paid".
**Validates: Requirements 3.4, 6.3**

### Property 11: Cancelled Invoice Exclusion
*For any* set of invoices containing cancelled invoices, the summary calculations (total outstanding, overdue amount) should exclude all cancelled invoices.
**Validates: Requirements 3.5**

### Property 12: Total Outstanding Calculation
*For any* set of invoices, the total outstanding amount should equal the sum of amounts for all invoices with status "pending".
**Validates: Requirements 4.1, 4.4**

### Property 13: Overdue Amount Calculation
*For any* set of invoices, the overdue amount should equal the sum of amounts for all invoices with status "pending" and due date in the past.
**Validates: Requirements 4.2**

### Property 14: Due This Week Count
*For any* set of invoices, the count of invoices due this week should equal the number of invoices with due dates between today and 7 days from today (inclusive) with status "pending".
**Validates: Requirements 4.3**

### Property 15: Reminder Message Completeness
*For any* invoice, the generated reminder message should contain the client name, invoice number, formatted amount, formatted due date, and days overdue (if applicable).
**Validates: Requirements 5.1**

### Property 16: Reminder Tone Escalation
*For any* two invoices where invoice A has more days overdue than invoice B, the reminder tone for invoice A should have equal or higher urgency than invoice B.
**Validates: Requirements 5.2**

### Property 17: Payment Method Placeholders
*For any* invoice, the generated reminder message should include placeholder sections for all three payment methods: UPI, bank transfer, and PayPal.
**Validates: Requirements 5.3**

### Property 18: Reminder Sent Flag
*For any* invoice, after generating a reminder, the invoice should have reminderSent set to true.
**Validates: Requirements 5.5**

### Property 19: Mark Paid Status Update
*For any* invoice with status "pending", marking it as paid should update the status to "paid" and exclude it from outstanding calculations.
**Validates: Requirements 6.1, 6.2**

### Property 20: Paid Invoice Data Preservation
*For any* invoice, marking it as paid should preserve all original invoice fields (id, clientName, invoiceNumber, amount, dueDate, createdDate, notes).
**Validates: Requirements 6.5**

### Property 21: Edit Validation Consistency
*For any* invalid invoice data, validation during editing should reject it with the same rules and error messages as validation during creation.
**Validates: Requirements 7.2**

### Property 22: Edit Immutability
*For any* invoice being edited, the updated invoice should preserve the original id and createdDate fields regardless of the edits made.
**Validates: Requirements 7.3**

### Property 23: Deletion Persistence
*For any* invoice in the system, after deletion, the invoice should not exist in localStorage and should not appear in any subsequent data retrieval.
**Validates: Requirements 8.2**

### Property 24: Deletion Summary Update
*For any* set of invoices, after deleting one or more invoices, the summary statistics should reflect the removal by excluding the deleted invoices from all calculations.
**Validates: Requirements 8.4**

### Property 25: Storage Round-Trip Integrity
*For any* set of invoices, saving to localStorage and then loading from localStorage should return an equivalent set of invoices with all fields preserved including date formats.
**Validates: Requirements 9.1, 9.2, 9.5**

### Property 26: Corrupted Data Handling
*For any* invalid or corrupted data in localStorage, the application should handle the error gracefully and initialize with an empty invoice array without crashing.
**Validates: Requirements 9.3**

### Property 27: Late Fee Calculation
*For any* overdue invoice, the calculated late fee should equal the invoice amount multiplied by the configured percentage per week multiplied by the number of complete weeks overdue.
**Validates: Requirements 10.1, 10.2**

### Property 28: Late Fee Display
*For any* overdue invoice, the displayed invoice information should include both the original amount and the calculated late fee amount.
**Validates: Requirements 10.3**

### Property 29: Late Fee in Reminders
*For any* overdue invoice with a non-zero late fee, the generated reminder message should include the late fee amount.
**Validates: Requirements 10.4**

### Property 30: Late Fee Configuration
*For any* configured late fee percentage, all late fee calculations should use the configured percentage rather than the default 1%.
**Validates: Requirements 10.5**

### Property 31: Status Color Coding
*For any* status indicator displayed, success states should use color #10B981, warning states should use #F59E0B, and danger states should use #EF4444.
**Validates: Requirements 12.2**

## Error Handling

### Input Validation Errors

- **Missing Required Fields**: Display field-specific error messages below each input
- **Invalid Amount**: Show error for negative, zero, or non-numeric values
- **Invalid Date**: Show error for dates in invalid format
- **Invalid Payment Method**: Restrict to predefined options via dropdown

### Storage Errors

- **localStorage Full**: Catch QuotaExceededError and notify user to clear old data
- **localStorage Unavailable**: Detect if localStorage is disabled and show warning
- **Corrupted Data**: Catch JSON parse errors and initialize with empty array
- **Data Migration**: Handle schema changes gracefully with version checking

### Runtime Errors

- **Date Calculation Errors**: Validate date strings before parsing
- **UUID Generation Failures**: Fallback to timestamp-based IDs if crypto API unavailable
- **Clipboard API Failures**: Show manual copy instructions if clipboard access denied

### User Feedback

- **Success Messages**: Green toast notifications for successful operations
- **Error Messages**: Red toast notifications with actionable error descriptions
- **Confirmation Dialogs**: Require explicit confirmation for destructive actions (delete)
- **Loading States**: Show spinners or skeleton screens during operations

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases for core functionality:

- **Validation Functions**: Test with empty strings, whitespace, special characters, boundary values
- **Date Calculations**: Test with today, past dates, future dates, edge cases (leap years, month boundaries)
- **Currency Formatting**: Test with zero, small amounts, large amounts, decimal precision
- **Invoice Number Generation**: Test sequential generation, month rollover, year rollover
- **Status Calculation**: Test boundary conditions (exactly 1 day overdue, due today)
- **Late Fee Calculation**: Test with zero days, partial weeks, multiple weeks
- **Reminder Generation**: Test with different overdue periods, missing payment settings

**Testing Framework**: Jest or Vitest for unit tests

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using the fast-check library:

- **Minimum 100 iterations** per property test to ensure thorough coverage
- Each property test will be tagged with: `**Feature: invoice-guard, Property {number}: {property_text}**`
- Tests will use smart generators that constrain inputs to valid ranges:
  - Invoice amounts: positive numbers between 1 and 10,000,000
  - Dates: valid ISO 8601 strings within reasonable ranges
  - Client names: non-empty strings with realistic length
  - Status values: enum of valid statuses only

**Property Testing Framework**: fast-check (JavaScript property-based testing library)

**Key Property Tests**:
- UUID uniqueness across large sets of generated invoices
- Round-trip serialization/deserialization preserves all data
- Summary calculations always match manual aggregation
- Status badges correctly assigned for all date/status combinations
- Reminder messages always contain required fields
- Validation consistently rejects invalid inputs
- Late fee calculations are mathematically correct for all overdue periods

### Integration Testing

- **localStorage Integration**: Test save/load cycles with real localStorage
- **DOM Rendering**: Test that UI correctly reflects data state
- **Event Handling**: Test user interactions trigger correct state changes
- **Modal Workflows**: Test complete add/edit/delete flows

### Manual Testing Checklist

- Responsive design on mobile devices (320px to 1920px)
- Touch interactions on tablets and phones
- Keyboard navigation and accessibility
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- Performance with large datasets (100+ invoices)
- Offline functionality (network disabled)

## Performance Considerations

### Optimization Strategies

1. **Lazy Rendering**: Only render visible table rows for large invoice lists
2. **Debounced Search**: Debounce search/filter inputs to reduce re-renders
3. **Memoization**: Cache calculated values (status, late fees) to avoid recalculation
4. **Efficient Storage**: Compress data before storing to localStorage if needed
5. **Virtual Scrolling**: Implement virtual scrolling for 100+ invoices

### Performance Targets

- Initial load: < 2 seconds on 3G connection
- Invoice creation: < 100ms
- Dashboard re-render: < 200ms
- Search/filter: < 150ms
- localStorage operations: < 50ms

## Security Considerations

### Data Privacy

- All data stored locally in browser (no server transmission)
- No external API calls or tracking
- No user authentication required
- Data isolated per browser/device

### Input Sanitization

- Escape HTML in user-entered text to prevent XSS
- Validate all inputs before processing
- Sanitize data before rendering to DOM
- Use textContent instead of innerHTML where possible

## Deployment

### Build Process

No build process required - single HTML file with inline or linked JavaScript.

### Hosting Options

- **Static Hosting**: Netlify, Vercel, GitHub Pages
- **CDN**: Cloudflare Pages
- **Local**: Can be run directly from file system

### Browser Requirements

- Modern browsers with ES6+ support
- localStorage API support
- Clipboard API support (optional, graceful degradation)
- Crypto API for UUID generation (fallback available)

## Future Enhancements

### Phase 2 Features (Post-MVP)

- Export to CSV/PDF
- Dark mode toggle
- Multi-currency support
- Recurring invoices
- Email integration
- Payment tracking (partial payments)
- Client management
- Invoice templates
- Analytics dashboard
- Data backup/restore

### Technical Improvements

- Service Worker for true offline support
- IndexedDB for larger datasets
- Web Components for better modularity
- TypeScript for type safety
- Build process with bundling and minification
