// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Header
// ============================================================

import React from 'react';
import { FiUser, FiBell } from 'react-icons/fi';
import { useShop } from '../../contexts/ShopContext';
import { ROLE_META } from '../../utils/constants';

const getRoleColor = (role) => {
  const meta = ROLE_META[role];
  return meta ? meta.color : '#6b7280';
};

const Header = () => {
  const { appName, location } = useShop();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">{appName}</h1>
        <span className="header-location">{location}</span>
      </div>

      <div className="header-right">
        <button className="header-notification" aria-label="Notifications">
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