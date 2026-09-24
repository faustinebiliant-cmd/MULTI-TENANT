// ============================================================
// OSWAGO - Subscription display helpers
// Turns the backend subscription object into admin-friendly
// labels, detail lines, and color tones.
// ============================================================

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const formatSubscriptionLabel = (subscription) => {
  if (!subscription) return '—';
  const status = subscription.status || 'trial';
  const map = {
    trial: 'Trial',
    active: 'Active',
    expired: 'Expired',
    suspended: 'Suspended'
  };
  return map[status] || status;
};

export const formatSubscriptionDetail = (subscription) => {
  if (!subscription) return '';

  const status = subscription.status || 'trial';
  const remaining = subscription.days_remaining ?? 0;
  const total = subscription.days_total ?? 0;

  // Suspended: no days matter
  if (status === 'suspended') {
    return 'Suspended by admin';
  }

  // Expired (or trial ended): show how long ago
  if (remaining <= 0 || status === 'expired') {
    if (!subscription.ends_at) return 'No period set';
    const end = new Date(subscription.ends_at + 'T23:59:59.999Z');
    const diff = Math.floor((Date.now() - end.getTime()) / MS_PER_DAY);
    if (diff <= 0) return 'ending today';
    if (diff === 1) return 'ended 1 day ago';
    return `ended ${diff} days ago`;
  }

  // Active or in-progress trial: "X of Y days left"
  if (total > 0) {
    return `${remaining} of ${total} days left`;
  }

  // Fallback: no total tracked
  return `${remaining} day${remaining === 1 ? '' : 's'} left`;
};

export const getSubscriptionTone = (subscription) => {
  if (!subscription) return 'neutral';
  const status = subscription.status || 'trial';
  const remaining = subscription.days_remaining ?? 0;

  if (status === 'suspended') return 'neutral';
  if (status === 'expired') return 'danger';
  if (remaining <= 0) return 'danger';
  if (status === 'trial' && remaining <= 7) return 'warning';
  if (status === 'active' && remaining <= 30) return 'warning';
  if (status === 'trial') return 'neutral';
  return 'success';
};

export const hasPendingPayment = (subscription) =>
  subscription?.has_pending_submission === true;