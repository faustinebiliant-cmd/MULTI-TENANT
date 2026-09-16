// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Input Validators
// ============================================================

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidPhone = (phone) => {
    const phoneRegex = /^(\+?255|0|255)?[0-9\-\s]{7,15}$/;
    return phoneRegex.test(phone);
};

const isValidPassword = (password) => {
    return password && password.length >= 6 && /\d/.test(password);
};

const isValidName = (name) => {
    return name && name.trim().length >= 2 && name.trim().length <= 20;
};

const isValidAmount = (amount) => {
    return amount && !isNaN(amount) && parseFloat(amount) > 0;
};

const isValidQuantity = (quantity) => {
    return quantity && Number.isInteger(parseInt(quantity)) && parseInt(quantity) > 0;
};

const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

const isValidOrderStatus = (status) => {
    return ['pending', 'confirmed', 'delivered', 'cancelled'].includes(status);
};

const isValidPaymentMethod = (method) => {
    return ['cash', 'mpesa', 'tigo_pesa'].includes(method);
};

const isValidRole = (role) => {
    return ['boss', 'manager', 'cashier', 'store_keeper', 'sales_rep'].includes(role);
};

const isValidLength = (text, min = 0, max = 100) => {
    if (!text) return true;
    if (typeof text !== 'string') return false;
    return text.length >= min && text.length <= max;
};

// Rejects XSS payloads. Runs before sanitize() in every controller.
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

const isValidArrayLength = (arr, maxItems = 100) => {
    if (!arr) return true;
    if (!Array.isArray(arr)) return false;
    return arr.length <= maxItems;
};

const isValidUrl = (url) => {
    if (!url) return true;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

const isValidDate = (dateString) => {
    if (!dateString) return true;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
};

// Normalizes input. Does NOT HTML-encode.
// XSS rejection happens in isSafeText(). React escapes on render.
// HTML-encoding here corrupts apostrophes, quotes, slashes, parentheses.
const sanitize = (input) => {
    if (typeof input !== 'string') return input;
    return input
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
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