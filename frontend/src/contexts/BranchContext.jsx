// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Branch Context
// Holds the currently active business and branch.
// Caches businesses in localStorage during login so page
// refreshes don't need a network round-trip.
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const BranchContext = createContext();

const readCachedBusinesses = () => {
  try {
    const raw = localStorage.getItem('businesses');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
};

// Only active branches can be selected.
const activeBranchesOf = (business) =>
  (business?.branches || []).filter(b => b.is_active !== false);

export const BranchProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [businesses, setBusinesses] = useState([]);
  const [activeBusinessId, setActiveBusinessId] = useState(null);
  const [activeBranchId, setActiveBranchId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setBusinesses([]);
      setActiveBusinessId(null);
      setActiveBranchId(null);
      setLoaded(false);
      return;
    }

    // Staff: scope comes from JWT, nothing to load
    if (!user.is_boss) {
      setActiveBusinessId(user.business_id || null);
      setActiveBranchId(user.branch_id || null);
      setLoaded(true);
      return;
    }

    const cached = readCachedBusinesses();

    const finishSetup = (list) => {
      const activeBusinesses = (list || []).filter(b => b.is_active !== false);
      setBusinesses(activeBusinesses);

      if (activeBusinesses.length === 0) {
        setActiveBusinessId(null);
        setActiveBranchId(null);
        setLoaded(true);
        return;
      }

      const savedBiz = localStorage.getItem('activeBusinessId');
      const savedBr = localStorage.getItem('activeBranchId');

      const bizMatch = activeBusinesses.find(b => b.id === savedBiz) || activeBusinesses[0];
      setActiveBusinessId(bizMatch.id);

      const activeBranches = activeBranchesOf(bizMatch);
      const brMatch = activeBranches.find(b => b.id === savedBr) || activeBranches[0];
      setActiveBranchId(brMatch?.id || null);

      setLoaded(true);
    };

    if (cached) {
      finishSetup(cached);
      return;
    }

    const load = async () => {
      try {
        const res = await api.auth.getMe();
        const list = res.businesses || [];
        localStorage.setItem('businesses', JSON.stringify(list));
        finishSetup(list);
      } catch (err) {
        console.error('BranchContext load error:', err);
        setLoaded(true);
      }
    };

    load();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (activeBusinessId) localStorage.setItem('activeBusinessId', activeBusinessId);
    if (activeBranchId) localStorage.setItem('activeBranchId', activeBranchId);
  }, [activeBusinessId, activeBranchId]);

  const switchBusiness = useCallback((businessId) => {
    const biz = businesses.find(b => b.id === businessId);
    if (!biz) return;
    setActiveBusinessId(biz.id);
    const activeBranches = activeBranchesOf(biz);
    setActiveBranchId(activeBranches[0]?.id || null);
  }, [businesses]);

  const switchBranch = useCallback((branchId) => {
    // Only allow switching to an active branch
    const biz = businesses.find(b => b.id === activeBusinessId);
    if (!biz) return;
    const activeBranches = activeBranchesOf(biz);
    if (!activeBranches.find(b => b.id === branchId)) return;
    setActiveBranchId(branchId);
  }, [businesses, activeBusinessId]);

  const refresh = useCallback(async () => {
    if (!user?.is_boss) return;
    try {
      const res = await api.auth.getMe();
      const list = res.businesses || [];
      // Cache the FULL list (Settings page needs to see inactive branches)
      localStorage.setItem('businesses', JSON.stringify(list));

      // State only holds active businesses
      const activeBusinesses = list.filter(b => b.is_active !== false);
      setBusinesses(activeBusinesses);

      // Re-pick business and branch, respecting saved selection when still valid
      const savedBiz = localStorage.getItem('activeBusinessId');
      const bizMatch = activeBusinesses.find(b => b.id === savedBiz) || activeBusinesses[0];
      if (!bizMatch) {
        setActiveBusinessId(null);
        setActiveBranchId(null);
        return;
      }
      setActiveBusinessId(bizMatch.id);

      const activeBranches = activeBranchesOf(bizMatch);
      const savedBr = localStorage.getItem('activeBranchId');
      const brMatch = activeBranches.find(b => b.id === savedBr) || activeBranches[0];
      setActiveBranchId(brMatch?.id || null);
    } catch (err) {
      console.error('BranchContext refresh error:', err);
    }
  }, [user]);

  const activeBusiness = businesses.find(b => b.id === activeBusinessId) || null;

  const value = {
    businesses,
    activeBusinessId,
    activeBranchId,
    activeBusiness,
    loaded,
    switchBusiness,
    switchBranch,
    refresh
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};

export default BranchContext;