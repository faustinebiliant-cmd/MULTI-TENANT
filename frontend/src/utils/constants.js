// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Constants
// ============================================================

// User roles (must match backend validators)
export const ROLES = {
  BOSS: 'boss',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  STORE_KEEPER: 'store_keeper',
  SALES_REP: 'sales_rep'
};

// Order statuses (matches backend isValidOrderStatus)
export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
];

// Payment methods — icon is a react-icons component name
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: 'FiDollarSign' },
  { value: 'mpesa', label: 'M-Pesa', icon: 'FiSmartphone' },
  { value: 'tigo_pesa', label: 'Tigo Pesa', icon: 'FiSmartphone' }
];

// Payment statuses
export const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' }
];

// Expense categories
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

// Default product categories (fallback if DB is empty)
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

// Shop defaults
export const LOW_STOCK_THRESHOLD = 5;
export const CURRENCY = 'TZS';
export const APP_NAME = 'OSWAGO Electrical Equipment';
export const SHOP_LOCATION = 'Darajani, Kigamboni, Dar es Salaam';
export const SHOP_PHONE = '0750825721';