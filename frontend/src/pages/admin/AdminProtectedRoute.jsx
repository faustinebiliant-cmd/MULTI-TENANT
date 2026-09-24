// ============================================================
// OSWAGO - Admin Protected Route
// Checks the admin JWT on mount and every 30 seconds.
// Redirects to /admin/login the moment the token expires.
// ============================================================

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Loader from '../../components/common/Loader';
import { useAdmin } from '../../contexts/AdminContext';

// Decode a JWT and return its payload, or null on failure.
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  if (!token) return true;
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  // 5-second buffer so we expire slightly early rather than
  // firing a request that is about to be rejected.
  return Date.now() >= decoded.exp * 1000 - 5000;
};

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAdmin();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    setValid(Boolean(token) && !isTokenExpired(token));
    setChecking(false);
  }, [location.pathname]);

  // Background timer: check every 30 seconds and redirect on expiry.
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('adminToken');
      if (!token || isTokenExpired(token)) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
        window.location.href = '/admin/login';
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (checking) {
    return <Loader fullPage message="" />;
  }

  if (!valid || !isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default AdminProtectedRoute;