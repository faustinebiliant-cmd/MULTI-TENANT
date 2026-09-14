// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Order List
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiPlus, FiSearch, FiCalendar, FiX, FiChevronDown, FiChevronUp,
  FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency, formatDate, getStatusLabel } from '../../utils/helpers';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import toast from 'react-hot-toast';

const PAGE_SIZE = 50;

// Payment status presentation
const PAYMENT_LABELS = {
  paid: { label: 'Paid', color: '#0bc518' },
  unpaid: { label: 'Unpaid', color: '#d00f0f' },
  partial: { label: 'Partial', color: '#92400e' }
};

// Order status text colors
const ORDER_STATUS_COLORS = {
  pending: '#b58a09',
  confirmed: '#0c39ce',
  delivered: '#08971d',
  cancelled: '#c40e0e'
};

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [filter, setFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  const [expandedPayments, setExpandedPayments] = useState({});
  const togglePaymentExpanded = (id) => {
    setExpandedPayments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchOrders = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filter !== 'all') params.status = filter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const queryString = new URLSearchParams(params).toString();
      const response = await api.getOrdersPage(queryString);

      setOrders(response.data || []);
      setPagination(response.pagination || { total: 0, page: 1, pages: 1 });
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter, startDate, endDate]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const sortedOrders = [...orders].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    if (sortField === 'total_amount') {
      aVal = a.total_amount || 0;
      bVal = b.total_amount || 0;
    }

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const goToPage = (p) => {
    if (p < 1 || p > pagination.pages) return;
    fetchOrders(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = search || filter !== 'all' || startDate || endDate;

  const getStatusStyle = (status) => ({
    color: ORDER_STATUS_COLORS[status?.toLowerCase()] || ORDER_STATUS_COLORS.pending,
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'capitalize',
    display: 'inline-block'
  });

  const renderPaymentCell = (order) => {
    const status = (order.payment_status || 'unpaid').toLowerCase();
    const meta = PAYMENT_LABELS[status] || PAYMENT_LABELS.unpaid;

    if (status !== 'partial') {
      return (
        <span style={{
          color: meta.color,
          fontSize: '14px',
          fontWeight: '600',
          textTransform: 'capitalize',
          display: 'inline-block'
        }}>
          {meta.label}
        </span>
      );
    }

    const paid = parseFloat(order.paid_amount) || 0;
    const total = parseFloat(order.total_amount) || 0;
    const owed = Math.max(0, total - paid);
    const isOpen = expandedPayments[order.id];

    return (
      <div>
        <button
          type="button"
          onClick={() => togglePaymentExpanded(order.id)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: meta.color,
            fontSize: '14px',
            fontWeight: '600',
            textTransform: 'capitalize',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'transform 220ms ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        >
          {meta.label}
        </button>
        {isOpen && (
          <div style={{
            marginTop: '4px',
            fontSize: '12px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ color: '#059669' }}>{formatCurrency(paid)}</span>
            <span style={{ color: '#94a3b8', margin: '0 6px' }}>/</span>
            <span style={{ color: '#dc2626' }}>{formatCurrency(owed)}</span>
          </div>
        )}
      </div>
    );
  };

  const pageTotalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const uniqueCustomersPage = new Set(orders.map(o => o.customer_id)).size;

  if (loading && orders.length === 0) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading orders...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p className="text-gray" style={{ fontSize: '14px' }}>Manage all customer orders</p>
        </div>
        <div className="flex" style={{ gap: '16px', alignItems: 'center' }}>
          <div className="flex" style={{ gap: '12px', alignItems: 'center' }}>
            <span className="badge badge-info">{pagination.total} orders</span>
            <span className="badge badge-success">Page total: {formatCurrency(pageTotalRevenue)}</span>
            <span className="badge badge-secondary">{uniqueCustomersPage} customers</span>
          </div>
          <Link to="/orders/new" className="btn btn-primary">
            <FiPlus size={18} /> New Order
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div className="flex" style={{ gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <FiSearch size={18} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search orders by number or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '14px' }}
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-control"
            style={{ width: '140px', fontSize: '13px' }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FiCalendar size={16} />
            {showFilters ? 'Hide Dates' : 'Show Dates'}
            {showFilters ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch('');
                setFilter('all');
                clearDateFilters();
              }}
              className="btn btn-sm btn-secondary"
              style={{ color: '#ef4444' }}
            >
              <FiX size={14} /> Clear All
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex" style={{
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>
              <FiCalendar size={14} style={{ marginRight: '4px' }} />
              Date Range:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-control"
              style={{ width: '150px', padding: '6px 10px', fontSize: '13px' }}
            />
            <span style={{ color: '#64748b', fontSize: '13px' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-control"
              style={{ width: '150px', padding: '6px 10px', fontSize: '13px' }}
            />
            {(startDate || endDate) && (
              <button
                onClick={clearDateFilters}
                className="btn btn-sm btn-secondary"
                style={{ color: '#64748b' }}
              >
                <FiX size={14} /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('order_number')} style={{ cursor: 'pointer' }}>
                Order {sortField === 'order_number' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('customer_name')} style={{ cursor: 'pointer' }}>
                Customer {sortField === 'customer_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('total_amount')} style={{ cursor: 'pointer' }}>
                Amount {sortField === 'total_amount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Status</th>
              <th>Payment</th>
              <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                Date {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center" style={{ padding: '40px 20px', color: '#94a3b8' }}>
                  <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>No orders found</h3>
                  <p style={{ fontSize: '14px' }}>
                    {hasActiveFilters
                      ? 'Try adjusting or clearing your filters.'
                      : 'Create your first order.'}
                  </p>
                </td>
              </tr>
            ) : (
              sortedOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/orders/${order.id}`} className="order-link">
                      {order.order_number}
                    </Link>
                  </td>
                  <td>{order.customer_name || 'Walk-in'}</td>
                  <td style={{ fontWeight: '600', color: '#10b981' }}>
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td>
                    <span style={getStatusStyle(order.order_status)}>
                      {getStatusLabel(order.order_status)}
                    </span>
                  </td>
                  <td>{renderPaymentCell(order)}</td>
                  <td style={{ fontSize: '13px', color: '#64748b' }}>
                    {formatDate(order.created_at)}
                  </td>
                  <td>
                    <Link to={`/orders/${order.id}`} className="btn btn-sm btn-secondary">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="audit-pagination" style={{ marginTop: '16px' }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
          >
            <FiChevronLeft size={16} /> Previous
          </button>
          <span className="pagination-status">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages || loading}
          >
            Next <FiChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderList;