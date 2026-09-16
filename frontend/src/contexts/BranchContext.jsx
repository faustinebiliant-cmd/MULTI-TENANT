// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Branch Context
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [businesses, setBusinesses] = useState([]);
  const [activeBusinessId, setActiveBusinessId] = useState(null);
  const [activeBranchId, setActiveBranchId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // ---------------------------------------------------------
  // Load businesses on login. Boss gets all; staff gets none
  // (staff don't switch, their scope is fixed by JWT).
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setBusinesses([]);
      setActiveBusinessId(null);
      setActiveBranchId(null);
      setLoaded(false);
      return;
    }

    if (!user.is_boss) {
      // Staff: their scope comes from JWT, nothing to load
      setActiveBusinessId(user.business_id || null);
      setActiveBranchId(user.branch_id || null);
      setLoaded(true);
      return;
    }

    const load = async () => {
      try {
        const res = await api.auth.getMe();
        const list = res.businesses || [];
        setBusinesses(list);

        if (list.length === 0) {
          setActiveBusinessId(null);
          setActiveBranchId(null);
          setLoaded(true);
          return;
        }

        // Restore from localStorage, else pick first business + its first branch
        const savedBiz = localStorage.getItem('activeBusinessId');
        const savedBr = localStorage.getItem('activeBranchId');

        const bizMatch = list.find(b => b.id === savedBiz) || list[0];
        setActiveBusinessId(bizMatch.id);

        const branches = bizMatch.branches || [];
        const brMatch = branches.find(b => b.id === savedBr) || branches[0];
        setActiveBranchId(brMatch?.id || null);
      } catch (err) {
        console.error('BranchContext load error:', err);
      } finally {
        setLoaded(true);
      }
    };

    load();
  }, [isAuthenticated, user]);

  // ---------------------------------------------------------
  // Persist selection
  // ---------------------------------------------------------
  useEffect(() => {
    if (activeBusinessId) localStorage.setItem('activeBusinessId', activeBusinessId);
    if (activeBranchId) localStorage.setItem('activeBranchId', activeBranchId);
  }, [activeBusinessId, activeBranchId]);

  const switchBusiness = useCallback((businessId) => {
    const biz = businesses.find(b => b.id === businessId);
    if (!biz) return;
    setActiveBusinessId(biz.id);
    const firstBranch = (biz.branches || [])[0];
    setActiveBranchId(firstBranch?.id || null);
  }, [businesses]);

  const switchBranch = useCallback((branchId) => {
    setActiveBranchId(branchId);
  }, []);

  const activeBusiness = businesses.find(b => b.id === activeBusinessId) || null;

  const value = {
    businesses,
    activeBusinessId,
    activeBranchId,
    activeBusiness,
    loaded,
    switchBusiness,
    switchBranch
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