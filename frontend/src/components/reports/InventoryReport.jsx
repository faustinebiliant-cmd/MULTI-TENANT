// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Inventory Report
// ============================================================

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiPackage, FiDollarSign, FiTrendingUp, FiAlertTriangle
} from 'react-icons/fi';
import { formatCurrency } from '../../utils/helpers';
import api from '../../api/client';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const InventoryReport = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await api.getInventoryReport();
      setData(response.data);
    } catch (error) {
      console.error('Error fetching inventory report:', error);
      toast.error(t('reports.common.download_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader message={t('reports.common.loading')} />;

  if (!data) {
    return (
      <div className="empty-state">
        <h3>{t('reports.common.no_data')}</h3>
        <p>{t('reports.common.no_data_hint')}</p>
      </div>
    );
  }

  const { summary, lowStockItems, categoryBreakdown, products } = data;

  return (
    <div>
      <div className="page-header">
        <h1>{t('reports.inventory.title')}</h1>
        <p>{t('reports.inventory.subtitle')}</p>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="flex" style={{ alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div className="stat-icon" style={{ backgroundColor: 'var(--tone-blue-bg)', color: 'var(--tone-blue-text)' }}>
              <FiPackage size={20} />
            </div>
            <h3 style={{ margin: 0 }}>{t('reports.inventory.total_products_title')}</h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>
            {summary.totalProducts}
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            {t('reports.inventory.total_products_hint')}
          </p>
        </div>

        <div className="card">
          <div className="flex" style={{ alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div className="stat-icon" style={{ backgroundColor: 'var(--tone-red-bg)', color: 'var(--tone-red-text)' }}>
              <FiDollarSign size={20} />
            </div>
            <h3 style={{ margin: 0 }}>{t('reports.inventory.cost_value_title')}</h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>
            {formatCurrency(summary.totalCostValue)}
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            {t('reports.inventory.cost_value_hint')}
          </p>
        </div>

        <div className="card">
          <div className="flex" style={{ alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div className="stat-icon" style={{ backgroundColor: 'var(--tone-green-bg)', color: 'var(--tone-green-text)' }}>
              <FiTrendingUp size={20} />
            </div>
            <h3 style={{ margin: 0 }}>{t('reports.inventory.selling_value_title')}</h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
            {formatCurrency(summary.totalSellingValue)}
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            {t('reports.inventory.selling_value_hint')}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="flex-between">
          <div>
            <h3 style={{ margin: 0 }}>{t('reports.inventory.profit_potential_title')}</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              {t('reports.inventory.profit_potential_hint')}
            </p>
          </div>
          <h2 style={{ margin: 0, color: '#7c3aed' }}>
            {formatCurrency(summary.potentialProfit)}
          </h2>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '20px' }}>
        <div className="card">
          <div className="card-header">
            <div className="flex" style={{ alignItems: 'center', gap: '8px' }}>
              <FiAlertTriangle size={18} color="#dc2626" />
              <h3 style={{ margin: 0 }}>
                {t('reports.inventory.low_stock_title', { count: lowStockItems.length })}
              </h3>
            </div>
          </div>
          {lowStockItems.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              {t('reports.inventory.low_stock_all_good')}
            </p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('reports.inventory.columns.product')}</th>
                    <th>{t('reports.inventory.columns.stock')}</th>
                    <th>{t('reports.inventory.columns.threshold')}</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>
                        <span className="badge badge-danger">{item.stock}</span>
                      </td>
                      <td>{item.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ margin: 0 }}>{t('reports.inventory.category_title')}</h3>
          </div>
          {categoryBreakdown.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              {t('reports.inventory.category_empty')}
            </p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('reports.inventory.columns.category')}</th>
                    <th>{t('reports.inventory.columns.stock')}</th>
                    <th>{t('reports.inventory.columns.stock_value')}</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((cat) => (
                    <tr key={cat.name}>
                      <td>{cat.name}</td>
                      <td>{cat.items}</td>
                      <td>{formatCurrency(cat.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>
            {t('reports.inventory.all_products_title', { count: products.length })}
          </h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('reports.inventory.columns.product')}</th>
                <th>{t('reports.inventory.columns.category')}</th>
                <th>{t('reports.inventory.columns.stock')}</th>
                <th>{t('reports.inventory.columns.cost_price')}</th>
                <th>{t('reports.inventory.columns.selling_price')}</th>
                <th>{t('reports.inventory.columns.stock_value')}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stockValue = (parseFloat(p.selling_price) || 0) * (parseInt(p.stock_quantity) || 0);
                const isLow = (p.stock_quantity || 0) <= (p.low_stock_threshold || 5);
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td>{p.category_name || 'Uncategorized'}</td>
                    <td>
                      <span className={isLow ? 'badge badge-danger' : 'badge badge-success'}>
                        {p.stock_quantity || 0}
                      </span>
                    </td>
                    <td>{formatCurrency(p.cost_price)}</td>
                    <td>{formatCurrency(p.selling_price)}</td>
                    <td>{formatCurrency(stockValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryReport;