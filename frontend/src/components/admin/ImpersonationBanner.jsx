// ============================================================
// OSWAGO - Impersonation Banner
// Shows in the customer app when an admin is impersonating.
// Bright orange, sticky, with reason and End button.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { FiEye, FiX, FiClock } from 'react-icons/fi';
import api from '../../api/client';

const ImpersonationBanner = () => {
  const [session, setSession] = useState(null);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const endingRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('impersonation');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.session_id) setSession(parsed);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!session) return;

    const update = () => {
      const left = Math.max(0, Math.floor((new Date(session.expires_at) - Date.now()) / 60000));
      setMinutesLeft(left);
      if (left === 0) handleEnd(true);
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [session]);

  // Reads the path saved before impersonation started.
  // Falls back to /admin/businesses if none was saved.
  const getReturnPath = () => {
    const saved = localStorage.getItem('impersonationReturnTo');
    return saved && saved.startsWith('/admin') ? saved : '/admin/businesses';
  };

  const handleEnd = async (automatic = false) => {
    if (endingRef.current) return;
    endingRef.current = true;

    const returnTo = getReturnPath();

    try {
      if (!automatic && session) {
        await api.auth.endImpersonation();
      }
    } catch (err) {
      // Session may already be ended or expired server-side.
      // Either way, we still clear local state and exit.
      console.error('Failed to end impersonation cleanly:', err);
    }

    localStorage.removeItem('impersonation');
    localStorage.removeItem('impersonationToken');
    localStorage.removeItem('impersonationReturnTo');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('businesses');
    localStorage.removeItem('activeBusinessId');
    localStorage.removeItem('activeBranchId');

    window.location.href = returnTo;
  };

  if (!session) return null;

  return (
    <div className="impersonation-banner">
      <div className="impersonation-banner-left">
        <FiEye size={18} />
        <div>
          <strong>Impersonating: {session.business_name}</strong>
          <span>As {session.boss_email} · Reason: {session.reason}</span>
        </div>
      </div>
      <div className="impersonation-banner-right">
        <span className="impersonation-timer">
          <FiClock size={14} /> {minutesLeft} min left
        </span>
        <button className="impersonation-end" onClick={() => handleEnd(false)}>
          <FiX size={14} /> End impersonation
        </button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;