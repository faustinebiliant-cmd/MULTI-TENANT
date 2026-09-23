// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Layout
// ============================================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import InactiveBranchNotice from './InactiveBranchNotice';
import ImpersonationBanner from '../admin/ImpersonationBanner';
import TrialBanner from '../subscription/TrialBanner';
import { useBranch } from '../../contexts/BranchContext';

const Layout = () => {
  const { activeBusinessId, activeBranchId, activeBusiness, loaded } = useBranch();

  const branches = activeBusiness?.branches || [];
  const activeBranch = branches.find(b => b.id === activeBranchId);
  const branchIsInactive = loaded && activeBranch && activeBranch.is_active !== true;

  const pageKey = `${activeBusinessId || 'none'}::${activeBranchId || 'none'}`;

  return (
    <>
      <ImpersonationBanner />
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Header />
          <TrialBanner />
          {branchIsInactive ? (
            <InactiveBranchNotice />
          ) : (
            <Outlet key={pageKey} />
          )}
        </div>
      </div>
    </>
  );
};

export default Layout;