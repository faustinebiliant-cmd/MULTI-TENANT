// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Recent Orders
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { PAYMENT_STATUS_META } from '../../utils/constants';

const RecentOrders = ({ orders }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState({});

  const toggleExpanded = (orderId) => {
    setExpanded(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="card">
        <div className="flex-between">
          <h3>{t('recent_orders.title')}</h3>
          <Link to="/orders" className="btn btn-sm btn-secondary">
            {t('recent_orders.view_all')}
          </Link>
        </div>
        <div className="empty-state">
          <p>{t('recent_orders.no_orders')}</p>
        </div>
      </div>
    );
  }

  const renderPaymentCell = (order) => {
    const status = (order.payment_status || 'unpaid').toLowerCase();
    const meta = PAYMENT_STATUS_META[status] || PAYMENT_STATUS_META.unpaid;

    if (status !== 'partial') {
      return (
        <span style={{ color: meta.color, fontWeight: '600', textTransform: 'capitalize' }}>
          {t('status.' + status)}
        </span>
      );
    }

    const paid = parseFloat(order.paid_amount) || 0;
    const total = parseFloat(order.total) || 0;
    const owed = Math.max(0, total - paid);
    const isOpen = expanded[order.id];

    return (
      <div>
        <button
          type="button"
          onClick={() => toggleExpanded(order.id)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: meta.color,
            fontWeight: '600',
            textTransform: 'capitalize',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'transform 220ms ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        >
          {t('status.partial')}
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

  return (
    <div className="card">
      <div className="flex-between">
        <h3>{t('recent_orders.title')}</h3>
        <Link to="/orders" className="btn btn-sm btn-secondary">
          {t('recent_orders.view_all')}
        </Link>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('recent_orders.columns.order_number')}</th>
              <th>{t('recent_orders.columns.customer')}</th>
              <th>{t('recent_orders.columns.amount')}</th>
              <th>{t('recent_orders.columns.status')}</th>
              <th>{t('recent_orders.columns.payment')}</th>
              <th>{t('recent_orders.columns.date')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 5).map((order) => (
              <tr key={order.id}>
                <td>
                  <Link to={`/orders/${order.id}`} className="order-link">
                    {order.order_number}
                  </Link>
                </td>
                <td>{order.customer}</td>
                <td>{formatCurrency(order.total)}</td>
                <td>
                  <span style={{
                    color: getStatusColor(order.status),
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {t('status.' + (order.status || 'pending'))}
                  </span>
                </td>
                <td>{renderPaymentCell(order)}</td>
                <td>{formatDate(order.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentOrders;