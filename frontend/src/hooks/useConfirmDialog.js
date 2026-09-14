// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - useConfirmDialog Hook
// ============================================================

import { useCallback, useState } from 'react';

// Promise-based confirmation. Pair with <ConfirmDialog> in Phase 6.
const useConfirmDialog = () => {
  const [state, setState] = useState({
    open: false,
    options: {},
    resolve: null
  });

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        options: {
          title: options.title || 'Confirm',
          message: options.message || 'Are you sure?',
          confirmLabel: options.confirmLabel || 'Confirm',
          cancelLabel: options.cancelLabel || 'Cancel',
          variant: options.variant || 'primary'
        },
        resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ open: false, options: {}, resolve: null });
  }, [state]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ open: false, options: {}, resolve: null });
  }, [state]);

  return {
    confirm,
    dialogProps: {
      open: state.open,
      ...state.options,
      onConfirm: handleConfirm,
      onCancel: handleCancel
    }
  };
};

export default useConfirmDialog;