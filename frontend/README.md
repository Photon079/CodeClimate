# Invoice Guard Frontend

Modern, offline-first invoice tracking application for freelancers.

## Features

✅ **Core Features**
- Invoice management (Create, Read, Update, Delete)
- Status tracking (Not Due, Due Soon, Overdue, Paid)
- Late fee calculation
- Payment reminder generation
- Real-time search and filtering
- Dark mode support

✅ **Advanced Features**
- Export to CSV/JSON/Report
- Import from CSV/JSON
- Demo data for quick evaluation
- Keyboard shortcuts
- Responsive design (mobile-first)
- Offline-capable (localStorage)

## Quick Start

### Option 1: Direct File Opening
Simply open `index.html` in your browser.

**Note:** For full functionality (ES6 modules), use a local server instead.

### Option 2: Local Server (Recommended)

**Using Python:**
```bash
cd frontend
python -m http.server 8000
```
Then open: `http://localhost:8000`

**Using Node.js:**
```bash
cd frontend
npx http-server -p 8000
```
Then open: `http://localhost:8000`

**Using VS Code Live Server:**
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

## Project Structure

```
frontend/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── css/
│   └── styles.css         # All styles including dark mode
├── js/
│   ├── app.js             # Main application controller
│   ├── invoice.js         # Invoice business logic
│   ├── storage.js         # localStorage wrapper
│   ├── validator.js       # Input validation
│   ├── formatter.js       # Currency/date formatting
│   ├── reminder.js        # Reminder generation
│   ├── ui.js              # DOM manipulation
│   ├── performance.js     # Performance utilities
│   ├── search.js          # Search & filter
│   ├── theme.js           # Dark mode
│   ├── export.js          # Data export/import
│   └── demo.js            # Demo data generation
└── README.md              # This file
```

## Usage

### Adding an Invoice
1. Click "Add Invoice" button
2. Fill in client details
3. Set amount and due date
4. Choose payment method
5. Click "Save Invoice"

### Search & Filter
- Use the search bar to find invoices
- Filter by status using the dropdown
- Sort by clicking column headers
- Clear all filters with "Clear Filters"

### Dark Mode
- Click the sun/moon icon in the header
- Theme preference is saved automatically

### Export Data
1. Click "Export" button
2. Choose format (CSV, JSON, or Report)
3. File downloads automatically

### Keyboard Shortcuts
- `Ctrl + N` - New invoice
- `Ctrl + F` - Focus search
- `Esc` - Close modals
- `Ctrl + ?` - Show shortcuts

### Demo Data
- Click "Load Demo Data" button (bottom left)
- 8 sample invoices will be loaded
- Perfect for testing and demonstration

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Android Chrome)

## Technologies

- **Vanilla JavaScript** (ES6+)
- **Tailwind CSS** (via CDN)
- **localStorage API**
- **No build process required**

## Testing

```bash
cd ..
npm test
```

## Deployment

See main README.md for deployment instructions to:
- Netlify
- Vercel
- GitHub Pages

## Features in Detail

### Invoice Management
- Auto-generated invoice numbers (INV-YYYYMM-XXX)
- Default 14-day due date
- Multiple payment methods (UPI, Bank, PayPal, Other)
- Notes field for additional information

### Status System
- 🟢 **Not Due** - Due date > 1 day away
- 🟡 **Due Soon** - Due today or tomorrow
- 🔴 **Overdue** - Past due date
- ✅ **Paid** - Payment received

### Late Fees
- Configurable percentage (default 1% per week)
- Automatic calculation for overdue invoices
- Included in reminder messages

### Reminders
- Auto-generated polite messages
- Escalating tone based on days overdue
- Payment method placeholders
- One-click copy to clipboard

### Search & Filter
- Search by client, invoice #, amount
- Filter by status
- Sort by any column
- Combine multiple filters

### Dark Mode
- Beautiful dark theme
- Respects system preference
- Smooth transitions
- Persistent across sessions

### Export/Import
- Export to CSV, JSON, or text report
- Import from CSV/JSON
- Timestamped filenames
- Backup and restore data

## Performance

- Initial load: < 2 seconds
- Smooth 60fps animations
- Optimized for 100+ invoices
- Efficient DOM updates
- Memoized calculations

## Accessibility

- Keyboard navigation
- ARIA labels
- Screen reader compatible
- Focus management
- Semantic HTML

## License

MIT
