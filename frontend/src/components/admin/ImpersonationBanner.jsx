// ============================================================
// OSWAGO - Impersonation Banner
// Shows in the customer app when an admin is impersonating.
// Bright orange, sticky, with reason and End button.
// ============================================================

import React, { useState, useEffect } from 'react';
import { FiEye, FiX, FiClock } from 'react-icons/fi';
import adminApi from '../../api/adminClient';

const ImpersonationBanner = () => {
  const [session, setSession] = useState(null);
  const [minutesLeft, setMinutesLeft] = useState(0);

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

  const handleEnd = async (automatic = false) => {
    try {
      if (!automatic && session) {
        await adminApi.endImpersonation(session.session_id);
      }
    } catch (err) {
      console.error('Failed to end impersonation cleanly:', err);
    }
    localStorage.removeItem('impersonation');
    localStorage.removeItem('impersonationToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('businesses');
    localStorage.removeItem('activeBusinessId');
    localStorage.removeItem('activeBranchId');
    window.location.href = '/admin/businesses';
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