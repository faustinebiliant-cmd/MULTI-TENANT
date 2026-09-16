// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Private Route
// ============================================================

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Loader from './Loader';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';

// Check if token is expired (5s clock buffer)
const isTokenExpired = (token) => {
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
    if (decoded.exp) {
      return Date.now() >= (decoded.exp * 1000) - 5000;
    }
    return false;
  } catch {
    return true;
  }
};

const isValidToken = (token) => {
  if (!token) return false;
  if (token.split('.').length !== 3) return false;
  if (isTokenExpired(token)) return false;
  return true;
};

const PrivateRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { loaded: branchLoaded } = useBranch();
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthValid, setIsAuthValid] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser && isValidToken(token)) {
      setIsAuthValid(true);
    } else {
      if (token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      setIsAuthValid(false);
    }
    setIsValidating(false);
  }, []);

  // Sync logout across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        setIsAuthValid(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (isValidating || (isAuthenticated && !branchLoaded)) {
    return <Loader fullPage message="" />;
  }

  if (!isAuthValid || !isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;