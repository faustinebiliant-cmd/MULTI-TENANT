// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Shop Context
// Reads the active business (name, location, VAT, TIN/VRN).
// Refreshes when the Boss switches business.
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { useBranch } from './BranchContext';

const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { activeBusinessId } = useBranch();

  const [shop, setShop] = useState({
    appName: 'OSWAGO',
    location: '',
    phone: '',
    email: '',
    currency: 'TZS',
    vatEnabled: false,
    vatRate: 18,
    tin: '',
    vrn: '',
    expenseCategories: [],
    loaded: false
  });

  const parseExpenseCategories = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not JSON
    }
    return [];
  };

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getBusiness();
      if (!data || !data.id) {
        setShop((prev) => ({ ...prev, loaded: true }));
        return;
      }

      setShop({
        appName: data.shopName || data.shop_name || data.name || 'OSWAGO',
        location: data.location || '',
        phone: data.phone || '',
        email: data.email || '',
        currency: data.currency || 'TZS',
        vatEnabled: data.vat_enabled === true,
        vatRate: parseFloat(data.vat_rate) || 18,
        tin: data.tin || '',
        vrn: data.vrn || '',
        expenseCategories: parseExpenseCategories(data.expense_categories),
        loaded: true
      });
    } catch (error) {
      console.error('ShopContext load error:', error);
      setShop((prev) => ({ ...prev, loaded: true }));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    load();
  }, [load, activeBusinessId]);

  const refresh = () => load();

  return (
    <ShopContext.Provider value={{ ...shop, refresh }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};

export default ShopContext;