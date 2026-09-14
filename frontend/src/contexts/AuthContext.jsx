// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Authentication Context (UPDATED)
// ============================================================

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const inactivityTimerRef = useRef(null);
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // ✅ CHECK TOKEN VALIDITY ON MOUNT
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        // Check if token is expired
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
          // Token expired - clear
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setIsAuthenticated(false);
        } else {
          // Token valid - restore session
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Invalid token - clear
        console.error('Error parsing user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // ✅ INACTIVITY TIMEOUT - Auto logout after 30 minutes of inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      inactivityTimerRef.current = setTimeout(() => {
        // Auto-logout due to inactivity
        console.log('Auto-logout due to inactivity');
        logout();
        toast.warning('Logged out due to inactivity. Please login again.');
      }, INACTIVITY_TIMEOUT);
    };

    // Reset timer on user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Start the timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [isAuthenticated]);

  // ✅ LOGIN WITH TOKEN EXPIRY CHECK
  const login = async (email, password) => {
    try {
      const response = await api.auth.login({ email, password });

      if (response.success) {
        const { token, user: userData } = response;

        // ✅ ONLY STORE ESSENTIAL USER DATA (Reduced for security)
        const minimalUser = {
          id: userData.id,
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          is_first_login: userData.is_first_login
        };

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(minimalUser));

        setUser(minimalUser);
        setIsAuthenticated(true);

        toast.success(`Welcome back, ${userData.full_name}!`);
        return { success: true };
      } else {
        toast.error(response.error || 'Login failed');
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // ✅ LOGOUT - Just clears state
  const logout = () => {
    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };

  // ✅ CHANGE PASSWORD
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });

      if (response.success) {
        toast.success('Password changed successfully');
        return { success: true };
      } else {
        toast.error(response.error || 'Failed to change password');
        return { success: false };
      }
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