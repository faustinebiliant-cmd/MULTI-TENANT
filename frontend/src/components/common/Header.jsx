// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Header
// Boss gets business + branch switchers.
// Staff just see identity.
// ============================================================

import React from 'react';
import { FiUser, FiBell } from 'react-icons/fi';
import { useShop } from '../../contexts/ShopContext';
import { useBranch } from '../../contexts/BranchContext';
import { ROLE_META } from '../../utils/constants';

const getRoleColor = (role) => {
  const meta = ROLE_META[role];
  return meta ? meta.color : '#6b7280';
};

const Header = () => {
  const { appName, location } = useShop();
  const {
    businesses,
    activeBusinessId,
    activeBranchId,
    activeBusiness,
    switchBusiness,
    switchBranch
  } = useBranch();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBoss = user.is_boss === true;
  const branches = activeBusiness?.branches || [];

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">{appName}</h1>
        <span className="header-location">{location}</span>
      </div>

      <div className="header-right">
        {isBoss && businesses.length > 0 && (
          <div className="header-switchers">
            {businesses.length > 1 && (
              <select
                className="header-switcher"
                value={activeBusinessId || ''}
                onChange={(e) => switchBusiness(e.target.value)}
                title="Switch business"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}

            {branches.length > 1 && (
              <select
                className="header-switcher"
                value={activeBranchId || ''}
                onChange={(e) => switchBranch(e.target.value)}
                title="Switch branch"
              >
                {branches.map((br) => (
                  <option key={br.id} value={br.id}>{br.name}</option>
                ))}
              </select>
            )}

            {branches.length === 1 && (
              <span className="header-branch-label">{branches[0].name}</span>
            )}
          </div>
        )}

        <button className="header-notification">
          <FiBell size={20} />
          <span className="notification-dot"></span>
        </button>

        <div className="header-user">
          <div className="user-avatar">
            <FiUser size={20} />
          </div>
          <div className="user-info">
            <span className="user-name">{user.full_name || 'User'}</span>
            <span
              className="user-role"
              style={{ backgroundColor: getRoleColor(user.role) }}
            >
              {user.role || 'Staff'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;