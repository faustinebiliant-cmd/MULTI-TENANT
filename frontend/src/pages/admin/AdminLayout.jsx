import React from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { FiHome, FiBriefcase, FiFileText, FiLogOut, FiShield, FiUsers } from 'react-icons/fi';
import { useAdmin } from '../../contexts/AdminContext';

const AdminLayout = () => {
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <FiShield size={20} />
          <div>
            <strong>Platform</strong>
            <span>Admin</span>
          </div>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin/dashboard" className={({isActive}) => 'admin-nav-link' + (isActive ? ' active' : '')}>
            <FiHome size={16} /> Overview
          </NavLink>
          <NavLink to="/admin/businesses" className={({isActive}) => 'admin-nav-link' + (isActive ? ' active' : '')}>
            <FiBriefcase size={16} /> Businesses
          </NavLink>
          <NavLink to="/admin/customers" className={({isActive}) => 'admin-nav-link' + (isActive ? ' active' : '')}>
            <FiUsers size={16} /> Customers
          </NavLink>
          <NavLink to="/admin/audit-logs" className={({isActive}) => 'admin-nav-link' + (isActive ? ' active' : '')}>
            <FiFileText size={16} /> Audit Log
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <div className="admin-user-name">{admin?.full_name || 'Admin'}</div>
            <div className="admin-user-email">{admin?.email || ''}</div>
          </div>
          <button className="admin-logout" onClick={handleLogout}>
            <FiLogOut size={16} /> Sign out
          </button>
          <Link to="/dashboard" className="admin-back-link">← Back to shop</Link>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;