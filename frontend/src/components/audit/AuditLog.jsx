// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Audit Log
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  FiSliders
} from 'react-icons/fi';
import api from '../../api/client';
import { formatDate } from '../../utils/helpers';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

// Map each action to icon + tone
const ACTION_META = {
  'Login': { icon: FiLogIn, tone: 'success' },
  'Logout': { icon: FiLogOut, tone: 'neutral' },
  'Order Created': { icon: FiClipboard, tone: 'primary' },
  'Order Confirmed': { icon: FiCheckCircle, tone: 'primary' },
  'Order Delivered': { icon: FiTruck, tone: 'success' },
  'Order Cancelled': { icon: FiXCircle, tone: 'danger' },
  'Payment Recorded': { icon: FiCreditCard, tone: 'success' },
  'Product Created': { icon: FiBox, tone: 'neutral' },
  'Product Updated': { icon: FiEdit2, tone: 'warning' },
  'Product Deleted': { icon: FiTrash2, tone: 'danger' },
  'Stock Adjusted': { icon: FiBarChart2, tone: 'warning' },
  'Customer Created': { icon: FiUser, tone: 'neutral' },
  'Customer Updated': { icon: FiEdit2, tone: 'warning' },
  'Customer Deleted': { icon: FiTrash2, tone: 'danger' },
  'Expense Created': { icon: FiFileText, tone: 'neutral' },
  'Supplier Created': { icon: FiUser, tone: 'neutral' },
  'Purchase Order Created': { icon: FiClipboard, tone: 'primary' },
  'Purchase Order Received': { icon: FiCheckCircle, tone: 'success' }
};

const DEFAULT_META = { icon: FiFileText, tone: 'neutral' };
const getActionMeta = (action) => ACTION_META[action] || DEFAULT_META;

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ actions: [], users: [] });

  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });

  const hasActiveFilters =
    selectedAction !== 'all' || selectedUser !== 'all' || startDate || endDate || search;

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
        users: response.data.filters?.users || []
      });
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedAction, selectedUser, startDate, endDate, debouncedSearch, pagination.page]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchLogs();
  }, [selectedAction, selectedUser, startDate, endDate, debouncedSearch, pagination.page, fetchLogs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSummary();
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSelectedAction('all');
    setSelectedUser('all');
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

  const summaryCards = useMemo(() => [
    { label: 'Today', value: summary?.today ?? 0 },
    { label: 'This week', value: summary?.week ?? 0 },
    { label: 'This month', value: summary?.month ?? 0 },
    { label: 'Most common action', value: summary?.topActions?.[0]?.action || '—', isText: true }
  ], [summary]);

  if (loading && logs.length === 0 && !isRefreshing) {
    return <Loader message="Loading audit log..." />;
  }

  return (
    <div className="audit-log">
      <div className="page-header">
        <div>
          <h1>Audit Log</h1>
          <p>Complete history of all actions in the system</p>
        </div>
        <button
          onClick={handleRefresh}
          className="btn btn-secondary"
          disabled={isRefreshing}
        >
          <FiRefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
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

      {/* Filters + search */}
      <div className="card audit-toolbar">
        <div className="search-bar audit-search">
          <FiSearch size={18} />
          <input
            type="text"
            placeholder="Search by action, user, or details"
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
              aria-label="Clear search"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        <div className="audit-filters">
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              goToPage(1);
            }}
            className="form-control"
            aria-label="Filter by action"
          >
            <option value="all">All actions</option>
            {filterOptions.actions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>

          <select
            value={selectedUser}
            onChange={(e) => {
              setSelectedUser(e.target.value);
              goToPage(1);
            }}
            className="form-control"
            aria-label="Filter by user"
          >
            <option value="all">All users</option>
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
              aria-label="Start date"
            />
            <span className="date-range-sep">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                goToPage(1);
              }}
              className="form-control"
              aria-label="End date"
            />
          </div>

          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="btn btn-ghost btn-sm">
              <FiX size={14} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="audit-results-meta">
        {pagination.total > 0
          ? `${pagination.total.toLocaleString()} record${pagination.total === 1 ? '' : 's'}`
          : null}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Details</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="4">
                  <div className="empty-state">
                    <FiInbox size={28} />
                    <p>No activity found</p>
                    <span>
                      {hasActiveFilters
                        ? 'Try adjusting or clearing your filters.'
                        : 'Actions taken in the system will appear here.'}
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
                        <span className="user-name">{log.user_name || 'System'}</span>
                        {log.user_role && (
                          <span className="badge badge-neutral badge-xs">{log.user_role}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`action-pill action-pill--${tone}`}>
                        <ActionIcon size={14} />
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <div className="details-cell">
                        {log.order_number && (
                          <span className="order-number">#{log.order_number}</span>
                        )}
                        {details && <span className="details-text">{details}</span>}
                        {!log.order_number && !details && <span className="details-empty">—</span>}
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
            Previous
          </button>
          <span className="pagination-status">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
          >
            Next
            <FiChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLog;