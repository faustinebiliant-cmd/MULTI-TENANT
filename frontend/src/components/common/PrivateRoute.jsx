// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Private Route Component (UPDATED)
// ============================================================

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

// ✅ Helper function to check if token is expired
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
      // Add 5 second buffer to account for clock skew
      return Date.now() >= (decoded.exp * 1000) - 5000;
    }
    return false;
  } catch (error) {
    // Invalid token format
    return true;
  }
};

// ✅ Helper function to check token validity
const isValidToken = (token) => {
  if (!token) return false;
  if (token.split('.').length !== 3) return false; // JWT has 3 parts
  if (isTokenExpired(token)) return false;
  return true;
};

const PrivateRoute = ({ children }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    // ✅ Check if token is valid
    if (token && user && isValidToken(token)) {
      setIsAuthenticated(true);
    } else {
      // ✅ Clear invalid data
      if (token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      setIsAuthenticated(false);
    }
    setIsValidating(false);
  }, []);

  // ✅ Listen for storage events (logout in other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token' && !e.newValue) {
        setIsAuthenticated(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ✅ Show nothing while validating
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

  // ✅ If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ✅ If authenticated, render children
  return children;
};

export default PrivateRoute;