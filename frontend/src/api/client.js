// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - API Client (FIXED)
// ============================================================

import axios from 'axios';
import toast from 'react-hot-toast';

// API Base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  timeout: 10000
});

// Add token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ IMPROVED RESPONSE INTERCEPTOR
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    if (error.response?.status === 403) {
      console.error('Access denied:', error.response.data?.error);
      toast.error(error.response.data?.error || 'Access denied. You do not have permission.');
    }

    if (error.response?.status === 404) {
      console.error('Resource not found:', error.response.data?.error);
    }

    if (error.response?.status === 429) {
      toast.error(error.response.data?.error || 'Too many requests. Please wait and try again.');
    }

    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data?.error);
      toast.error('Server error. Please try again.');
    }

    if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection and try again.');
    }

    if (error.code === 'ERR_NETWORK') {
      toast.error('Network error. Check your internet connection.');
    }

    return Promise.reject(error);
  }
);

// ============================================================
// API FUNCTIONS - Connected to Backend
// ============================================================

const api = {
  // ----- AUTHENTICATION -----
  auth: {
    login: async (data) => {
      if (!data.email || !data.password) {
        throw new Error('Email and password are required');
      }
      const response = await apiClient.post('/auth/login', data);
      return response.data;
    },
    getMe: async () => {
      const response = await apiClient.get('/auth/me');
      return response.data;
    },
    logout: async () => {
      const response = await apiClient.post('/auth/logout');
      return response.data;
    },
    changePassword: async (data) => {
      if (!data.current_password || !data.new_password) {
        throw new Error('Current password and new password are required');
      }
      if (data.new_password.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }
      const response = await apiClient.post('/auth/change-password', data);
      return response.data;
    }
  },

  // ----- SETTINGS -----
  getSettings: async () => {
    try {
      const response = await apiClient.get('/settings');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return { vat_enabled: false, vat_rate: 18, tin: '', vrn: '' };
    }
  },

  updateSettings: async (data) => {
    try {
      const response = await apiClient.put('/settings', data);
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  },

  // ----- PRODUCTS -----
  getProducts: async () => {
    try {
      const response = await apiClient.get('/products');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  },
  getProductsPage: async (queryString = '') => {
    const url = queryString ? `/products?${queryString}` : '/products';
    const response = await apiClient.get(url);
    return response.data;
  },
  getProduct: async (id) => {
    if (!id) throw new Error('Product ID is required');
    const response = await apiClient.get(`/products/${id}`);
    return response.data.data;
  },
  createProduct: async (data) => {
    if (!data.name) throw new Error('Product name is required');
    if (!data.cost_price || data.cost_price <= 0) throw new Error('Valid cost price is required');
    if (!data.selling_price || data.selling_price <= 0) throw new Error('Valid selling price is required');
    const response = await apiClient.post('/products', data);
    return response.data;
  },
  updateProduct: async (id, data) => {
    if (!id) throw new Error('Product ID is required');
    const response = await apiClient.put(`/products/${id}`, data);
    return response.data;
  },
  deleteProduct: async (id) => {
    if (!id) throw new Error('Product ID is required');
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },
  adjustStock: async (id, data) => {
    if (!id) throw new Error('Product ID is required');
    if (!data.quantity || data.quantity <= 0) throw new Error('Valid quantity is required');
    if (!data.reason) throw new Error('Reason is required');
    const response = await apiClient.patch(`/products/${id}/stock`, data);
    return response.data;
  },

  // ----- CATEGORIES -----
  getCategories: async () => {
    try {
      const response = await apiClient.get('/categories');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },
  createCategory: async (data) => {
    if (!data.name) throw new Error('Category name is required');
    try {
      const response = await apiClient.post('/categories', data);
      return response.data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },
  updateCategory: async (id, data) => {
    if (!id) throw new Error('Category ID is required');
    if (!data.name) throw new Error('Category name is required');
    try {
      const response = await apiClient.put(`/categories/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },
  deleteCategory: async (id) => {
    if (!id) throw new Error('Category ID is required');
    try {
      const response = await apiClient.delete(`/categories/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  // ----- CUSTOMERS -----
  getCustomers: async () => {
    try {
      const response = await apiClient.get('/customers');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  },
  getCustomersPage: async (queryString = '') => {
    const url = queryString ? `/customers?${queryString}` : '/customers';
    const response = await apiClient.get(url);
    return response.data;
  },
  getCustomer: async (id) => {
    if (!id) throw new Error('Customer ID is required');
    const response = await apiClient.get(`/customers/${id}`);
    return response.data.data;
  },
  createCustomer: async (data) => {
    if (!data.name) throw new Error('Customer name is required');
    if (!data.phone) throw new Error('Phone number is required');
    const response = await apiClient.post('/customers', data);
    return response.data;
  },
  updateCustomer: async (id, data) => {
    if (!id) throw new Error('Customer ID is required');
    const response = await apiClient.put(`/customers/${id}`, data);
    return response.data;
  },
  deleteCustomer: async (id) => {
    if (!id) throw new Error('Customer ID is required');
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  },

  // ----- ORDERS -----
  getOrders: async () => {
    try {
      const response = await apiClient.get('/orders');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  },
  getOrdersPage: async (queryString = '') => {
    const url = queryString ? `/orders?${queryString}` : '/orders';
    const response = await apiClient.get(url);
    return response.data;
  },
  getOrder: async (id) => {
    if (!id) throw new Error('Order ID is required');
    const response = await apiClient.get(`/orders/${id}`);
    return response.data.data;
  },
  createOrder: async (data) => {
    if (!data.customer_id) throw new Error('Customer is required');
    if (!data.items || data.items.length === 0) throw new Error('At least one item is required');
    if (data.items.length > 100) throw new Error('Cannot have more than 100 items');
    const response = await apiClient.post('/orders', data);
    return response.data;
  },
  updateOrderStatus: async (id, status) => {
    if (!id) throw new Error('Order ID is required');
    if (!status) throw new Error('Status is required');
    const response = await apiClient.patch(`/orders/${id}/status`, { status });
    return response.data;
  },
  recordPayment: async (id, data) => {
    if (!id) throw new Error('Order ID is required');
    if (!data.amount || data.amount <= 0) throw new Error('Valid payment amount is required');
    if (!data.method) throw new Error('Payment method is required');
    const response = await apiClient.post(`/orders/${id}/payment`, data);
    return response.data;
  },
  confirmOrder: async (id) => {
    if (!id) throw new Error('Order ID is required');
    const response = await apiClient.patch(`/orders/${id}/confirm`);
    return response.data;
  },
  cancelOrder: async (id, reason) => {
    if (!id) throw new Error('Order ID is required');
    if (!reason || reason.length < 3) throw new Error('Reason must be at least 3 characters');
    const response = await apiClient.patch(`/orders/${id}/cancel`, { reason });
    return response.data;
  },

  // ----- PAYMENTS -----
  getPayments: async () => {
    try {
      const response = await apiClient.get('/payments');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
  },
  getPaymentsPage: async (queryString = '') => {
    const url = queryString ? `/payments?${queryString}` : '/payments';
    const response = await apiClient.get(url);
    return response.data;
  },

  // ----- SUPPLIERS -----
  getSuppliers: async () => {
    try {
      const response = await apiClient.get('/suppliers');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
  },
  getSuppliersPage: async (queryString = '') => {
    const url = queryString ? `/suppliers?${queryString}` : '/suppliers';
    const response = await apiClient.get(url);
    return response.data;
  },
  getSupplier: async (id) => {
    if (!id) throw new Error('Supplier ID is required');
    try {
      const response = await apiClient.get(`/suppliers/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching supplier:', error);
      throw error;
    }
  },
  createSupplier: async (data) => {
    if (!data.name) throw new Error('Supplier name is required');
    if (!data.phone) throw new Error('Phone number is required');
    try {
      const response = await apiClient.post('/suppliers', data);
      return response.data;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  },
  updateSupplier: async (id, data) => {
    if (!id) throw new Error('Supplier ID is required');
    try {
      const response = await apiClient.put(`/suppliers/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  },
  deleteSupplier: async (id) => {
    if (!id) throw new Error('Supplier ID is required');
    try {
      const response = await apiClient.delete(`/suppliers/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  },

// ----- PURCHASE ORDERS -----
  getPurchaseOrders: async () => {
    try {
      const response = await apiClient.get('/purchase-orders');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching POs:', error);
      return [];
    }
  },
  getPurchaseOrdersPage: async (queryString = '') => {
    const url = queryString ? `/purchase-orders?${queryString}` : '/purchase-orders';
    const response = await apiClient.get(url);
    return response.data;
  },
  getPurchaseOrder: async (id) => {
    if (!id) throw new Error('Purchase order ID is required');
    try {
      const response = await apiClient.get(`/purchase-orders/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching PO:', error);
      throw error;
    }
  },
  createPurchaseOrder: async (data) => {
    if (!data.supplier_id) throw new Error('Supplier is required');
    if (!data.items || data.items.length === 0) throw new Error('At least one item is required');
    if (data.items.length > 100) throw new Error('Cannot have more than 100 items');
    try {
      const response = await apiClient.post('/purchase-orders', data);
      return response.data;
    } catch (error) {
      console.error('Error creating PO:', error);
      throw error;
    }
  },
  updatePurchaseOrder: async (id, data) => {
    if (!id) throw new Error('Purchase order ID is required');
    try {
      console.log('📤 Updating PO:', id);
      const response = await apiClient.put(`/purchase-orders/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating PO:', error);
      throw error;
    }
  },
  receivePurchaseOrder: async (id) => {
    if (!id) throw new Error('Purchase order ID is required');
    try {
      const response = await apiClient.patch(`/purchase-orders/${id}/receive`);
      return response.data;
    } catch (error) {
      console.error('Error receiving PO:', error);
      throw error;
    }
  },
  deletePurchaseOrder: async (id) => {
    if (!id) throw new Error('Purchase order ID is required');
    try {
      const response = await apiClient.delete(`/purchase-orders/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting PO:', error);
      throw error;
    }
  },

  // ----- REPORTS -----
  getSalesReport: async (params) => {
    try {
      if (params.period === 'custom' && (!params.startDate || !params.endDate)) {
        throw new Error('Start date and end date are required for custom period');
      }
      const queryString = new URLSearchParams(params).toString();
      const response = await apiClient.get(`/reports/sales?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sales report:', error);
      throw error;
    }
  },
  getYearOverYear: async () => {
    try {
      const response = await apiClient.get('/reports/year-over-year');
      return response.data;
    } catch (error) {
      console.error('Error fetching year-over-year:', error);
      return { data: [] };
    }
  },
  getProfitReport: async (params) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await apiClient.get(`/reports/profit?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching profit report:', error);
      throw error;
    }
  },
  getInventoryReport: async () => {
    try {
      const response = await apiClient.get('/reports/inventory');
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory report:', error);
      throw error;
    }
  },

  // ----- AUDIT LOG -----
  getAuditLogs: async (params) => {
    try {
      if (params.page && (params.page < 1 || isNaN(params.page))) {
        throw new Error('Invalid page number');
      }
      if (params.limit && (params.limit < 1 || params.limit > 200 || isNaN(params.limit))) {
        throw new Error('Limit must be between 1 and 200');
      }
      const queryString = new URLSearchParams(params).toString();
      const response = await apiClient.get(`/audit/logs?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  },
  getAuditSummary: async () => {
    try {
      const response = await apiClient.get('/audit/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching audit summary:', error);
      return { data: { today: 0, week: 0, month: 0, topActions: [] } };
    }
  },

  // ----- EXPENSES -----
  getExpenses: async () => {
    try {
      const response = await apiClient.get('/expenses');
      if (response.data && response.data.data) {
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
  },
  getExpensesPage: async (queryString = '') => {
    const url = queryString ? `/expenses?${queryString}` : '/expenses';
    const response = await apiClient.get(url);
    return response.data;
  },
  getExpense: async (id) => {
    if (!id) throw new Error('Expense ID is required');
    try {
      const response = await apiClient.get(`/expenses/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching expense:', error);
      throw error;
    }
  },
  createExpense: async (data) => {
    if (!data.description) throw new Error('Description is required');
    if (!data.amount || data.amount <= 0) throw new Error('Valid amount is required');
    try {
      const response = await apiClient.post('/expenses', data);
      return response.data;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  },
  updateExpense: async (id, data) => {
    if (!id) throw new Error('Expense ID is required');
    try {
      const response = await apiClient.put(`/expenses/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  },
  deleteExpense: async (id) => {
    if (!id) throw new Error('Expense ID is required');
    try {
      const response = await apiClient.delete(`/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  },

  // ----- DASHBOARD -----
  getDashboardStats: async () => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      return response.data.data || {};
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        todaySales: 0,
        totalOrders: 0,
        lowStockItems: 0,
        totalCustomers: 0,
        recentOrders: [],
        lowStock: []
      };
    }
  },

  // ----- USERS (Staff Management) -----
  getUsers: async () => {
    try {
      const response = await apiClient.get('/users');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },
  getUser: async (id) => {
    if (!id) throw new Error('User ID is required');
    try {
      const response = await apiClient.get(`/users/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },
  createUser: async (data) => {
    if (!data.full_name) throw new Error('Full name is required');
    if (!data.email) throw new Error('Email is required');
    if (!data.password) throw new Error('Password is required');
    if (data.password.length < 6) throw new Error('Password must be at least 6 characters');
    try {
      const response = await apiClient.post('/users', data);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },
  updateUser: async (id, data) => {
    if (!id) throw new Error('User ID is required');
    try {
      const response = await apiClient.put(`/users/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },
  deleteUser: async (id) => {
    if (!id) throw new Error('User ID is required');
    try {
      const response = await apiClient.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },
  resetUserPassword: async (id, data) => {
    if (!id) throw new Error('User ID is required');
    if (!data.new_password || data.new_password.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }
    try {
      const response = await apiClient.patch(`/users/${id}/reset-password`, data);
      return response.data;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }
};

export default api;