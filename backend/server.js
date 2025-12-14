/**
 * Unicorn Weather Index - Backend Server
 * Simple Express server for future API endpoints and CORS handling
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Unicorn Weather Index Backend is running',
        timestamp: new Date().toISOString()
    });
});

// API routes placeholder
app.get('/api/status', (req, res) => {
    res.json({
        service: 'Unicorn Weather Index API',
        version: '1.0.0',
        status: 'active',
        endpoints: {
            health: '/health',
            status: '/api/status'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: 'The requested endpoint does not exist'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: 'Something went wrong on the server'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Unicorn Weather Index Backend running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📡 API status: http://localhost:${PORT}/api/status`);
});

export default app;