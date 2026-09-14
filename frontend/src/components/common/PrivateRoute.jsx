// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Private Route
// ============================================================

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

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
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user && isValidToken(token)) {
      setIsAuthenticated(true);
    } else {
      if (token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      setIsAuthenticated(false);
    }
    setIsValidating(false);
  }, []);

  // Sync logout across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        setIsAuthenticated(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (isValidating) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        minHeight: '100vh'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;