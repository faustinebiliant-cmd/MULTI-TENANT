// ============================================================
// OSWAGO - Admin Context
// Separate from customer AuthContext. Uses adminToken.
// ============================================================

import React, { createContext, useState, useContext, useEffect } from 'react';
import adminApi from '../api/adminClient';
import toast from 'react-hot-toast';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const stored = localStorage.getItem('admin');

    if (token && stored) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('admin');
        } else {
          setAdmin(JSON.parse(stored));
          setIsAuthenticated(true);
        }
      } catch (err) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await adminApi.login(email, password);
      if (res.success) {
        localStorage.setItem('adminToken', res.token);
        localStorage.setItem('admin', JSON.stringify(res.admin));
        setAdmin(res.admin);
        setIsAuthenticated(true);
        toast.success(`Welcome, ${res.admin.full_name}`);
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (error) {
      const msg = error.response?.data?.error || 'Login failed';
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    setAdmin(null);
    setIsAuthenticated(false);
  };

  return (
    <AdminContext.Provider value={{ admin, loading, isAuthenticated, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
};

export default AdminContext;