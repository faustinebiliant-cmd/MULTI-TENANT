// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Layout
// Renders the shell. If the active branch is inactive,
// shows a clean notice instead of the current page so no
// API calls fire against a deactivated scope.
// ============================================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import InactiveBranchNotice from './InactiveBranchNotice';
import { useBranch } from '../../contexts/BranchContext';

const Layout = () => {
  const { activeBusinessId, activeBranchId, activeBusiness, loaded } = useBranch();

  // Determine if the active branch is inactive.
  // Only relevant once BranchContext has loaded.
  const branches = activeBusiness?.branches || [];
  const activeBranch = branches.find(b => b.id === activeBranchId);
  const branchIsInactive = loaded && activeBranch && activeBranch.is_active !== true;

  // Remounts the page when the business or branch changes.
  const pageKey = `${activeBusinessId || 'none'}::${activeBranchId || 'none'}`;

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        {branchIsInactive ? (
          <InactiveBranchNotice />
        ) : (
          <Outlet key={pageKey} />
        )}
      </div>
    </div>
  );
};

export default Layout;