// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Constants
// ============================================================

// User Roles
export const ROLES = {
  BOSS: 'boss',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  STORE_KEEPER: 'store_keeper',
  SALES_REP: 'sales_rep'
};

// Order Statuses
export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: '#f59e0b' },
  { value: 'confirmed', label: 'Confirmed', color: '#3b82f6' },
  { value: 'preparing', label: 'Preparing', color: '#8b5cf6' },
  { value: 'delivered', label: 'Delivered', color: '#10b981' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444' }
];

// Payment Methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: '💰' },
  { value: 'mpesa', label: 'M-Pesa', icon: '📱' },
  { value: 'tigo_pesa', label: 'Tigo Pesa', icon: '📱' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' }
];

// Payment Statuses
export const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid', color: '#10b981' },
  { value: 'unpaid', label: 'Unpaid', color: '#ef4444' },
  { value: 'partial', label: 'Partial', color: '#f59e0b' }
];

// Expense Categories
export const EXPENSE_CATEGORIES = [
  'Rent',
  'Salaries',
  'Utilities',
  'Marketing',
  'Transport',
  'Maintenance',
  'Supplies',
  'Taxes',
  'Insurance',
  'Other'
];

// Product Categories
export const PRODUCT_CATEGORIES = [
  'Cables & Wires',
  'Switches',
  'Sockets',
  'Lighting',
  'Circuit Protection',
  'Distribution',
  'Tools',
  'Solar',
  'Generators',
  'Fans',
  'Other'
];

// Low Stock Threshold
export const LOW_STOCK_THRESHOLD = 5;

// Currency
export const CURRENCY = 'TZS';

// App Name
export const APP_NAME = 'OSWAGO Electrical Equipment';

// API Endpoints (will be used when backend is ready)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password'
  },
  USERS: '/users',
  PRODUCTS: '/products',
  CATEGORIES: '/categories',
  CUSTOMERS: '/customers',
  ORDERS: '/orders',
  PAYMENTS: '/payments',
  EXPENSES: '/expenses',
  SUPPLIERS: '/suppliers',
  PURCHASE_ORDERS: '/purchase-orders',
  REPORTS: '/reports',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings'
};