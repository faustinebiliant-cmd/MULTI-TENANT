// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Confirm Dialog
// ============================================================

import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

const ConfirmDialog = ({
  open,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel
}) => {
  if (!open) return null;

  const confirmClass = variant === 'danger' ? 'btn btn-danger' : 'btn btn-primary';

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onCancel}>
      <div className="modal-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <div className={`confirm-dialog-icon confirm-dialog-icon--${variant}`}>
            <FiAlertCircle size={20} />
          </div>
          <h3>{title}</h3>
        </div>

        <p className="confirm-dialog-message">{message}</p>

        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;