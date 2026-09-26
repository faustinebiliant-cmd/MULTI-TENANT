// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Audit Log
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiSearch,
  FiRefreshCw,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiLogIn,
  FiLogOut,
  FiClipboard,
  FiCheckCircle,
  FiTruck,
  FiXCircle,
  FiCreditCard,
  FiBox,
  FiEdit2,
  FiTrash2,
  FiBarChart2,
  FiUser,
  FiFileText,
  FiInbox,
  FiSliders,
  FiZap,
  FiBriefcase
} from 'react-icons/fi';
import api from '../../api/client';
import { formatDate } from '../../utils/helpers';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const ACTION_META = {
  'Login': { icon: FiLogIn, tone: 'success' },
  'Logout': { icon: FiLogOut, tone: 'neutral' },
  'Quick Sale': { icon: FiZap, tone: 'primary' },
  'Order Created': { icon: FiClipboard, tone: 'primary' },
  'Order Confirmed': { icon: FiCheckCircle, tone: 'primary' },
  'Order Delivered': { icon: FiTruck, tone: 'success' },
  'Order Cancelled': { icon: FiXCircle, tone: 'danger' },
  'Order Status Updated': { icon: FiClipboard, tone: 'warning' },
  'Payment Recorded': { icon: FiCreditCard, tone: 'success' },
  'Product Created': { icon: FiBox, tone: 'neutral' },
  'Product Updated': { icon: FiEdit2, tone: 'warning' },
  'Product Deleted': { icon: FiTrash2, tone: 'danger' },
  'Stock Adjusted': { icon: FiBarChart2, tone: 'warning' },
  'Customer Created': { icon: FiUser, tone: 'neutral' },
  'Customer Updated': { icon: FiEdit2, tone: 'warning' },
  'Customer Deleted': { icon: FiTrash2, tone: 'danger' },
  'Expense Created': { icon: FiFileText, tone: 'neutral' },
  'Expense Updated': { icon: FiEdit2, tone: 'warning' },
  'Expense Deleted': { icon: FiTrash2, tone: 'danger' },
  'Supplier Created': { icon: FiUser, tone: 'neutral' },
  'Purchase Order Created': { icon: FiClipboard, tone: 'primary' },
  'Purchase Order Received': { icon: FiCheckCircle, tone: 'success' },
  'Branch Created': { icon: FiBriefcase, tone: 'neutral' },
  'Branch Updated': { icon: FiEdit2, tone: 'warning' },
  'Business Updated': { icon: FiBriefcase, tone: 'warning' },
  'Staff Created': { icon: FiUser, tone: 'neutral' },
  'Staff Updated': { icon: FiEdit2, tone: 'warning' },
  'Staff Deleted': { icon: FiTrash2, tone: 'danger' },
  'Staff Password Reset': { icon: FiUser, tone: 'warning' }
};

const DEFAULT_META = { icon: FiFileText, tone: 'neutral' };
const getActionMeta = (action) => ACTION_META[action] || DEFAULT_META;

const AuditLog = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ actions: [], users: [], branches: [] });

  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });

  const hasActiveFilters =
    selectedAction !== 'all' ||
    selectedUser !== 'all' ||
    selectedBranch !== 'all' ||
    startDate ||
    endDate ||
    search;

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.getAuditSummary();
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching audit summary:', error);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        action: selectedAction,
        user_id: selectedUser,
        branch_id: selectedBranch,
        startDate,
        endDate,
        search: debouncedSearch,
        page: pagination.page,
        limit: 50
      };

      const response = await api.getAuditLogs(params);
      setLogs(response.data.logs || []);
      setFilterOptions({
        actions: response.data.filters?.actions || [],
        users: response.data.filters?.users || [],
        branches: response.data.filters?.branches || []
      });
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error(t('audit_log.loading'));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedAction, selectedUser, selectedBranch, startDate, endDate, debouncedSearch, pagination.page, t]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchLogs();
  }, [selectedAction, selectedUser, selectedBranch, startDate, endDate, debouncedSearch, pagination.page, fetchLogs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSummary();
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSelectedAction('all');
    setSelectedUser('all');
    setSelectedBranch('all');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const goToPage = (page) => setPagination((prev) => ({ ...prev, page }));

  const formattedDetails = (log) => {
    if (!log.details) return null;
    if (typeof log.details === 'object') {
      return Object.entries(log.details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' · ');
    }
    return log.details;
  };

  const getActionLabel = (action) => {
    if (!action) return '';
    const key = `audit_log.actions.${action}`;
    const translated = t(key);
    return translated === key ? action : translated;
  };

  const summaryCards = useMemo(() => [
    { label: t('audit_log.summary.today'), value: summary?.today ?? 0 },
    { label: t('audit_log.summary.this_week'), value: summary?.week ?? 0 },
    { label: t('audit_log.summary.this_month'), value: summary?.month ?? 0 },
    {
      label: t('audit_log.summary.most_common'),
      value: summary?.topActions?.[0]?.action
        ? getActionLabel(summary.topActions[0].action)
        : t('audit_log.summary.no_data'),
      isText: true
    }
  ], [summary, t]);

  if (loading && logs.length === 0 && !isRefreshing) {
    return <Loader message={t('audit_log.loading')} />;
  }

  return (
    <div className="audit-log">
      <div className="page-header">
        <div>
          <h1>{t('audit_log.title')}</h1>
          <p>{t('audit_log.subtitle')}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="btn btn-secondary"
          disabled={isRefreshing}
        >
          <FiRefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          {t('audit_log.refresh_button')}
        </button>
      </div>

      {summary && (
        <div className="grid-4 audit-summary">
          {summaryCards.map((item) => (
            <div className="card stat-card" key={item.label}>
              <div className="stat-info">
                <h3 className={item.isText ? 'stat-text' : ''}>{item.value}</h3>
                <p>{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card audit-toolbar">
        <div className="search-bar audit-search">
          <FiSearch size={18} />
          <input
            type="text"
            placeholder={t('audit_log.search_placeholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              goToPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearch('')}
              aria-label={t('audit_log.clear_search')}
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        <div className="audit-filters">
          <select
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              goToPage(1);
            }}
            className="form-control"
            aria-label={t('audit_log.columns.branch')}
          >
            <option value="all">{t('audit_log.all_branches')}</option>
            {filterOptions.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>

          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              goToPage(1);
            }}
            className="form-control"
            aria-label={t('audit_log.columns.action')}
          >
            <option value="all">{t('audit_log.all_actions')}</option>
            {filterOptions.actions.map((action) => (
              <option key={action} value={action}>{getActionLabel(action)}</option>
            ))}
          </select>

          <select
            value={selectedUser}
            onChange={(e) => {
              setSelectedUser(e.target.value);
              goToPage(1);
            }}
            className="form-control"
            aria-label={t('audit_log.columns.user')}
          >
            <option value="all">{t('audit_log.all_users')}</option>
            {filterOptions.users.map((user) => (
              <option key={user.id} value={user.id}>{user.full_name}</option>
            ))}
          </select>

          <div className="date-range">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                goToPage(1);
              }}
              className="form-control"
              aria-label={t('audit_log.columns.timestamp')}
            />
            <span className="date-range-sep">
              {t('reports.common.date_range_to')}
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                goToPage(1);
              }}
              className="form-control"
              aria-label={t('audit_log.columns.timestamp')}
            />
          </div>

          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="btn btn-ghost btn-sm">
              <FiX size={14} />
              {t('audit_log.clear_filters')}
            </button>
          )}
        </div>
      </div>

      <div className="audit-results-meta">
        {pagination.total > 0
          ? t('audit_log.results_count', { count: pagination.total })
          : null}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('audit_log.columns.user')}</th>
              <th>{t('audit_log.columns.branch')}</th>
              <th>{t('audit_log.columns.action')}</th>
              <th>{t('audit_log.columns.details')}</th>
              <th>{t('audit_log.columns.timestamp')}</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <div className="empty-state">
                    <FiInbox size={28} />
                    <p>{t('audit_log.title')}</p>
                    <span>
                      {hasActiveFilters
                        ? t('audit_log.empty_filtered')
                        : t('audit_log.empty_default')}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const { icon: ActionIcon, tone } = getActionMeta(log.action);
                const details = formattedDetails(log);
                return (
                  <tr key={log.id}>
                    <td>
                      <div className="user-cell">
                        <span className="user-name">
                          {log.user_name || t('audit_log.system_user')}
                        </span>
                        {log.user_role && (
                          <span className="badge badge-neutral badge-xs">
                            {t('staff.roles.' + log.user_role)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {log.branch_name ? (
                        <span className="branch-cell">{log.branch_name}</span>
                      ) : (
                        <span className="details-empty">-</span>
                      )}
                    </td>
                    <td>
                      <span className={`action-pill action-pill--${tone}`}>
                        <ActionIcon size={14} />
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td>
                      <div className="details-cell">
                        {log.order_number && (
                          <span className="order-number">#{log.order_number}</span>
                        )}
                        {details && <span className="details-text">{details}</span>}
                        {!log.order_number && !details && (
                          <span className="details-empty">-</span>
                        )}
                      </div>
                    </td>
                    <td className="timestamp-cell">{formatDate(log.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="audit-pagination">
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <FiChevronLeft size={16} />
            {t('audit_log.pagination.previous')}
          </button>
          <span className="pagination-status">
            {t('audit_log.pagination.status', {
              page: pagination.page,
              pages: pagination.pages
            })}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
          >
            {t('audit_log.pagination.next')}
            <FiChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLog;