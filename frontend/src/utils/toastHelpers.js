// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Toast Helpers
// react-hot-toast has no toast.warning(). This adds one that
// uses the amber style already defined in toastConfig.js.
// ============================================================

import toast from 'react-hot-toast';
import { toastOptions } from '../styles/toastConfig';

export const warningToast = (message) =>
  toast(message, {
    icon: '!',
    duration: toastOptions.warning.duration,
    style: toastOptions.warning.style
  });