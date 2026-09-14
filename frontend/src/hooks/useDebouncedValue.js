// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - useDebouncedValue Hook
// ============================================================

import { useEffect, useState } from 'react';

// Returns a debounced value, default delay 400ms
const useDebouncedValue = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebouncedValue;