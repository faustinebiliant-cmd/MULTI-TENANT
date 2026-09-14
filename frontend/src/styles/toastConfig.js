// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Toast Configuration
// ============================================================

// Centralized toast config — used by <Toaster> in App.js
export const toastOptions = {
  duration: 3000,
  style: {
    background: '#0f172a',
    color: '#f1f5f9',
    borderRadius: '10px',
    padding: '12px 18px',
    fontSize: '13.5px',
    fontWeight: 500,
    boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.35)'
  },
  success: {
    duration: 3000,
    iconTheme: { primary: '#10b981', secondary: '#f1f5f9' }
  },
  error: {
    duration: 5000,
    iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' }
  },
  loading: {
    iconTheme: { primary: '#3b82f6', secondary: '#f1f5f9' }
  }
};

// Standard toast messages — keeps copy consistent
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