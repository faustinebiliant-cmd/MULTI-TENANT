// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Profit Report
// Realized profit: only counts profit on money received.
// VAT is shown as memo, not part of profit.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  FiTrendingUp, FiDollarSign, FiTrendingDown, FiFileText, FiPercent
} from 'react-icons/fi';
import { formatCurrency, formatDateOnly } from '../../utils/helpers';
import api from '../../api/client';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const currentYear = new Date().getFullYear();

const periodOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' }
];

const months = [
  { value: 'all', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

const availableYears = [];
for (let y = 2020; y <= currentYear; y++) {
  availableYears.push(y);
}

const ProfitReport = () => {
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
      toast.error('Failed to load profit report');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustom = () => {
    if (startDate && endDate) {
      setPeriod('custom');
      fetchReport();
    } else {
      toast.error('Please select both start and end dates');
    }
  };

  if (loading) return <Loader message="Loading profit report..." />;

  if (!data) {
    return (
      <div className="empty-state">
        <h3>No data available</h3>
        <p>No sales found for this period</p>
      </div>
    );
  }

  const { summary, productProfit, expenses } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Profit Report</h1>
          <p>Realized profit on money received, VAT excluded</p>
        </div>
      </div>

      {/* Period selector — same as Sales Report */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="report-tabs">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`report-tab ${period === opt.value ? 'active' : ''}`}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
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
                <option key={m.value} value={m.value}>{m.label}</option>
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
              <span style={{ color: 'var(--gray)', fontSize: '13px' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-control"
                style={{ width: '160px' }}
              />
              <button onClick={handleApplyCustom} className="btn btn-primary btn-sm">
                Apply
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="stats-grid-4">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
            <FiTrendingUp size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalProfit || 0)}</h3>
            <p>Realized Profit</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
            <FiDollarSign size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalRevenuePaid || 0)}</h3>
            <p>Business Money (excl. VAT)</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <FiTrendingDown size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalExpenses || 0)}</h3>
            <p>Expenses</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: summary.netProfit >= 0 ? '#ecfdf5' : '#fef2f2', color: summary.netProfit >= 0 ? '#059669' : '#dc2626' }}>
            <FiTrendingUp size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ color: summary.netProfit >= 0 ? '#059669' : '#dc2626' }}>
              {formatCurrency(summary.netProfit || 0)}
            </h3>
            <p>Net Profit (after expenses)</p>
          </div>
        </div>
      </div>

      {/* P&L Breakdown */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Profit &amp; Loss Breakdown</h3>

        <div className="detail-row">
          <span className="detail-label">Business Money Received (excl. VAT)</span>
          <span className="detail-value">{formatCurrency(summary.totalRevenuePaid || 0)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Cost of Goods Sold (paid portion)</span>
          <span className="detail-value" style={{ color: '#ef4444' }}>
            - {formatCurrency(summary.totalCostPaid || 0)}
          </span>
        </div>
        <div className="detail-row" style={{ borderTop: '2px solid #e5e7eb', paddingTop: '12px', marginTop: '8px' }}>
          <span className="detail-label" style={{ fontWeight: 700 }}>Realized Profit</span>
          <span className="detail-value" style={{ fontWeight: 700, color: summary.totalProfit >= 0 ? '#10b981' : '#ef4444' }}>
            {formatCurrency(summary.totalProfit || 0)}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Operating Expenses</span>
          <span className="detail-value" style={{ color: '#ef4444' }}>
            - {formatCurrency(summary.totalExpenses || 0)}
          </span>
        </div>
        <div className="detail-row" style={{ borderTop: '2px solid #0f172a', paddingTop: '12px', marginTop: '8px' }}>
          <span className="detail-label" style={{ fontWeight: 700, fontSize: '16px' }}>Net Profit</span>
          <span className="detail-value" style={{
            fontWeight: 700,
            fontSize: '16px',
            color: summary.netProfit >= 0 ? '#10b981' : '#ef4444'
          }}>
            {formatCurrency(summary.netProfit || 0)}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Margin</span>
          <span className="detail-value">
            {(summary.margin || 0).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* VAT memo — visible, but not part of profit */}
      <div className="card" style={{ marginTop: '20px', background: '#fffbeb', border: '1px solid #fde68a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiPercent size={18} color="#b45309" />
          <div>
            <div style={{ fontWeight: 700, color: '#b45309', fontSize: '13.5px' }}>
              VAT Collected (not part of profit)
            </div>
            <div style={{ color: '#78350f', fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
              {formatCurrency(summary.totalVATPaid || 0)}
            </div>
            <div style={{ color: '#92400e', fontSize: '12.5px', marginTop: '4px' }}>
              This amount belongs to the government and must be remitted. It is not included in the profit calculation above.
            </div>
          </div>
        </div>
      </div>

      {/* Top products */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>Top Products by Profit</h3>
        </div>
        {productProfit.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
            No product sales for this period
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty Sold</th>
                  <th>Revenue (full)</th>
                  <th>Cost (full)</th>
                  <th>Profit (full)</th>
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
          Note: product breakdown shows profit potential on full order values. The
          summary above reflects profit on money actually received.
        </small>
      </div>

      {/* Expenses */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>Expenses in This Period ({expenses.length})</h3>
        </div>
        {expenses.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
            No expenses recorded
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
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