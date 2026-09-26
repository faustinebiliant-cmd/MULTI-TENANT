// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Low Stock Alerts
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LowStockAlerts = ({ items }) => {
  const { t } = useTranslation();

  if (!items || items.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3>{t('low_stock.title')}</h3>
          <span className="badge badge-success">{t('low_stock.all_stocked')}</span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
          <p>{t('low_stock.no_items')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>{t('low_stock.title')}</h3>
        <span className="badge badge-danger">
          {items.length} {t('stats.low_stock_items')}
        </span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('low_stock.columns.product')}</th>
              <th>{t('low_stock.columns.current_stock')}</th>
              <th>{t('low_stock.columns.threshold')}</th>
              <th>{t('low_stock.columns.status')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td><strong>{item.name}</strong></td>
                <td>{item.stock}</td>
                <td>{item.threshold || 5}</td>
                <td>
                  <span className="badge badge-danger">{t('low_stock.badge')}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
        <Link to="/products" className="btn btn-sm btn-primary">
          {t('low_stock.view_all')}
        </Link>
      </div>
    </div>
  );
};

export default LowStockAlerts;