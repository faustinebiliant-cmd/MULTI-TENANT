// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Input Validators (UPDATED)
// ============================================================

// ✅ VALIDATE EMAIL
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// ✅ VALIDATE PHONE (Tanzania format)
const isValidPhone = (phone) => {
    // Accepts: 0712345678, +255712345678, 255712345678, 712 345 678
    const phoneRegex = /^(\+?255|0|255)?[0-9\-\s]{7,15}$/;
    return phoneRegex.test(phone);
};

// ✅ VALIDATE PASSWORD (min 6 chars, at least 1 number)
const isValidPassword = (password) => {
    return password && password.length >= 6 && /\d/.test(password);
};

// ✅ VALIDATE NAME (min 2 chars, max 100)
const isValidName = (name) => {
    return name && name.trim().length >= 2 && name.trim().length <= 100;
};

// ✅ VALIDATE AMOUNT (positive number)
const isValidAmount = (amount) => {
    return amount && !isNaN(amount) && parseFloat(amount) > 0;
};

// ✅ VALIDATE QUANTITY (positive integer)
const isValidQuantity = (quantity) => {
    return quantity && Number.isInteger(parseInt(quantity)) && parseInt(quantity) > 0;
};

// ✅ VALIDATE UUID
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

// ✅ VALIDATE ORDER STATUS
const isValidOrderStatus = (status) => {
    return ['pending', 'confirmed', 'delivered', 'cancelled'].includes(status);
};

// ✅ VALIDATE PAYMENT METHOD
const isValidPaymentMethod = (method) => {
    return ['cash', 'mpesa', 'tigo_pesa'].includes(method);
};

// ✅ VALIDATE ROLE
const isValidRole = (role) => {
    return ['boss', 'manager', 'cashier', 'store_keeper', 'sales_rep'].includes(role);
};

// ✅ VALIDATE TEXT LENGTH
const isValidLength = (text, min = 0, max = 100) => {
    if (!text) return true;
    if (typeof text !== 'string') return false;
    return text.length >= min && text.length <= max;
};

// ✅ VALIDATE NO HTML/SCRIPT
const isSafeText = (text) => {
    if (!text) return true;
    if (typeof text !== 'string') return false;
    // Check for HTML tags, script tags, javascript: protocol, event handlers
    const dangerousPatterns = [
        /<[^>]*>/g,           // HTML tags
        /javascript:/gi,      // javascript: protocol
        /on\w+=/gi,           // Event handlers (onclick, onload, etc.)
        /data:/gi,            // data: protocol (can be used for XSS)
        /vbscript:/gi,        // VBScript
        /expression\s*\(/gi,  // CSS expressions
        /alert\s*\(/gi,       // alert() calls
        /eval\s*\(/gi,        // eval() calls
        /document\./gi,       // document access
        /window\./gi,         // window access
        /location\./gi,       // location access
        /cookie/gi            // cookie access
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(text)) {
            return false;
        }
    }
    return true;
};

// ✅ VALIDATE MAX ITEMS IN ARRAY
const isValidArrayLength = (arr, maxItems = 100) => {
    if (!arr) return true;
    if (!Array.isArray(arr)) return false;
    return arr.length <= maxItems;
};

// ✅ VALIDATE URL
const isValidUrl = (url) => {
    if (!url) return true;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// ✅ VALIDATE DATE FORMAT
const isValidDate = (dateString) => {
    if (!dateString) return true;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
};

// ✅ SANITIZE INPUT (prevent XSS) - IMPROVED
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

// ✅ EXPORT ALL VALIDATORS
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