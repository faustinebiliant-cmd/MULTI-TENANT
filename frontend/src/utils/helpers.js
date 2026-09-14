// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Helpers
// ============================================================

// Read EAT (UTC+3) wall-clock parts from a Date
const toEATParts = (date) => {
  const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes()
  };
};

// Normalize input to Date, assuming UTC if no zone suffix
const parseDate = (value) => {
  if (!value) return null;
  const safe = /Z$|[+-]\d{2}:?\d{2}$/.test(value) ? value : value + 'Z';
  const date = new Date(safe);
  return isNaN(date.getTime()) ? null : date;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Format: "13 Sep 2026, 10:59 AM"
export const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return '-';
  const t = toEATParts(date);
  const hour12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const ampm = t.hour < 12 ? 'AM' : 'PM';
  const hh = String(hour12).padStart(2, '0');
  const mm = String(t.minute).padStart(2, '0');
  return `${t.day} ${MONTHS[t.month]} ${t.year}, ${hh}:${mm} ${ampm}`;
};

// Format: "13 Sep 2026"
export const formatDateOnly = (value) => {
  const date = parseDate(value);
  if (!date) return '-';
  const t = toEATParts(date);
  return `${t.day} ${MONTHS[t.month]} ${t.year}`;
};

// Format: "TZS 1,500"
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') return 'TZS 0';
  return `TZS ${Number(amount).toLocaleString()}`;
};

// Status colors — fallback when CSS classes aren't available
export const getStatusColor = (status) => {
  const colors = {
    pending: '#b58a09',
    confirmed: '#0c39ce',
    delivered: '#08971d',
    cancelled: '#c40e0e',
    paid: '#0bc518',
    unpaid: '#d00f0f',
    partial: '#92400e',
    active: '#059669',
    inactive: '#dc2626'
  };
  return colors[status?.toLowerCase()] || '#6b7280';
};

// Human-readable status labels
export const getStatusLabel = (status) => {
  const labels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    paid: 'Paid',
    unpaid: 'Unpaid',
    partial: 'Partial',
    active: 'Active',
    inactive: 'Inactive'
  };
  return labels[status?.toLowerCase()] || status || '-';
};

// Compute initials from a name for avatars
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};