// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Sidebar
// ============================================================

import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { useShop } from '../../contexts/ShopContext';
import { getInitials } from '../../utils/helpers';
import { getMenuGroups } from '../../utils/navConfig';
import Switchers from './Switchers';

const Sidebar = () => {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { activeBusiness } = useBranch();
  const { quickSaleEnabled } = useShop();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || '';
  const menuGroups = getMenuGroups(role, quickSaleEnabled);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', isOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = getInitials(user.full_name);
  const roleDisplay = role ? role.replace('_', ' ') : 'Staff';

  const brandName = activeBusiness?.name || user.full_name || '-';
  const accountLabel = activeBusiness?.business_code
    ? `businessID: ${activeBusiness.business_code}`
    : '-';

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className="mobile-menu-trigger"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <FiMenu size={20} />
        </button>
      )}

      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div>
            <h2 className="sidebar-brand-name">{brandName}</h2>
            <p className="sidebar-brand-code">{accountLabel}</p>
          </div>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <FiX size={18} />
          </button>
        </div>

        <Switchers variant="sidebar" />

        <nav className="sidebar-nav">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div className="sidebar-group" key={group.labelKey}>
                <span className="sidebar-group-label">{t(group.labelKey)}</span>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      isActive ? 'sidebar-link active' : 'sidebar-link'
                    }
                  >
                    <span className="sidebar-link-icon">
                      <item.icon size={18} />
                    </span>
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.full_name || 'User'}</span>
              <span className="sidebar-user-role">{roleDisplay}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-logout">
            <FiLogOut size={18} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;