// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Shop Context
// Reads the active business (name, VAT, TIN/VRN, currency) and
// the active branch (location, phone, email).
// Refreshes when the Boss switches business or branch.
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { useBranch } from './BranchContext';

const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { activeBusinessId, activeBranchId, activeBusiness } = useBranch();

  const [shop, setShop] = useState({
    // Business-level identity
    appName: 'OSWAGO',
    businessName: '',
    // Branch-level identity — fallback to business when no branch is active
    location: '',
    phone: '',
    email: '',
    // Business-level settings
    currency: 'TZS',
    vatEnabled: false,
    vatRate: 18,
    tin: '',
    vrn: '',
    expenseCategories: [],
    quickSaleEnabled: false,
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

      // Find the active branch in the returned business data, so we can
      // display the branch's location/phone/email instead of the business's.
      // If the active branch isn't found (or has empty fields), fall back
      // to the business-level values.
      const branches = data.branches || [];
      const activeBranch = branches.find((b) => b.id === activeBranchId);

      const branchLocation = activeBranch?.location?.trim();
      const branchPhone = activeBranch?.phone?.trim();
      const branchEmail = activeBranch?.email?.trim();

      setShop({
        appName: data.shopName || data.shop_name || data.name || 'OSWAGO',
        businessName: data.name || '',

        // Branch values take precedence; business values are the fallback
        location: branchLocation || data.location || '',
        phone: branchPhone || data.phone || '',
        email: branchEmail || data.email || '',

        currency: data.currency || 'TZS',
        vatEnabled: data.vat_enabled === true,
        vatRate: parseFloat(data.vat_rate) || 18,
        tin: data.tin || '',
        vrn: data.vrn || '',
        expenseCategories: parseExpenseCategories(data.expense_categories),
        quickSaleEnabled: data.quick_sale_enabled === true,
        loaded: true
      });
    } catch (error) {
      console.error('ShopContext load error:', error);
      setShop((prev) => ({ ...prev, loaded: true }));
    }
  }, [isAuthenticated, activeBranchId]);

  useEffect(() => {
    load();
  }, [load, activeBusinessId, activeBranchId]);

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