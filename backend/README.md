# Invoice Guard Backend API

Optional backend server for Invoice Guard with cloud sync and advanced features.

## Features

- **RESTful API** for invoice management
- **Cloud Sync** - Sync data across devices
- **Authentication** - User accounts (coming soon)
- **Email Reminders** - Automated email sending (coming soon)
- **Payment Integration** - Razorpay/Stripe (coming soon)
- **WhatsApp Integration** - Send reminders via WhatsApp (coming soon)

## Quick Start

### Installation

```bash
cd backend
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your configuration

### Running the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /api/health
```

### Invoices
```
GET    /api/invoices           - Get all invoices
GET    /api/invoices/:id       - Get single invoice
POST   /api/invoices           - Create invoice
PUT    /api/invoices/:id       - Update invoice
DELETE /api/invoices/:id       - Delete invoice
GET    /api/invoices/stats/summary - Get statistics
```

### Authentication (Coming Soon)
```
POST /api/auth/register  - Register user
POST /api/auth/login     - Login user
POST /api/auth/logout    - Logout user
```

### Sync
```
POST /api/sync/upload    - Upload local data
GET  /api/sync/download  - Download cloud data
```

## Testing the API

### Using curl:

```bash
# Health check
curl http://localhost:3000/api/health

# Get all invoices
curl http://localhost:3000/api/invoices

# Create invoice
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Test Client",
    "amount": 5000,
    "dueDate": "2025-12-31",
    "paymentMethod": "UPI",
    "status": "pending"
  }'
```

### Using Postman:

Import the API endpoints and test them with Postman.

## Database Setup (Optional)

The current implementation uses in-memory storage. To add MongoDB:

1. Install MongoDB locally or use MongoDB Atlas
2. Update `MONGODB_URI` in `.env`
3. Uncomment database connection code in `server.js`

## Deployment

### Deploy to Heroku:

```bash
heroku create invoice-guard-api
git push heroku main
```

### Deploy to Railway:

```bash
railway init
railway up
```

### Deploy to Vercel:

```bash
vercel
```

## Future Enhancements

- [ ] MongoDB integration
- [ ] User authentication with JWT
- [ ] Email reminder service
- [ ] Payment gateway integration
- [ ] WhatsApp Business API
- [ ] PDF generation on server
- [ ] Analytics and reporting
- [ ] Multi-user support
- [ ] Role-based access control

## Tech Stack

- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database (optional)
- **JWT** - Authentication
- **Nodemailer** - Email sending

## License

MIT
