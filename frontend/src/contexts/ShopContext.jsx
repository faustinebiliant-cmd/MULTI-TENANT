// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Shop Context
// ============================================================
// Loads shop identity and config from the settings table once.
// Components read from here instead of hardcoded constants.

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
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
    return String(value).split(',').map(s => s.trim()).filter(Boolean);
  };

  const load = async () => {
    try {
      const data = await api.getSettings();
      setShop({
        appName: data.shopName || 'OSWAGO',
        location: data.location || '',
        phone: data.phone || '',
        email: data.email || '',
        currency: data.currency || 'TZS',
        vatEnabled: data.vat_enabled === 'true' || data.vat_enabled === true,
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
  };

  useEffect(() => {
    load();
  }, []);

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