// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Business & Branch Switchers
// Shared component used in two places:
//   * variant="header"   → desktop header (top bar)
//   * variant="sidebar"  → mobile sidebar drawer
// Only Boss users see switchers. Staff scope is fixed from JWT.
// ============================================================

import React from 'react';
import { useBranch } from '../../contexts/BranchContext';

const Switchers = ({ variant = 'header' }) => {
  const {
    businesses,
    activeBusinessId,
    activeBusiness,
    activeBranchId,
    switchBusiness,
    switchBranch
  } = useBranch();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBoss = user.is_boss === true;

  if (!isBoss || businesses.length === 0) return null;

  const branches = (activeBusiness?.branches || []).filter(b => b.is_active !== false);

  const wrapperClass =
    variant === 'sidebar' ? 'sidebar-switchers' : 'header-switchers';
  const groupClass =
    variant === 'sidebar' ? 'sidebar-switcher-group' : 'header-switcher-group';
  const selectClass =
    variant === 'sidebar' ? 'sidebar-switcher-select' : 'header-switcher';
  const labelClass =
    variant === 'sidebar' ? 'sidebar-switcher-label' : 'header-switcher-label';

  return (
    <div className={wrapperClass}>
      {businesses.length > 1 && (
        <div className={groupClass}>
          {variant === 'sidebar' && (
            <span className={labelClass}>Business</span>
          )}
          <select
            className={selectClass}
            value={activeBusinessId || ''}
            onChange={(e) => switchBusiness(e.target.value)}
            title="Switch business"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {branches.length > 1 && (
        <div className={groupClass}>
          {variant === 'sidebar' && (
            <span className={labelClass}>Branch</span>
          )}
          <select
            className={selectClass}
            value={activeBranchId || ''}
            onChange={(e) => switchBranch(e.target.value)}
            title="Switch branch"
          >
            {branches.map((br) => (
              <option key={br.id} value={br.id}>{br.name}</option>
            ))}
          </select>
        </div>
      )}

      {branches.length === 1 && variant === 'header' && (
        <span className="header-branch-label">{branches[0].name}</span>
      )}

      {branches.length === 1 && variant === 'sidebar' && (
        <div className={groupClass}>
          <span className={labelClass}>Tawi</span>
          <span className="sidebar-branch-label">{branches[0].name}</span>
        </div>
      )}
    </div>
  );
};

export default Switchers;