// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Staff List
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const StaffList = () => {
  const { t } = useTranslation();
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
      toast.error(t('staff.form.messages.load_failed'));
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
        <p>{t('staff.list.loading')}</p>
      </div>
    );
  }

  return (
    <div className="staff-list">
      <div className="page-header">
        <div>
          <h1>{t('staff.list.title')}</h1>
          <p>{t('staff.list.subtitle')}</p>
        </div>
        <Link to="/staff/new" className="btn btn-primary">
          <FiPlus size={18} />
          {t('staff.list.add_button')}
        </Link>
      </div>

      <div className="card staff-toolbar">
        <div className="search-bar">
          <FiSearch size={18} />
          <input
            type="text"
            placeholder={t('staff.list.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearch('')}
              aria-label={t('staff.list.clear_search')}
            >
              <FiX size={16} />
            </button>
          )}
        </div>
        <span className="staff-count">
          {t('staff.list.count', { shown: filteredStaff.length, total: staff.length })}
        </span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('staff.list.columns.staff')}</th>
              <th>{t('staff.list.columns.email')}</th>
              <th>{t('staff.list.columns.phone')}</th>
              <th>{t('staff.list.columns.role')}</th>
              <th>{t('staff.list.columns.status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className="empty-state">
                    <FiUsers size={28} />
                    <p>
                      {staff.length === 0
                        ? t('staff.list.no_staff_title')
                        : t('staff.list.no_match_title')}
                    </p>
                    <span>
                      {staff.length === 0
                        ? t('staff.list.no_staff_hint')
                        : t('staff.list.no_match_hint')}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStaff.map((member) => {
                const isSelf = member.id === currentUser.id;
                const roleMeta = ROLE_META[member.role] || { color: '#6b7280' };
                const RoleIcon = ROLE_ICONS[member.role] || FiUsers;

                return (
                  <tr key={member.id}>
                    <td>
                      <div className="staff-name-block">
                        <span className="staff-name">{member.full_name}</span>
                        {isSelf && <span className="you-tag">{t('staff.list.you_badge')}</span>}
                      </div>
                    </td>
                    <td className="text-muted">{member.email}</td>
                    <td className="text-muted">{member.phone || '-'}</td>
                    <td>
                      <span className="role-label" style={{ color: roleMeta.color }}>
                        <RoleIcon size={14} />
                        {t('staff.roles.' + member.role)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-label ${
                          member.is_active ? 'status-label--active' : 'status-label--inactive'
                        }`}
                      >
                        <span className="status-dot" />
                        {member.is_active
                          ? t('staff.list.status_active')
                          : t('staff.list.status_inactive')}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link to={`/staff/${member.id}`} className="btn btn-sm btn-secondary">
                        {t('common.view')}
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