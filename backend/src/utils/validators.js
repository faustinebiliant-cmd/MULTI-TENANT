// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Input Validators
// ============================================================

// Email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Tanzania phone (0712345678, +255712345678, 255712345678)
const isValidPhone = (phone) => {
    const phoneRegex = /^(\+?255|0|255)?[0-9\-\s]{7,15}$/;
    return phoneRegex.test(phone);
};

// Password: min 6 chars, at least 1 number
const isValidPassword = (password) => {
    return password && password.length >= 6 && /\d/.test(password);
};

// Name: 2-100 chars
const isValidName = (name) => {
    return name && name.trim().length >= 2 && name.trim().length <= 100;
};

// Positive amount
const isValidAmount = (amount) => {
    return amount && !isNaN(amount) && parseFloat(amount) > 0;
};

// Positive integer quantity
const isValidQuantity = (quantity) => {
    return quantity && Number.isInteger(parseInt(quantity)) && parseInt(quantity) > 0;
};

// UUID v4-ish
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

// Order status
const isValidOrderStatus = (status) => {
    return ['pending', 'confirmed', 'delivered', 'cancelled'].includes(status);
};

// Payment method
const isValidPaymentMethod = (method) => {
    return ['cash', 'mpesa', 'tigo_pesa'].includes(method);
};

// User role
const isValidRole = (role) => {
    return ['boss', 'manager', 'cashier', 'store_keeper', 'sales_rep'].includes(role);
};

// String length range
const isValidLength = (text, min = 0, max = 100) => {
    if (!text) return true;
    if (typeof text !== 'string') return false;
    return text.length >= min && text.length <= max;
};

// Block HTML/script/XSS payloads
const isSafeText = (text) => {
    if (!text) return true;
    if (typeof text !== 'string') return false;
    const dangerousPatterns = [
        /<[^>]*>/g,
        /javascript:/gi,
        /on\w+=/gi,
        /data:/gi,
        /vbscript:/gi,
        /expression\s*\(/gi,
        /alert\s*\(/gi,
        /eval\s*\(/gi,
        /document\./gi,
        /window\./gi,
        /location\./gi,
        /cookie/gi
    ];
    for (const pattern of dangerousPatterns) {
        if (pattern.test(text)) return false;
    }
    return true;
};

// Array max items
const isValidArrayLength = (arr, maxItems = 100) => {
    if (!arr) return true;
    if (!Array.isArray(arr)) return false;
    return arr.length <= maxItems;
};

// URL format
const isValidUrl = (url) => {
    if (!url) return true;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// Date parseable
const isValidDate = (dateString) => {
    if (!dateString) return true;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
};

// Escape dangerous characters
const sanitize = (input) => {
    if (typeof input !== 'string') return input;
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\//g, '&#x2F;')
        .replace(/`/g, '&#96;')
        .replace(/=/g, '&#61;')
        .replace(/\(/g, '&#40;')
        .replace(/\)/g, '&#41;')
        .replace(/;/g, '&#59;');
};

module.exports = {
    isValidEmail,
    isValidPhone,
    isValidPassword,
    isValidName,
    isValidAmount,
    isValidQuantity,
    isValidUUID,
    isValidOrderStatus,
    isValidPaymentMethod,
    isValidRole,
    isValidLength,
    isSafeText,
    isValidArrayLength,
    isValidUrl,
    isValidDate,
    sanitize
};