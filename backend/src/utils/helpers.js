// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Helper Functions
// ============================================================

// Generate order number
const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `ORD-${year}${month}${day}-${random}`;
};

// Generate receipt number
const generateReceiptNumber = () => {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-8);
    return `RCP-${timestamp}`;
};

// Format currency
const formatCurrency = (amount) => {
    return `TZS ${Number(amount).toLocaleString()}`;
};

// Calculate total from items
const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
};

module.exports = {
    generateOrderNumber,
    generateReceiptNumber,
    formatCurrency,
    calculateTotal
};