// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Auth Context
// ============================================================

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { warningToast } from '../utils/toastHelpers';

const AuthContext = createContext();

// Auto-logout after 30 minutes of inactivity
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const inactivityTimerRef = useRef(null);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);

        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
        } else {
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error parsing user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Inactivity auto-logout
  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        logout();
        warningToast('Logged out due to inactivity. Please login again.');
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated]);

  // Login
  const login = async (email, password) => {
    try {
      const response = await api.auth.login({ email, password });

      if (response.success) {
        const { token, user: userData, businesses } = response;

        const minimalUser = {
          id: userData.id,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          is_first_login: userData.is_first_login,
          is_boss: userData.is_boss === true,
          business_id: userData.business_id || null,
          branch_id: userData.branch_id || null,
          account_code: userData.account_code || null
        };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(minimalUser));

        // Cache the businesses list so BranchContext doesn't have to
        // re-fetch /auth/me on every page refresh.
        if (Array.isArray(businesses)) {
          localStorage.setItem('businesses', JSON.stringify(businesses));
        }

        setUser(minimalUser);
        setIsAuthenticated(true);

        toast.success(`Welcome back, ${userData.full_name}`);
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      return { success: false, error: errorMessage };
    }
  };

  // Signup
  const signup = async (payload) => {
    try {
      const response = await api.auth.signup(payload);

      if (response.success) {
        const { token, user: userData, businesses } = response;

        const minimalUser = {
          id: userData.id,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          is_first_login: userData.is_first_login,
          is_boss: userData.is_boss === true,
          business_id: userData.business_id || null,
          branch_id: userData.branch_id || null,
          account_code: userData.account_code || null
        };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(minimalUser));

        if (Array.isArray(businesses)) {
          localStorage.setItem('businesses', JSON.stringify(businesses));
        }

        setUser(minimalUser);
        setIsAuthenticated(true);

        toast.success(`Welcome, ${userData.full_name}`);
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.error || 'Signup failed. Please try again.';
      return { success: false, error: errorMessage };
    }
  };

  // Logout
  const logout = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('businesses');
    localStorage.removeItem('activeBusinessId');
    localStorage.removeItem('activeBranchId');
    // Clear any leftover impersonation state so a stale banner
    // cannot survive a normal logout/login cycle.
    localStorage.removeItem('impersonation');
    localStorage.removeItem('impersonationToken');
    localStorage.removeItem('impersonationReturnTo');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });

      if (response.success) {
        toast.success('Password changed successfully');
        return { success: true };
      }
      toast.error(response.error || 'Failed to change password');
      return { success: false };
    } catch (error) {
      console.error('Change password error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to change password';
      toast.error(errorMessage);
      return { success: false };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    signup,
    logout,
    changePassword,
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;