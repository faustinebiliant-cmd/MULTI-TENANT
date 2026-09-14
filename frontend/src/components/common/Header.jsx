// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Header
// ============================================================

import React from 'react';
import { FiUser, FiBell } from 'react-icons/fi';
import { APP_NAME, SHOP_LOCATION } from '../../utils/constants';

const Header = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const getRoleBadge = (role) => {
    const colors = {
      boss: '#ef4444',
      manager: '#3b82f6',
      cashier: '#f59e0b',
      store_keeper: '#8b5cf6',
      sales_rep: '#10b981'
    };
    return colors[role] || '#6b7280';
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">{APP_NAME}</h1>
        <span className="header-location">{SHOP_LOCATION}</span>
      </div>

      <div className="header-right">
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
              style={{ backgroundColor: getRoleBadge(user.role) }}
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