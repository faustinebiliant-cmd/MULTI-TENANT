// ============================================================
// OSWAGO - Admin API Client
// Separate from the customer client. Uses adminToken.
// ============================================================

import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const adminClient = axios.create({
  baseURL: `${API_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  timeout: 15000
});

adminClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

adminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('admin');
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }

    if (status === 429) {
      toast.error(error.response?.data?.error || 'Too many requests.');
    }
    if (error.code === 'ERR_NETWORK') {
      toast.error('Network error.');
    }

    return Promise.reject(error);
  }
);

const adminApi = {
  login: async (email, password) => {
    const res = await adminClient.post('/login', { email, password });
    return res.data;
  },

  me: async () => {
    const res = await adminClient.get('/me');
    return res.data;
  },

  metrics: async () => {
    const res = await adminClient.get('/metrics');
    return res.data.data || {};
  },

  businesses: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await adminClient.get(`/businesses${qs ? '?' + qs : ''}`);
    return res.data;
  },

  businessDetail: async (id) => {
    const res = await adminClient.get(`/businesses/${id}`);
    return res.data.data;
  },

  customers: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await adminClient.get(`/customers${qs ? '?' + qs : ''}`);
    return res.data;
  },

  customerDetail: async (id) => {
    const res = await adminClient.get(`/customers/${id}`);
    return res.data.data;
  },

  suspendBusiness: async (id, reason) => {
    const res = await adminClient.patch(`/businesses/${id}/suspend`, { reason });
    return res.data;
  },

  unsuspendBusiness: async (id, reason) => {
    const res = await adminClient.patch(`/businesses/${id}/unsuspend`, { reason });
    return res.data;
  },

  resetUserPassword: async (id, newPassword, reason) => {
    const res = await adminClient.patch(`/users/${id}/reset-password`, {
      new_password: newPassword,
      reason
    });
    return res.data;
  },

  startImpersonation: async (bossUserId, businessId, reason) => {
    const res = await adminClient.post('/impersonate', {
      boss_user_id: bossUserId,
      business_id: businessId,
      reason
    });
    return res.data;
  },

  endImpersonation: async (sessionId) => {
    const res = await adminClient.post('/impersonate/end', { session_id: sessionId });
    return res.data;
  },

  auditLogs: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await adminClient.get(`/audit-logs${qs ? '?' + qs : ''}`);
    return res.data;
  }
};

export default adminApi;