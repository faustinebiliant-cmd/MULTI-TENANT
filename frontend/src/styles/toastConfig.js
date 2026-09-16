// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Toast Configuration
// Modern, professional toast styling for react-hot-toast
// ============================================================

// Centralized toast config — used by <Toaster> in App.js
export const toastOptions = {
  duration: 3500,
  position: 'top-right',

  // Base style applied to every toast
  style: {
    background: '#ffffff',
    color: '#1e293b',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '14px 18px',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '-0.01em',
    boxShadow:
      '0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.06)',
    maxWidth: '380px'
  },

  // Success — calm, confident green accent
  success: {
    duration: 3000,
    iconTheme: { primary: '#10b981', secondary: '#ffffff' },
    style: {
      background: '#ffffff',
      color: '#065f46',
      border: '1px solid #d1fae5'
    }
  },

  // Error — clear but not alarming red accent
  error: {
    duration: 5000,
    iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
    style: {
      background: '#ffffff',
      color: '#991b1b',
      border: '1px solid #fee2e2'
    }
  },

  // Loading — neutral blue accent, no fixed duration (dismissed programmatically)
  loading: {
    iconTheme: { primary: '#3b82f6', secondary: '#ffffff' },
    style: {
      background: '#ffffff',
      color: '#1e3a8a',
      border: '1px solid #dbeafe'
    }
  },

  // Custom warning variant — use with toast(msg, { style: toastOptions.warning.style, icon: '⚠️' })
  warning: {
    duration: 4000,
    iconTheme: { primary: '#f59e0b', secondary: '#ffffff' },
    style: {
      background: '#ffffff',
      color: '#92400e',
      border: '1px solid #fef3c7'
    }
  }
};

// Standard toast messages — keeps copy consistent across the app
export const toastMessages = {
  saved: 'Changes saved',
  created: 'Created successfully',
  updated: 'Updated successfully',
  deleted: 'Deleted successfully',
  loadFailed: 'Failed to load data',
  saveFailed: 'Failed to save changes',
  deleteFailed: 'Failed to delete',
  networkError: 'Network error. Check your connection.',
  permissionDenied: 'You do not have permission to do that.'
};