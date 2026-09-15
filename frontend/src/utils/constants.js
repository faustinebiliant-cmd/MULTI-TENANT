// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Constants
// ============================================================
// Application vocabulary only. Shop-specific values (name, address,
// phone, currency, expense categories) live in the settings table
// and are provided by ShopContext.

export const ROLES = {
  BOSS: 'boss',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  STORE_KEEPER: 'store_keeper',
  SALES_REP: 'sales_rep'
};

export const ROLE_META = {
  boss: { label: 'Boss', color: '#dc2626', icon: 'FiAward' },
  manager: { label: 'Manager', color: '#2563eb', icon: 'FiBriefcase' },
  cashier: { label: 'Cashier', color: '#d97706', icon: 'FiDollarSign' },
  store_keeper: { label: 'Store Keeper', color: '#7c3aed', icon: 'FiArchive' },
  sales_rep: { label: 'Sales Rep', color: '#059669', icon: 'FiUserCheck' }
};

export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const PAYMENT_STATUS_META = {
  paid: { label: 'Paid', color: '#0bc518' },
  unpaid: { label: 'Unpaid', color: '#d00f0f' },
  partial: { label: 'Partial', color: '#92400e' },
  cancelled: { label: 'Cancelled', color: '#6b7280' }
};

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: 'FiDollarSign' },
  { value: 'mpesa', label: 'M-Pesa', icon: 'FiSmartphone' },
  { value: 'tigo_pesa', label: 'Tigo Pesa', icon: 'FiSmartphone' }
];

export const PAYMENT_STATUSES = [
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' }
];

export const LOW_STOCK_THRESHOLD = 5;

// Only used as a fallback if the categories table is empty.
export const FALLBACK_PRODUCT_CATEGORIES = [
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