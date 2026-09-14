// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Rate Limiter Middleware (UPDATED)
// ============================================================

const rateLimit = require('express-rate-limit');

// ✅ LOGIN RATE LIMITER (5 attempts per 15 min)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: {
        success: false,
        error: 'Too many login attempts. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
});

// ✅ API RATE LIMITER (100 requests per 15 min)
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 15 minutes
    max: 100000, // 100000 requests
    message: {
        success: false,
        error: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ✅ ORDER CREATION RATE LIMITER (50 orders per hour)
const orderCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 orders
    message: {
        success: false,
        error: 'Too many orders created. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ✅ PRODUCT CREATION RATE LIMITER (20 products per hour)
const productCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 products
    message: {
        success: false,
        error: 'Too many products created. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ✅ CUSTOMER CREATION RATE LIMITER (30 customers per hour)
const customerCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // 30 customers
    message: {
        success: false,
        error: 'Too many customers created. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ✅ PAYMENT RECORDING RATE LIMITER (30 payments per hour)
const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // 30 payments
    message: {
        success: false,
        error: 'Too many payments recorded. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ✅ PASSWORD RESET RATE LIMITER (3 attempts per hour)
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts
    message: {
        success: false,
        error: 'Too many password reset attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ✅ API KEY RATE LIMITER (50 requests per hour)
const apiKeyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 requests
    message: {
        success: false,
        error: 'Too many API key operations. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ✅ REPORT GENERATION RATE LIMITER (20 reports per hour)
const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 reports
    message: {
        success: false,
        error: 'Too many report requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ✅ EXPORT ALL LIMITERS
module.exports = {
    loginLimiter,
    apiLimiter,
    orderCreationLimiter,
    productCreationLimiter,
    customerCreationLimiter,
    paymentLimiter,
    passwordResetLimiter,
    apiKeyLimiter,
    reportLimiter
};