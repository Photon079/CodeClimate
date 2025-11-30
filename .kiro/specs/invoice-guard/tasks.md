# Implementation Plan - Invoice Guard

- [x] 1. Set up project structure and HTML foundation





  - Create index.html with semantic HTML5 structure
  - Add Tailwind CSS via CDN
  - Create directory structure (css/, js/, tests/)
  - Set up basic responsive layout with mobile-first approach
  - _Requirements: 11.4, 12.1, 12.3_

- [x] 2. Implement data models and storage layer












  - [x] 2.1 Create storage.js with localStorage wrapper functions




    - Implement loadInvoices() with error handling for corrupted data
    - Implement saveInvoices() with QuotaExceededError handling
    - Implement getPaymentSettings() and savePaymentSettings()
    - Implement getLateFeeConfig() and saveLateFeeConfig()
    - _Requirements: 9.1, 9.2, 9.3_
  


  - [x] 2.2 Write property test for storage round-trip




    - **Property 25: Storage Round-Trip Integrity**
    - **Validates: Requirements 9.1, 9.2, 9.5**
  
  - [x] 2.3 Write property test for corrupted data handling

    - **Property 26: Corrupted Data Handling**
    - **Validates: Requirements 9.3**

- [x] 3. Implement validation module





  - [x] 3.1 Create validator.js with input validation functions


    - Implement validateInvoice() for complete invoice validation
    - Implement validateClientName() to reject empty/whitespace strings
    - Implement validateAmount() to reject non-positive numbers
    - Implement validateDueDate() for date format validation
    - Implement validatePaymentMethod() for enum validation
    - _Requirements: 1.4, 1.5, 7.2_
  
  - [x] 3.2 Write property test for invalid invoice rejection


    - **Property 4: Invalid Invoice Rejection**
    - **Validates: Requirements 1.4**
  
  - [x] 3.3 Write property test for edit validation consistency

    - **Property 21: Edit Validation Consistency**
    - **Validates: Requirements 7.2**

- [x] 4. Implement formatting utilities








  - [x] 4.1 Create formatter.js with display formatting functions


    - Implement formatCurrency() with ₹ symbol and Indian number system
    - Implement formatDate() for DD/MM/YYYY display
    - Implement formatDateForInput() for YYYY-MM-DD format
    - Implement formatDaysOverdue() for relative date display
    - Implement formatRelativeDate() for "Today", "Tomorrow", etc.
    - _Requirements: 2.2, 2.3_
  
  - [x] 4.2 Write property test for currency formatting


    - **Property 5: Currency Formatting Consistency**
    - **Validates: Requirements 2.2**
  
  - [x] 4.3 Write property test for days overdue calculation


    - **Property 6: Days Overdue Calculation**
    - **Validates: Requirements 2.3**


- [x] 5. Implement invoice business logic















  - [x] 5.1 Create invoice.js with core invoice operations


    - Implement createInvoice() with UUID generation and defaults
    - Implement generateInvoiceNumber() with INV-YYYYMM-XXX format
    - Implement updateInvoice() with field immutability checks
    - Implement deleteInvoice() with array filtering
    - Implement calculateStatus() for status badge assignment
    - Implement calculateLateFee() with configurable percentage
    - _Requirements: 1.1, 1.2, 1.3, 7.3, 8.2, 10.1_
  
  - [x] 5.2 Write property test for UUID uniqueness




    - **Property 1: UUID Uniqueness**

    - **Validates: Requirements 1.1**
  
  - [x] 5.3 Write property test for default due date



    - **Property 2: Default Due Date**
  
  - **Validates: Requirements 1.2**
  
  - [x] 5.4 Write property test for invoice number format



    - **Property 3: Invoice Number Format and Sequencing**
    - **Validates: Requirements 1.3**

  
  - [x] 5.5 Write property test for edit immutability



    - **Property 22: Edit Immutability**
    - **Validates: Requirements 7.3**
  
  - [x] 5.6 Write property test for late fee calculation


    - **Property 27: Late Fee Calculation**
    - **Validates: Requirements 10.1, 10.2**
  
  - [x] 5.7 Write property test for late fee configuration


    - **Property 30: Late Fee Configuration**
    - **Validates: Requirements 10.5**

- [x] 6. Implement status calculation and badge assignment





  - [x] 6.1 Add status calculation logic to invoice.js

    - Implement logic for "Not Due" status (due date > 1 day future)
    - Implement logic for "Due Soon" status (due today or tomorrow)
    - Implement logic for "Overdue" status (due date > 1 day past)
    - Implement logic for "Paid" status badge
    - Implement getInvoicesWithStatus() to enrich invoices with status
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 6.2 Write property test for Not Due status


    - **Property 7: Status Badge Assignment - Not Due**
    - **Validates: Requirements 3.1**
  
  - [x] 6.3 Write property test for Due Soon status


    - **Property 8: Status Badge Assignment - Due Soon**
    - **Validates: Requirements 3.2**
  
  - [x] 6.4 Write property test for Overdue status


    - **Property 9: Status Badge Assignment - Overdue**
    - **Validates: Requirements 3.3**
  
  - [x] 6.5 Write property test for Paid status


    - **Property 10: Status Badge Assignment - Paid**
    - **Validates: Requirements 3.4, 6.3**

- [x] 7. Implement summary statistics calculations




  - [x] 7.1 Add calculateSummary() function to invoice.js

    - Calculate total outstanding (sum of pending invoices)
    - Calculate overdue amount (sum of overdue pending invoices)
    - Count invoices due this week (due within 7 days)
    - Exclude paid and cancelled invoices from calculations
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 3.5_
  
  - [x] 7.2 Write property test for cancelled invoice exclusion


    - **Property 11: Cancelled Invoice Exclusion**
    - **Validates: Requirements 3.5**

  
  - [x] 7.3 Write property test for total outstanding










    - **Property 12: Total Outstanding Calculation**

    - **Validates: Requirements 4.1, 4.4**
  
  - [x] 7.4 Write property test for overdue amount

    - **Property 13: Overdue Amount Calculation**
    - **Validates: Requirements 4.2**
  

  - [x] 7.5 Write property test for due this week count









    - **Property 14: Due This Week Count**
    - **Validates: Requirements 4.3**


- [x] 8. Implement reminder message generation



  - [x] 8.1 Create reminder.js with message generation logic


    - Implement generateReminder() with template and field substitution
    - Implement getReminderTone() with escalating urgency based on days overdue
    - Implement formatPaymentOptions() with UPI/bank/PayPal placeholders
    - Include client name, invoice number, amount, due date, days overdue
    - Include late fee in reminder if applicable
    - _Requirements: 5.1, 5.2, 5.3, 10.4_
  
  - [x] 8.2 Write property test for reminder completeness


    - **Property 15: Reminder Message Completeness**
    - **Validates: Requirements 5.1**
  
  - [x] 8.3 Write property test for reminder tone escalation

    - **Property 16: Reminder Tone Escalation**
    - **Validates: Requirements 5.2**
  
  - [x] 8.4 Write property test for payment placeholders

    - **Property 17: Payment Method Placeholders**
    - **Validates: Requirements 5.3**
  
  - [x] 8.5 Write property test for late fee in reminders

    - **Property 29: Late Fee in Reminders**
    - **Validates: Requirements 10.4**

- [x] 9. Implement UI rendering module






  - [x] 9.1 Create ui.js with DOM manipulation functions

    - Implement renderDashboard() to orchestrate full UI render
    - Implement renderSummaryCards() with formatted statistics
    - Implement renderInvoiceTable() with all columns and action buttons
    - Implement renderEmptyState() for zero invoices
    - Implement status badge rendering with correct colors (#10B981, #F59E0B, #EF4444)
    - _Requirements: 2.1, 2.4, 12.2_
  
  - [x] 9.2 Write property test for status color coding


    - **Property 31: Status Color Coding**
    - **Validates: Requirements 12.2**
  
  - [x] 9.3 Write property test for late fee display

    - **Property 28: Late Fee Display**
    - **Validates: Requirements 10.3**

- [x] 10. Implement modal dialogs




  - [x] 10.1 Add modal functions to ui.js

    - Implement showInvoiceModal() for add/edit with form pre-filling
    - Implement hideInvoiceModal() with form reset
    - Implement showReminderModal() with generated message display
    - Implement showConfirmDialog() for delete confirmation
    - Implement showToast() for success/error notifications
    - Add modal backdrop and close handlers
    - _Requirements: 1.1, 7.1, 5.1, 8.1_

- [x] 11. Implement clipboard functionality




  - [x] 11.1 Add copyToClipboard() function to ui.js

    - Use Clipboard API with fallback for unsupported browsers
    - Show success toast on successful copy
    - Show manual copy instructions if API unavailable
    - _Requirements: 5.4_

- [x] 12. Implement invoice CRUD operations









  - [x] 12.1 Create app.js with application controller logic

    - Implement handleAddInvoice() to create and save new invoices
    - Implement handleEditInvoice() to update existing invoices
    - Implement handleDeleteInvoice() with confirmation
    - Implement handleMarkPaid() to update status
    - Implement handleSendReminder() to generate and show reminder
    - Wire all operations to update localStorage and re-render UI
    - _Requirements: 1.1, 6.1, 7.3, 8.2, 5.5_
  
  - [x] 12.2 Write property test for mark paid status update


    - **Property 19: Mark Paid Status Update**
    - **Validates: Requirements 6.1, 6.2**
  
  - [x] 12.3 Write property test for paid invoice data preservation

    - **Property 20: Paid Invoice Data Preservation**
    - **Validates: Requirements 6.5**
  
  - [x] 12.4 Write property test for deletion persistence

    - **Property 23: Deletion Persistence**
    - **Validates: Requirements 8.2**
  

  - [x] 12.5 Write property test for deletion summary update

    - **Property 24: Deletion Summary Update**
    - **Validates: Requirements 8.4**

  
  - [x] 12.6 Write property test for reminder sent flag

    - **Property 18: Reminder Sent Flag**
    - **Validates: Requirements 5.5**

- [x] 13. Implement form validation and submission




  - [x] 13.1 Add form handling to app.js


    - Implement form validation on submit with error display
    - Implement real-time validation feedback for amount field
    - Implement date picker with default +14 days
    - Implement payment method dropdown
    - Handle form reset after successful submission
    - _Requirements: 1.4, 1.5, 1.2_

- [x] 14. Implement application initialization




  - [x] 14.1 Add initialization logic to app.js

    - Load invoices from localStorage on page load
    - Initialize with empty array if no data exists
    - Render initial dashboard state
    - Set up all event listeners
    - Handle localStorage errors gracefully
    - _Requirements: 9.2, 9.3_

- [x] 15. Add responsive design and mobile optimization





  - [x] 15.1 Enhance CSS for mobile-first responsive design


    - Implement responsive table (stack on mobile)
    - Add touch-friendly button sizes (min 44x44px)
    - Implement responsive modal dialogs
    - Add mobile-optimized form inputs
    - Test layout from 320px to 1920px width
    - _Requirements: 2.5, 11.3, 11.4_

- [x] 16. Implement settings/configuration UI





  - [x] 16.1 Add settings modal to ui.js


    - Create settings form for payment details (UPI, bank, PayPal)
    - Create settings form for user name
    - Create settings form for late fee configuration
    - Implement save settings functionality
    - Load and display current settings
    - _Requirements: 5.3, 10.5_

- [x] 17. Add loading states and animations






  - [x] 17.1 Enhance ui.js with loading feedback




    - Add loading spinner for operations
    - Add fade-in animations for modals
    - Add smooth transitions for status changes
    - Add skeleton screens for initial load
    - _Requirements: 11.2_

- [x] 18. Implement error handling and user feedback





  - [x] 18.1 Add comprehensive error handling


    - Catch and display localStorage quota errors
    - Handle date parsing errors gracefully
    - Show user-friendly error messages in toasts
    - Add validation error messages below form fields
    - Implement retry logic for failed operations
    - _Requirements: 9.3_

- [x] 19. Add accessibility features












  - [x] 19.1 Enhance HTML with accessibility attributes






    - Add ARIA labels to all interactive elements
    - Implement keyboard navigation for modals
    - Add focus management for modal open/close
    - Ensure proper heading hierarchy
    - Add alt text and semantic HTML throughout
    - _Requirements: 11.3_

- [x] 20. Performance optimization






  - [x] 20.1 Optimize rendering and calculations




    - Implement memoization for status calculations
    - Add debouncing for search/filter inputs (if added)
    - Optimize table rendering for large datasets
    - Minimize DOM manipulations
    - _Requirements: 11.5_

- [x] 21. Final integration and polish






  - [x] 21.1 Complete end-to-end integration

    - Test complete user workflows (add, edit, delete, mark paid)
    - Verify all modals open and close correctly
    - Test reminder generation and copy functionality
    - Verify localStorage persistence across page reloads
    - Test with various invoice counts (0, 1, 10, 100+)
    - _Requirements: All_
  


  - [x] 21.2 Add final UI polish





    - Refine color scheme and visual hierarchy
    - Add hover states and transitions
    - Ensure consistent spacing and alignment
    - Add favicon and page title
    - _Requirements: 12.1, 12.3, 12.4, 12.5_

- [x] 22. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 23. Create documentation and deployment assets






  - [x] 23.1 Create README.md

    - Add project description and features
    - Add screenshots of the application
    - Add installation and usage instructions
    - Add deployment instructions for Netlify/Vercel
    - Add browser compatibility information
    - Add license information
  

  - [x] 23.2 Prepare for deployment

    - Test on multiple browsers (Chrome, Firefox, Safari, Edge)
    - Verify offline functionality
    - Optimize assets for production
    - Create deployment configuration files
    - _Requirements: 9.4, 11.1_
