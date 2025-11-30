# Invoice Guard - Setup Guide

Quick setup guide for running Invoice Guard locally.

## 📋 Prerequisites

- **Web Browser** (Chrome, Firefox, Safari, or Edge)
- **Python 3.x** OR **Node.js** (for local server)
- **Git** (optional, for cloning)

## 🚀 Quick Setup

### Option 1: Frontend Only (Recommended for Testing)

This runs the app without a backend - all data stored locally in browser.

**Step 1: Navigate to frontend**
```bash
cd frontend
```

**Step 2: Start a local server**

Choose one:

```bash
# Using Python
python -m http.server 8000

# OR using Node.js
npx http-server -p 8000

# OR using PHP
php -S localhost:8000
```

**Step 3: Open in browser**
```
http://localhost:8000
```

**Step 4: Load demo data**
- Click "📊 Load Demo Data" button (bottom left)
- Explore all features with sample invoices

### Option 2: Full Stack (Frontend + Backend)

This includes the optional API server for cloud sync.

**Step 1: Start Backend**
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend will run on `http://localhost:3000`

**Step 2: Start Frontend** (in new terminal)
```bash
cd frontend
python -m http.server 8000
```

Frontend will run on `http://localhost:8000`

**Step 3: Test API** (optional)
```bash
curl http://localhost:3000/api/health
```

## 🧪 Running Tests

```bash
# From project root
npm install
npm test
```

All 109 tests should pass ✅

## 🎨 Features to Try

### 1. Dark Mode
- Click sun/moon icon in header
- Theme persists across sessions

### 2. Search & Filter
- Type in search box to find invoices
- Use status dropdown to filter
- Click sort buttons to reorder

### 3. Export Data
- Click "Export" button
- Choose CSV, JSON, or Report
- File downloads automatically

### 4. Keyboard Shortcuts
- `Ctrl + N` - New invoice
- `Ctrl + F` - Focus search
- `Esc` - Close modals

### 5. Create Invoice
- Click "Add Invoice"
- Fill in details
- Watch status badges update

### 6. Generate Reminder
- Click "Send Reminder" on any invoice
- See polite, escalating message
- Copy to clipboard

## 📱 Mobile Testing

### Using Browser DevTools
1. Open DevTools (F12)
2. Click device toolbar icon
3. Select mobile device
4. Test responsive design

### Using Real Device
1. Find your computer's IP address
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. On mobile browser, visit:
   ```
   http://YOUR_IP:8000
   ```

## 🐛 Troubleshooting

### Issue: "Module not found" errors

**Solution**: You need a local server (not file://)
```bash
cd frontend
python -m http.server 8000
```

### Issue: Dark mode not working

**Solution**: Clear browser cache and reload
```bash
Ctrl + Shift + R (hard reload)
```

### Issue: Tests failing

**Solution**: Install dependencies
```bash
npm install
npm test
```

### Issue: Backend won't start

**Solution**: Check if port 3000 is available
```bash
# Windows
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :3000
```

### Issue: Can't access on mobile

**Solution**: Check firewall settings
- Allow port 8000 in firewall
- Ensure devices on same network

## 📦 Project Structure

```
invoice-guard/
├── frontend/          # Run: python -m http.server 8000
│   ├── index.html
│   ├── css/
│   └── js/
├── backend/           # Run: npm run dev
│   ├── server.js
│   └── routes/
└── tests/             # Run: npm test
```

## 🎯 Quick Demo Script

Perfect for showing to judges or stakeholders:

1. **Load Demo Data** (1 click)
   - Click "📊 Load Demo Data"

2. **Show Search** (5 seconds)
   - Type "Acme" in search box
   - Results filter instantly

3. **Toggle Dark Mode** (2 seconds)
   - Click sun/moon icon
   - Watch smooth transition

4. **Generate Reminder** (10 seconds)
   - Click "Send Reminder" on overdue invoice
   - Show escalating tone
   - Copy to clipboard

5. **Export Data** (5 seconds)
   - Click "Export"
   - Choose CSV
   - File downloads

6. **Show Mobile** (10 seconds)
   - Open DevTools
   - Switch to mobile view
   - Show responsive design

**Total demo time: ~30 seconds**

## 🚀 Deployment

See `DEPLOYMENT.md` for detailed deployment instructions to:
- Netlify
- Vercel
- GitHub Pages
- Heroku (backend)

## 📚 Additional Resources

- **README.md** - Main documentation
- **frontend/README.md** - Frontend guide
- **backend/README.md** - Backend API docs
- **PROJECT_STRUCTURE.md** - Architecture overview
- **ENHANCEMENTS.md** - Competition features
- **DEPLOYMENT.md** - Deployment guide
- **BROWSER_TESTING.md** - Browser compatibility

## 💡 Tips for Competition

1. **Start with demo data** - Shows all features immediately
2. **Highlight dark mode** - Modern, trendy feature
3. **Show search/filter** - Demonstrates usability
4. **Export data** - Practical real-world feature
5. **Mention 109 tests** - Shows code quality
6. **Show mobile responsive** - Works everywhere
7. **Emphasize offline-first** - No backend required

## 🎓 Learning Resources

### Frontend
- Vanilla JavaScript ES6+
- Tailwind CSS
- localStorage API
- ES6 Modules

### Backend
- Node.js
- Express.js
- RESTful APIs
- MongoDB (future)

### Testing
- Vitest
- fast-check (property-based testing)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit pull request

## 📄 License

MIT License - See LICENSE file

---

**Need Help?**
- Check troubleshooting section above
- Review documentation files
- Open an issue on GitHub

**Ready to Win?** 🏆
Follow the quick demo script above!
