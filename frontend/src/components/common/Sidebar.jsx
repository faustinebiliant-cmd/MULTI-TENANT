// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Sidebar
// ============================================================

import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiPackage,
  FiGrid,
  FiUsers,
  FiShoppingCart,
  FiCreditCard,
  FiDollarSign,
  FiTruck,
  FiFileText,
  FiBarChart2,
  FiSettings,
  FiUserPlus,
  FiLogOut,
  FiClipboard,
  FiZap,
  FiDownload,
  FiMenu,
  FiX
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials } from '../../utils/helpers';

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || '';

  const isBoss = role === 'boss';
  const isManager = role === 'manager' || role === 'boss';
  const isCashier = role === 'cashier';
  const isStoreKeeper = role === 'store_keeper';

  // Close the drawer automatically whenever the route changes (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Lock background scroll while the drawer is open on mobile
  useEffect(() => {
    document.body.classList.toggle('no-scroll', isOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [isOpen]);

  const menuGroups = [
    {
      label: 'Overview',
      items: [
        { path: '/dashboard', icon: FiHome, label: 'Dashboard', show: true }
      ]
    },
    {
      label: 'Sales',
      items: [
        { path: '/orders', icon: FiShoppingCart, label: 'Orders', show: true },
        { path: '/customers', icon: FiUsers, label: 'Customers', show: !isCashier && !isStoreKeeper },
        { path: '/payments', icon: FiCreditCard, label: 'Payments', show: isCashier || isManager || isBoss }
      ]
    },
    {
      label: 'Inventory',
      items: [
        { path: '/products', icon: FiPackage, label: 'Products', show: true },
        { path: '/categories', icon: FiGrid, label: 'Categories', show: isManager },
        { path: '/suppliers', icon: FiTruck, label: 'Suppliers', show: isManager },
        { path: '/purchase-orders', icon: FiFileText, label: 'Purchase Orders', show: isManager }
      ]
    },
    {
      label: 'Management',
      items: [
        { path: '/expenses', icon: FiDollarSign, label: 'Expenses', show: isManager },
        { path: '/reports/sales', icon: FiBarChart2, label: 'Reports', show: isManager },
        { path: '/reports/extract', icon: FiDownload, label: 'Extract Reports', show: isBoss },
        { path: '/audit-log', icon: FiClipboard, label: 'Audit Log', show: isBoss },
        { path: '/staff', icon: FiUserPlus, label: 'Staff', show: isBoss },
        { path: '/settings', icon: FiSettings, label: 'Settings', show: isBoss }
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = getInitials(user.full_name);
  const roleDisplay = role ? role.replace('_', ' ') : 'Staff';

  return (
    <>
      <button
        type="button"
        className="mobile-menu-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <FiMenu size={20} />
      </button>

      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <FiZap size={22} />
          </div>
          <div>
            <h2>OSWAGO</h2>
            <p>Electrical Equipment</p>
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

        <nav className="sidebar-nav">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div className="sidebar-group" key={group.label}>
                <span className="sidebar-group-label">{group.label}</span>
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
                    <span>{item.label}</span>
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
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
