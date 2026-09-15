// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Staff List
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiPlus, FiSearch, FiX, FiUsers, FiAward, FiBriefcase,
  FiDollarSign, FiArchive, FiUserCheck
} from 'react-icons/fi';
import api from '../../api/client';
import { ROLE_META } from '../../utils/constants';
import toast from 'react-hot-toast';

const ROLE_ICONS = {
  boss: FiAward,
  manager: FiBriefcase,
  cashier: FiDollarSign,
  store_keeper: FiArchive,
  sales_rep: FiUserCheck
};

const getRoleMeta = (role) => {
  const meta = ROLE_META[role] || { label: role || 'Staff', color: '#6b7280' };
  return {
    label: meta.label,
    color: meta.color,
    icon: ROLE_ICONS[role] || FiUsers
  };
};

const StaffList = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const currentUser = useMemo(
    () => JSON.parse(localStorage.getItem('user') || '{}'),
    []
  );

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return staff;
    return staff.filter(
      (member) =>
        member.full_name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query)
    );
  }, [staff, search]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading staff...</p>
      </div>
    );
  }

  return (
    <div className="staff-list">
      <div className="page-header">
        <div>
          <h1>Staff</h1>
          <p>Manage your team members</p>
        </div>
        <Link to="/staff/new" className="btn btn-primary">
          <FiPlus size={18} />
          Add Staff
        </Link>
      </div>

      <div className="card staff-toolbar">
        <div className="search-bar">
          <FiSearch size={18} />
          <input
            type="text"
            placeholder="Search staff by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <FiX size={16} />
            </button>
          )}
        </div>
        <span className="staff-count">
          {filteredStaff.length} of {staff.length} member{staff.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Staff</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className="empty-state">
                    <FiUsers size={28} />
                    <p>{staff.length === 0 ? 'No staff yet' : 'No matching staff'}</p>
                    <span>
                      {staff.length === 0
                        ? 'Add your first team member to get started.'
                        : 'Try a different name or email.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStaff.map((member) => {
                const isSelf = member.id === currentUser.id;
                const { label, icon: RoleIcon, color } = getRoleMeta(member.role);

                return (
                  <tr key={member.id}>
                    <td>
                      <div className="staff-name-block">
                        <span className="staff-name">{member.full_name}</span>
                        {isSelf && <span className="you-tag">You</span>}
                      </div>
                    </td>
                    <td className="text-muted">{member.email}</td>
                    <td className="text-muted">{member.phone || '-'}</td>
                    <td>
                      <span className="role-label" style={{ color }}>
                        <RoleIcon size={14} />
                        {label}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-label ${
                          member.is_active ? 'status-label--active' : 'status-label--inactive'
                        }`}
                      >
                        <span className="status-dot" />
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link to={`/staff/${member.id}`} className="btn btn-sm btn-secondary">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffList;