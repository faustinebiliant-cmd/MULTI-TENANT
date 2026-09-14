// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Server (UPDATED)
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const supplierRoutes = require('./routes/suppliers');
const expenseRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const purchaseOrderRoutes = require('./routes/purchase-orders');
const reportRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5001;

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// ✅ 1. DISABLE CACHING FOR API RESPONSES
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// ✅ 2. SECURITY HEADERS (Helmet)
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: { action: 'deny' },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// ✅ 3. CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.warn(`Blocked CORS request from: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400
}));

// ✅ 4. LOGGING
app.use(morgan('dev'));

// ✅ 5. JSON PARSING
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================
// RATE LIMITING
// ============================================================
//
// ⚠️⚠️⚠️ DEVELOPMENT MODE — RATE LIMITERS DISABLED ⚠️⚠️⚠️
//
// Both the global API limiter and the login limiter are wrapped
// in `if (false)` blocks so they don't run during development.
//
// >>> BEFORE PRODUCTION, DO THIS: <<<
//   1. Search this file for "⚠️⚠️⚠️"
//   2. Remove the `if (false) {` line and its matching closing `}`
//      for EACH limiter you want to re-enable.
//   3. Restart the server.
//
// Leaving them disabled in production means:
//   - No protection against brute-force login attacks
//   - No protection against API abuse / DoS
// ============================================================

// Global API rate limit (100000 requests per 1 min)
if (false) {
    const apiLimiter = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 100000,
        message: {
            success: false,
            error: 'Too many requests. Please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api', apiLimiter);
}

// Login rate limit (5 attempts per 15 min)
if (false) {
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: {
            success: false,
            error: 'Too many login attempts. Try again in 15 minutes.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api/auth/login', loginLimiter);
}

// ✅ NEW: Stricter rate limiting for order creation
// ⚠️⚠️⚠️ Also disabled in development — re-enable before production.
if (false) {
    const orderCreationLimiter = rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 50,
        message: {
            success: false,
            error: 'Too many orders. Please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.set('orderCreationLimiter', orderCreationLimiter);
}

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', settingsRoutes);

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 - Route not found
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);

    const isProduction = process.env.NODE_ENV === 'production';
    const errorMessage = isProduction ? 'Internal server error' : err.message;

    res.status(500).json({
        success: false,
        error: errorMessage
    });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
    console.log('========================================');
    console.log('   OSWAGO ELECTRICAL EQUIPMENT');
    console.log('========================================');
    console.log(`   Server: http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('⚠️  Rate limiters DISABLED (development mode)');
    console.log('========================================');
});