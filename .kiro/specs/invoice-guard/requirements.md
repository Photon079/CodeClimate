# Requirements Document

## Introduction

Invoice Guard is a single-page web application designed for Indian freelancers to track invoice payments and manage client reminders. The system provides a minimalist, offline-first solution for monitoring outstanding payments, calculating overdue amounts, and generating polite reminder messages for clients. The application operates entirely in the browser using localStorage, requiring no backend infrastructure or user authentication.

## Glossary

- **Invoice Guard System**: The complete web application for tracking invoices
- **Invoice**: A payment request record containing client details, amount, due date, and payment status
- **Outstanding Amount**: The total value of all unpaid invoices
- **Overdue Invoice**: An invoice with a due date that has passed and remains unpaid
- **Reminder Message**: A pre-formatted text message for requesting payment from clients
- **Payment Method**: The mechanism through which payment is expected (UPI, Bank Transfer, PayPal, Other)
- **Status Badge**: A visual indicator showing the current state of an invoice
- **Late Fee**: An optional penalty charge calculated based on days overdue
- **Dashboard**: The main interface displaying all invoices and summary statistics

## Requirements

### Requirement 1

**User Story:** As a freelancer, I want to add new invoices to the system, so that I can track all payments owed to me.

#### Acceptance Criteria

1. WHEN a user submits a new invoice form with valid data, THE Invoice Guard System SHALL create a new invoice record with a unique UUID identifier
2. WHEN a user creates an invoice without specifying a due date, THE Invoice Guard System SHALL set the due date to 14 days from the creation date
3. WHEN a user creates an invoice, THE Invoice Guard System SHALL auto-generate an invoice number in the format INV-YYYYMM-XXX where XXX increments sequentially
4. WHEN a user attempts to submit an invoice with missing required fields, THE Invoice Guard System SHALL prevent submission and display validation errors
5. WHEN a user attempts to submit an invoice with a negative or zero amount, THE Invoice Guard System SHALL reject the submission and display an error message

### Requirement 2

**User Story:** As a freelancer, I want to view all my invoices in a dashboard, so that I can see the complete status of my payments at a glance.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE Invoice Guard System SHALL display all stored invoices in a table format with columns for client name, amount, due date, status, days overdue, and actions
2. WHEN displaying invoice amounts, THE Invoice Guard System SHALL format all currency values with the rupee symbol (₹) and proper thousand separators
3. WHEN calculating days overdue, THE Invoice Guard System SHALL compute the difference between the current date and the due date for unpaid invoices
4. WHEN the dashboard contains no invoices, THE Invoice Guard System SHALL display an empty state message prompting the user to add their first invoice
5. WHEN the dashboard is viewed on mobile devices, THE Invoice Guard System SHALL adapt the layout to remain readable and functional on small screens

### Requirement 3

**User Story:** As a freelancer, I want to see visual status indicators for my invoices, so that I can quickly identify which payments need attention.

#### Acceptance Criteria

1. WHEN an invoice has a due date more than one day in the future, THE Invoice Guard System SHALL display a green status badge indicating "Not Due"
2. WHEN an invoice is due today or tomorrow, THE Invoice Guard System SHALL display a yellow status badge indicating "Due Soon"
3. WHEN an invoice is more than one day overdue, THE Invoice Guard System SHALL display a red status badge indicating "Overdue"
4. WHEN an invoice is marked as paid, THE Invoice Guard System SHALL display a green checkmark status badge indicating "Paid"
5. WHEN an invoice is cancelled, THE Invoice Guard System SHALL display an appropriate status badge and exclude it from outstanding calculations

### Requirement 4

**User Story:** As a freelancer, I want to see summary statistics at the top of my dashboard, so that I can understand my financial situation at a glance.

#### Acceptance Criteria

1. WHEN the dashboard displays summary cards, THE Invoice Guard System SHALL calculate and show the total outstanding amount as the sum of all unpaid invoice amounts
2. WHEN the dashboard displays summary cards, THE Invoice Guard System SHALL calculate and show the overdue amount as the sum of all overdue unpaid invoice amounts
3. WHEN the dashboard displays summary cards, THE Invoice Guard System SHALL count and display the number of invoices due within the next 7 days
4. WHEN summary calculations are performed, THE Invoice Guard System SHALL exclude paid and cancelled invoices from outstanding and overdue totals
5. WHEN invoice data changes, THE Invoice Guard System SHALL update all summary statistics immediately

### Requirement 5

**User Story:** As a freelancer, I want to generate reminder messages for overdue invoices, so that I can easily send polite payment requests to clients.

#### Acceptance Criteria

1. WHEN a user clicks the reminder button for an invoice, THE Invoice Guard System SHALL generate a pre-formatted message containing the client name, invoice number, amount, due date, and days overdue
2. WHEN generating a reminder message, THE Invoice Guard System SHALL customize the tone based on the number of days overdue with escalating politeness levels
3. WHEN a reminder message is generated, THE Invoice Guard System SHALL include placeholder sections for UPI, bank transfer, and PayPal payment details
4. WHEN a reminder message is displayed, THE Invoice Guard System SHALL provide a one-click copy-to-clipboard function for the entire message
5. WHEN a reminder is sent, THE Invoice Guard System SHALL mark the invoice with a reminderSent flag and update the timestamp

### Requirement 6

**User Story:** As a freelancer, I want to mark invoices as paid, so that I can track which payments have been received.

#### Acceptance Criteria

1. WHEN a user clicks the "Mark Paid" button for an invoice, THE Invoice Guard System SHALL update the invoice status to "paid" immediately
2. WHEN an invoice is marked as paid, THE Invoice Guard System SHALL remove it from the outstanding amount calculation
3. WHEN an invoice is marked as paid, THE Invoice Guard System SHALL update the status badge to show a green checkmark
4. WHEN an invoice is marked as paid, THE Invoice Guard System SHALL persist the status change to localStorage immediately
5. WHEN a paid invoice is displayed, THE Invoice Guard System SHALL still show all original invoice details for record-keeping

### Requirement 7

**User Story:** As a freelancer, I want to edit existing invoices, so that I can correct mistakes or update information.

#### Acceptance Criteria

1. WHEN a user clicks the edit button for an invoice, THE Invoice Guard System SHALL open a modal pre-filled with the current invoice data
2. WHEN a user submits edited invoice data, THE Invoice Guard System SHALL validate all fields using the same rules as new invoice creation
3. WHEN a user saves edited invoice data, THE Invoice Guard System SHALL update the invoice record while preserving the original creation date and ID
4. WHEN a user cancels editing, THE Invoice Guard System SHALL discard all changes and close the modal without modifying the invoice
5. WHEN an invoice is updated, THE Invoice Guard System SHALL recalculate all affected summary statistics and status indicators

### Requirement 8

**User Story:** As a freelancer, I want to delete invoices, so that I can remove cancelled projects or test data.

#### Acceptance Criteria

1. WHEN a user clicks the delete button for an invoice, THE Invoice Guard System SHALL prompt for confirmation before deletion
2. WHEN a user confirms deletion, THE Invoice Guard System SHALL remove the invoice from localStorage permanently
3. WHEN an invoice is deleted, THE Invoice Guard System SHALL update the dashboard to remove the invoice from the table immediately
4. WHEN an invoice is deleted, THE Invoice Guard System SHALL recalculate all summary statistics to reflect the removal
5. WHEN the last invoice is deleted, THE Invoice Guard System SHALL display the empty state message

### Requirement 9

**User Story:** As a freelancer, I want my invoice data to persist across browser sessions, so that I don't lose my tracking information.

#### Acceptance Criteria

1. WHEN a user creates, updates, or deletes an invoice, THE Invoice Guard System SHALL save the complete invoice array to localStorage immediately
2. WHEN the application loads, THE Invoice Guard System SHALL retrieve all invoice data from localStorage and populate the dashboard
3. WHEN localStorage contains invalid or corrupted data, THE Invoice Guard System SHALL handle the error gracefully and initialize with an empty invoice array
4. WHEN the application runs, THE Invoice Guard System SHALL function completely offline without requiring network connectivity
5. WHEN invoice data is serialized to localStorage, THE Invoice Guard System SHALL preserve all date fields as ISO 8601 strings for consistent parsing

### Requirement 10

**User Story:** As a freelancer, I want to calculate late fees for overdue invoices, so that I can include penalty charges in my reminders.

#### Acceptance Criteria

1. WHEN an invoice becomes overdue, THE Invoice Guard System SHALL calculate a late fee at 1 percent per week based on the invoice amount
2. WHEN calculating late fees, THE Invoice Guard System SHALL use the number of complete weeks overdue multiplied by the weekly rate
3. WHEN displaying an overdue invoice, THE Invoice Guard System SHALL show the calculated late fee amount alongside the original invoice amount
4. WHEN generating a reminder message for an overdue invoice, THE Invoice Guard System SHALL include the late fee amount if applicable
5. WHEN a user configures late fee settings, THE Invoice Guard System SHALL allow customization of the percentage rate per week

### Requirement 11

**User Story:** As a freelancer, I want the application to load instantly and work smoothly, so that I can check my invoices quickly on any device.

#### Acceptance Criteria

1. WHEN the application loads, THE Invoice Guard System SHALL render the complete dashboard within 2 seconds on standard mobile connections
2. WHEN a user performs any action, THE Invoice Guard System SHALL provide immediate visual feedback through loading states or animations
3. WHEN the application is accessed on mobile devices, THE Invoice Guard System SHALL maintain full functionality with touch-optimized controls
4. WHEN the application renders UI elements, THE Invoice Guard System SHALL use responsive design patterns that adapt to screen sizes from 320px to 1920px width
5. WHEN the application performs calculations or data operations, THE Invoice Guard System SHALL complete them without blocking the user interface

### Requirement 12

**User Story:** As a freelancer, I want a clean and professional interface, so that the tool feels premium and trustworthy.

#### Acceptance Criteria

1. WHEN the application displays colors, THE Invoice Guard System SHALL use the primary color #1E40AF for main interface elements
2. WHEN the application displays status indicators, THE Invoice Guard System SHALL use #10B981 for success, #F59E0B for warnings, and #EF4444 for danger states
3. WHEN the application renders text, THE Invoice Guard System SHALL use clean, readable typography with consistent font sizes and spacing
4. WHEN the application displays the interface, THE Invoice Guard System SHALL maintain visual hierarchy with clear separation between sections
5. WHEN the application is viewed, THE Invoice Guard System SHALL present a minimalist design free of clutter and unnecessary elements
