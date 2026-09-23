// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Subscription Context
// Tracks the active business's subscription state.
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { useBranch } from './BranchContext';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { activeBusinessId, loaded: branchLoaded } = useBranch();

  const [status, setStatus] = useState({
    subscription_status: null,
    trial_ends_at: null,
    days_remaining: 0,
    has_pending_submission: false,
    loaded: false
  });

  const load = useCallback(async () => {
    if (!isAuthenticated || !activeBusinessId) {
      setStatus((prev) => ({ ...prev, loaded: true }));
      return;
    }
    try {
      const data = await api.subscription.getStatus();
      setStatus({ ...data, loaded: true });
    } catch (error) {
      console.error('SubscriptionContext load error:', error);
      setStatus((prev) => ({ ...prev, loaded: true }));
    }
  }, [isAuthenticated, activeBusinessId]);

  useEffect(() => {
    // Wait until BranchContext has resolved the active business.
    if (!branchLoaded) return;
    // Only the Boss needs to see subscription data. Staff can skip.
    if (!user?.is_boss) {
      setStatus((prev) => ({ ...prev, loaded: true }));
      return;
    }
    load();
  }, [branchLoaded, user, load]);

  const refresh = useCallback(() => load(), [load]);

  return (
    <SubscriptionContext.Provider value={{ ...status, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export default SubscriptionContext;