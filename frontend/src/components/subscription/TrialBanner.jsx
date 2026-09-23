// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Trial Banner
// Small strip at the top of the app. Boss only.
// No dismiss — always visible until the business is active.
// ============================================================

import React, { useState } from 'react';
import { FiClock } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import SubscribeModal from './SubscribeModal';

const TrialBanner = () => {
  const { user } = useAuth();
  const {
    subscription_status,
    days_remaining,
    has_pending_submission,
    loaded,
    refresh
  } = useSubscription();

  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const handleSubmitSuccess = async () => {
    setShowModal(false);
    await refresh();
  };

  // Nothing to show yet, or not the Boss.
  if (!loaded || !user?.is_boss) return null;

  // Paid — hide completely.
  if (subscription_status === 'active') return null;

  // Suspended — always visible.
  if (subscription_status === 'suspended') {
    return (
      <div style={styles.suspended}>
        <span>Your account is suspended. Please contact support.</span>
      </div>
    );
  }

  // Trial or expired — pick the color from days_remaining.
  const expired = days_remaining <= 0 || subscription_status === 'expired';
  const warning = !expired && days_remaining <= 7;
  const tone = expired ? styles.expired : warning ? styles.warning : styles.trial;

  const label = expired
    ? 'Your free trial has ended'
    : `Free trial: ${days_remaining} day${days_remaining === 1 ? '' : 's'} remaining`;

  return (
    <>
      <div style={tone}>
        <span style={styles.text}>
          <FiClock size={14} />
          {label}
        </span>

        <span style={styles.right}>
          {has_pending_submission ? (
            <span style={styles.pendingText}>Payment under review</span>
          ) : (
            <button type="button" style={styles.subscribeBtn} onClick={handleOpenModal}>
              Subscribe
            </button>
          )}
        </span>
      </div>

      {showModal && (
        <SubscribeModal
          onClose={handleCloseModal}
          onSuccess={handleSubmitSuccess}
        />
      )}
    </>
  );
};

const base = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 500,
  borderRadius: '8px',
  marginBottom: '16px'
};

const styles = {
  trial: {
    ...base,
    background: '#eff6ff',
    color: '#1e40af',
    border: '1px solid #bfdbfe'
  },
  warning: {
    ...base,
    background: '#fffbeb',
    color: '#92400e',
    border: '1px solid #fde68a'
  },
  expired: {
    ...base,
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  },
  suspended: {
    ...base,
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca'
  },
  text: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  },
  right: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  },
  pendingText: {
    fontSize: '12px',
    fontWeight: 600,
    opacity: 0.85
  },
  subscribeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    fontSize: '13px',
    fontWeight: 700,
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: '2px 4px'
  }
};

export default TrialBanner;