// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Profit Report
// ============================================================

import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiDollarSign, FiTrendingDown } from 'react-icons/fi';
import { formatCurrency, formatDateOnly } from '../../utils/helpers';
import api from '../../api/client';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const ProfitReport = () => {
  const [period, setPeriod] = useState('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [period]);

  const fetchReport = async () => {
    try {
      setLoading(true);

      const params = {};
      if (period === 'today') params.period = 'today';
      else if (period === 'week') params.period = 'week';

      if (period === 'month') {
        const now = new Date();
        params.year = now.getFullYear();
        params.month = now.getMonth() + 1;
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
        <h1>Profit Report</h1>
        <p>View profit and loss analysis</p>
      </div>

      {/* Period selector */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="flex" style={{ gap: '10px' }}>
          <button
            className={`btn ${period === 'today' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('today')}
          >
            Today
          </button>
          <button
            className={`btn ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('week')}
          >
            This Week
          </button>
          <button
            className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('month')}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-3">
        <div className="card">
          <div className="flex" style={{ alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              <FiDollarSign size={20} />
            </div>
            <h3 style={{ margin: 0 }}>Revenue</h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>
            {formatCurrency(summary.totalRevenue)}
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>Excludes VAT</p>
        </div>

        <div className="card">
          <div className="flex" style={{ alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
              <FiTrendingDown size={20} />
            </div>
            <h3 style={{ margin: 0 }}>Cost</h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>
            {formatCurrency(summary.totalCost)}
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>Cost of goods sold</p>
        </div>

        <div className="card">
          <div className="flex" style={{ alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <FiTrendingUp size={20} />
            </div>
            <h3 style={{ margin: 0 }}>Net Profit</h3>
          </div>
          <p style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: summary.netProfit >= 0 ? '#10b981' : '#ef4444'
          }}>
            {formatCurrency(summary.netProfit)}
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            Margin: {summary.margin?.toFixed(2) || 0}%
          </p>
        </div>
      </div>

      {/* P&L breakdown */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Profit & Loss Breakdown</h3>
        <div className="detail-row">
          <span className="detail-label">Revenue (excl. VAT)</span>
          <span className="detail-value">{formatCurrency(summary.totalRevenue)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Total Cost of Goods</span>
          <span className="detail-value" style={{ color: '#ef4444' }}>
            - {formatCurrency(summary.totalCost)}
          </span>
        </div>
        <div className="detail-row" style={{ borderTop: '2px solid #e5e7eb', paddingTop: '12px', marginTop: '8px' }}>
          <span className="detail-label" style={{ fontWeight: 700 }}>Gross Profit</span>
          <span className="detail-value" style={{ fontWeight: 700, color: summary.grossProfit >= 0 ? '#10b981' : '#ef4444' }}>
            {formatCurrency(summary.grossProfit)}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Operating Expenses</span>
          <span className="detail-value" style={{ color: '#ef4444' }}>
            - {formatCurrency(summary.totalExpenses)}
          </span>
        </div>
        <div className="detail-row" style={{ borderTop: '2px solid #0f172a', paddingTop: '12px', marginTop: '8px' }}>
          <span className="detail-label" style={{ fontWeight: 700, fontSize: '16px' }}>Net Profit</span>
          <span className="detail-value" style={{
            fontWeight: 700,
            fontSize: '16px',
            color: summary.netProfit >= 0 ? '#10b981' : '#ef4444'
          }}>
            {formatCurrency(summary.netProfit)}
          </span>
        </div>
      </div>

      {/* Product profit */}
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
                  <th>Revenue</th>
                  <th>Cost</th>
                  <th>Profit</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {productProfit.map((item, index) => {
                  const margin = item.revenue > 0 ? Math.round((item.profit / item.revenue) * 100) : 0;
                  return (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{formatCurrency(item.revenue)}</td>
                      <td>{formatCurrency(item.cost)}</td>
                      <td style={{ color: item.profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        {formatCurrency(item.profit)}
                      </td>
                      <td>
                        <span className={margin >= 0 ? 'badge badge-success' : 'badge badge-danger'}>
                          {margin}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expenses list */}
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