// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Helpers
// ============================================================

// Shift a Date by +3h and read UTC parts (EAT is UTC+3, no DST)
const toEATParts = (date) => {
  const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Format "13 Sep 2026, 10:59 AM" in EAT
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const safe = /Z$|[+-]\d{2}:?\d{2}$/.test(dateString) ? dateString : dateString + 'Z';
  const date = new Date(safe);
  if (isNaN(date.getTime())) return '-';
  const t = toEATParts(date);
  const hour12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const ampm = t.hour < 12 ? 'AM' : 'PM';
  const hh = String(hour12).padStart(2, '0');
  const mm = String(t.minute).padStart(2, '0');
  return `${t.day} ${MONTHS[t.month]} ${t.year}, ${hh}:${mm} ${ampm}`;
};

// Format "13 Sep 2026" in EAT
export const formatDateOnly = (dateString) => {
  if (!dateString) return '-';
  const safe = /Z$|[+-]\d{2}:?\d{2}$/.test(dateString) ? dateString : dateString + 'Z';
  const date = new Date(safe);
  if (isNaN(date.getTime())) return '-';
  const t = toEATParts(date);
  return `${t.day} ${MONTHS[t.month]} ${t.year}`;
};

// Format TZS currency
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'TZS 0';
  return `TZS ${Number(amount).toLocaleString()}`;
};

// Status colour
export const getStatusColor = (status) => {
  const colors = {
    pending: '#f59e0b', confirmed: '#3b82f6', delivered: '#10b981', cancelled: '#ef4444',
    paid: '#10b981', unpaid: '#ef4444', partial: '#f59e0b', active: '#10b981', inactive: '#ef4444'
  };
  return colors[status?.toLowerCase()] || '#6b7280';
};

// Status label
export const getStatusLabel = (status) => {
  const labels = {
    pending: 'Pending', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled',
    paid: 'Paid', unpaid: 'Unpaid', partial: 'Partial', active: 'Active', inactive: 'Inactive'
  };
  return labels[status?.toLowerCase()] || status || '-';
};

// Generate order number
export const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `ORD-${year}${month}${day}-${random}`;
};