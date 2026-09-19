// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Rate Limiter Middleware
// ============================================================

const rateLimit = require('express-rate-limit');

// Login: 5 failed attempts per 15 min (successful logins don't count)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: 'Too many failed login attempts. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

// Admin login: 3 failed attempts per 15 min
const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        error: 'Too many admin login attempts. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

// Global API: 300 requests per 15 min per IP
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: {
        success: false,
        error: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Order creation: 50 per hour
const orderCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        error: 'Too many orders created. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Product creation: 20 per hour
const productCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: 'Too many products created. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Customer creation: 30 per hour
const customerCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: {
        success: false,
        error: 'Too many customers created. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Payment recording: 30 per hour
const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: {
        success: false,
        error: 'Too many payments recorded. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Password reset: 3 per hour
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        error: 'Too many password reset attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// API key operations: 50 per hour
const apiKeyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        error: 'Too many API key operations. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Report generation: 20 per hour
const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: 'Too many report requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Signup: 3 per hour per IP — protects against mass account creation
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        error: 'Too many signup attempts. Please try again in an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    loginLimiter,
    adminLoginLimiter, 
    apiLimiter,
    orderCreationLimiter,
    productCreationLimiter,
    customerCreationLimiter,
    paymentLimiter,
    passwordResetLimiter,
    apiKeyLimiter,
    reportLimiter,
    signupLimiter
};