// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Loader
// ============================================================

import React from 'react';

// Inline loader (default) centers inside its parent container.
// Set fullPage to true to center on the whole viewport.
const Loader = ({ message = 'Loading...', fullPage = false }) => {
  if (fullPage) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '14px'
        }}
      >
        <div className="spinner"></div>
        {message && <p className="loader-text">{message}</p>}
      </div>
    );
  }

  return (
    <div className="loader-container">
      <div className="spinner"></div>
      {message && <p className="loader-text">{message}</p>}
    </div>
  );
};

export default Loader;