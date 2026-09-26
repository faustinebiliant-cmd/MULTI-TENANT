// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Profit Report
// ============================================================

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiTrendingUp, FiDollarSign, FiTrendingDown, FiFileText, FiPercent
} from 'react-icons/fi';
import { formatCurrency, formatDateOnly } from '../../utils/helpers';
import api from '../../api/client';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const currentYear = new Date().getFullYear();

const periodOptions = [
  { value: 'today', labelKey: 'reports.common.periods.today' },
  { value: 'week', labelKey: 'reports.common.periods.week' },
  { value: 'month', labelKey: 'reports.common.periods.month' },
  { value: 'year', labelKey: 'reports.common.periods.year' },
  { value: 'custom', labelKey: 'reports.common.periods.custom' }
];

const months = [
  { value: 'all', labelKey: 'reports.common.months.all' },
  { value: '1', labelKey: 'reports.common.months.1' },
  { value: '2', labelKey: 'reports.common.months.2' },
  { value: '3', labelKey: 'reports.common.months.3' },
  { value: '4', labelKey: 'reports.common.months.4' },
  { value: '5', labelKey: 'reports.common.months.5' },
  { value: '6', labelKey: 'reports.common.months.6' },
  { value: '7', labelKey: 'reports.common.months.7' },
  { value: '8', labelKey: 'reports.common.months.8' },
  { value: '9', labelKey: 'reports.common.months.9' },
  { value: '10', labelKey: 'reports.common.months.10' },
  { value: '11', labelKey: 'reports.common.months.11' },
  { value: '12', labelKey: 'reports.common.months.12' }
];

const availableYears = [];
for (let y = 2020; y <= currentYear; y++) {
  availableYears.push(y);
}

const ProfitReport = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('today');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [period, year, month]);

  const fetchReport = async () => {
    try {
      setLoading(true);

      const params = {};

      if (period === 'today') {
        params.period = 'today';
      } else if (period === 'week') {
        params.period = 'week';
      } else if (period === 'month' && month !== 'all') {
        params.year = year;
        params.month = month;
      } else if (period === 'year') {
        params.year = year;
      } else if (period === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        params.year = year;
      }

      const response = await api.getProfitReport(params);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching profit report:', error);
      toast.error(t('reports.common.download_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustom = () => {
    if (startDate && endDate) {
      setPeriod('custom');
      fetchReport();
    } else {
      toast.error(t('reports.common.select_dates_error'));
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

  const { summary, productProfit, expenses } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('reports.profit.title')}</h1>
          <p>{t('reports.profit.subtitle')}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="report-tabs">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`report-tab ${period === opt.value ? 'active' : ''}`}
              onClick={() => setPeriod(opt.value)}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex" style={{ gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '14px' }}>
          {(period === 'month' || period === 'year') && (
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="form-control"
              style={{ width: '120px' }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          {period === 'month' && (
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="form-control"
              style={{ width: '150px' }}
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{t(m.labelKey)}</option>
              ))}
            </select>
          )}

          {period === 'custom' && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-control"
                style={{ width: '160px' }}
              />
              <span style={{ color: 'var(--gray)', fontSize: '13px' }}>
                {t('reports.common.date_range_to')}
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-control"
                style={{ width: '160px' }}
              />
              <button onClick={handleApplyCustom} className="btn btn-primary btn-sm">
                {t('reports.common.apply')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="stats-grid-4">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--tone-purple-bg)', color: 'var(--tone-purple-text)' }}>
            <FiTrendingUp size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalProfit || 0)}</h3>
            <p>{t('reports.profit.realized_profit_title')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--tone-blue-bg)', color: 'var(--tone-blue-text)' }}>
            <FiDollarSign size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalRevenuePaid || 0)}</h3>
            <p>{t('reports.profit.business_money_title')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--tone-red-bg)', color: 'var(--tone-red-text)' }}>
            <FiTrendingDown size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalExpenses || 0)}</h3>
            <p>{t('reports.profit.expenses_title')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: summary.netProfit >= 0 ? 'var(--tone-green-bg)' : 'var(--tone-red-bg)', color: summary.netProfit >= 0 ? 'var(--tone-green-text)' : 'var(--tone-red-text)' }}>
            <FiTrendingUp size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ color: summary.netProfit >= 0 ? '#059669' : '#dc2626' }}>
              {formatCurrency(summary.netProfit || 0)}
            </h3>
            <p>{t('reports.profit.net_profit_title')}</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>{t('reports.profit.breakdown_title')}</h3>

        <div className="detail-row">
          <span className="detail-label">{t('reports.profit.business_received_label')}</span>
          <span className="detail-value">{formatCurrency(summary.totalRevenuePaid || 0)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">{t('reports.profit.cost_paid_label')}</span>
          <span className="detail-value" style={{ color: '#ef4444' }}>
            - {formatCurrency(summary.totalCostPaid || 0)}
          </span>
        </div>
        <div className="detail-row" style={{ borderTop: '2px solid #e5e7eb', paddingTop: '12px', marginTop: '8px' }}>
          <span className="detail-label" style={{ fontWeight: 700 }}>
            {t('reports.profit.realized_profit_label')}
          </span>
          <span className="detail-value" style={{ fontWeight: 700, color: summary.totalProfit >= 0 ? '#10b981' : '#ef4444' }}>
            {formatCurrency(summary.totalProfit || 0)}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">{t('reports.profit.operating_expenses_label')}</span>
          <span className="detail-value" style={{ color: '#ef4444' }}>
            - {formatCurrency(summary.totalExpenses || 0)}
          </span>
        </div>
        <div className="detail-row" style={{ borderTop: '2px solid #0f172a', paddingTop: '12px', marginTop: '8px' }}>
          <span className="detail-label" style={{ fontWeight: 700, fontSize: '16px' }}>
            {t('reports.profit.net_profit_label')}
          </span>
          <span className="detail-value" style={{
            fontWeight: 700,
            fontSize: '16px',
            color: summary.netProfit >= 0 ? '#10b981' : '#ef4444'
          }}>
            {formatCurrency(summary.netProfit || 0)}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">{t('reports.profit.margin_label')}</span>
          <span className="detail-value">
            {(summary.margin || 0).toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="card vat-memo-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiPercent size={18} color="var(--tone-amber-text)" />
          <div>
            <div className="vat-memo-title">
              {t('reports.profit.vat_memo_title')}
            </div>
            <div className="vat-memo-amount">
              {formatCurrency(summary.totalVATPaid || 0)}
            </div>
            <div className="vat-memo-note">
              {t('reports.profit.vat_memo_note')}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>{t('reports.profit.top_products_title')}</h3>
        </div>
        {productProfit.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
            {t('reports.profit.no_product_sales')}
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('reports.profit.top_columns.product')}</th>
                  <th>{t('reports.profit.top_columns.quantity_sold')}</th>
                  <th>{t('reports.profit.top_columns.revenue')}</th>
                  <th>{t('reports.profit.top_columns.cost')}</th>
                  <th>{t('reports.profit.top_columns.profit')}</th>
                </tr>
              </thead>
              <tbody>
                {productProfit.map((item, index) => {
                  const margin = item.revenue > 0 ? Math.round((item.profit / item.revenue) * 100) : 0;
                  return (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.quantity || 0}</td>
                      <td>{formatCurrency(item.revenue)}</td>
                      <td>{formatCurrency(item.cost)}</td>
                      <td style={{ color: item.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        {formatCurrency(item.profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <small style={{ display: 'block', marginTop: '10px', color: 'var(--gray)', fontSize: '12px' }}>
          {t('reports.profit.top_hint')}
        </small>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>{t('reports.profit.expenses_in_period', { count: expenses.length })}</h3>
        </div>
        {expenses.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
            {t('reports.profit.no_expenses')}
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('reports.profit.expense_columns.date')}</th>
                  <th>{t('reports.profit.expense_columns.description')}</th>
                  <th>{t('reports.profit.expense_columns.category')}</th>
                  <th>{t('reports.profit.expense_columns.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDateOnly(expense.expense_date || expense.created_at)}</td>
                    <td>{expense.description}</td>
                    <td>
                      <span className="badge badge-info">{expense.category || 'Other'}</span>
                    </td>
                    <td style={{ color: '#ef4444', fontWeight: 600 }}>
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfitReport;