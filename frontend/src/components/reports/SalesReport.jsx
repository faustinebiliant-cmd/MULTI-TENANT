// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Sales Report
// ============================================================

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiDollarSign, FiCreditCard, FiClock, FiShoppingCart, FiBarChart2,
  FiPackage, FiSmartphone, FiTrendingDown, FiArrowUpCircle,
  FiArrowDownCircle, FiRefreshCw, FiPercent, FiTrendingUp
} from 'react-icons/fi';
import { formatCurrency, formatDate } from '../../utils/helpers';
import api from '../../api/client';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const SalesReport = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const [period, setPeriod] = useState('today');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [comparison, setComparison] = useState(null);

  const [expandedPayments, setExpandedPayments] = useState({});
  const togglePaymentExpanded = (id) => {
    setExpandedPayments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const availableYears = [];
  for (let y = 2020; y <= currentYear; y++) {
    availableYears.push(y);
  }

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

  useEffect(() => {
    fetchReport();
  }, [period, year, month]);

  useEffect(() => {
    fetchComparison();
  }, []);

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

      const response = await api.getSalesReport(params);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching sales report:', error);
      toast.error(t('reports.common.download_failed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async () => {
    try {
      const response = await api.getYearOverYear();
      setComparison(response.data);
    } catch (error) {
      console.error('Error fetching comparison:', error);
    }
  };

  const handlePeriodChange = (value) => {
    setPeriod(value);
    if (value === 'month' || value === 'year') {
      setYear(currentYear);
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

  const {
    summary,
    stockSummary,
    productStockMovements,
    productFinancials,
    paymentMethods,
    topProducts,
    orders,
    monthlyBreakdown
  } = data;

  const getNetStockColor = (value) => {
    if (value > 0) return '#10b981';
    if (value < 0) return '#ef4444';
    return '#6b7280';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('reports.sales.title')}</h1>
          <p>{t('reports.sales.subtitle')}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="report-tabs">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`report-tab ${period === opt.value ? 'active' : ''}`}
              onClick={() => handlePeriodChange(opt.value)}
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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <FiDollarSign size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalSales || 0)}</h3>
            <p>{t('reports.sales.total_sales_title')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
            <FiTrendingUp size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalProfit || 0)}</h3>
            <p>{t('reports.sales.profit_title')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
            <FiCreditCard size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalPaymentsReceived || 0)}</h3>
            <p>{t('reports.sales.money_received_title')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>
            <FiPercent size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalVATFromPayments || 0)}</h3>
            <p>{t('reports.sales.vat_collected_title')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <FiClock size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.outstandingCredit || 0)}</h3>
            <p>{t('reports.sales.outstanding_title')}</p>
          </div>
        </div>
      </div>

      <div className="stats-grid-4" style={{ marginTop: '14px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <FiDollarSign size={20} />
          </div>
          <div className="stat-info">
            <h3>
              {formatCurrency((summary.totalPaymentsReceived || 0) + (summary.totalVATFromPayments || 0))}
            </h3>
            <p>{t('reports.sales.total_received_title')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
            <FiShoppingCart size={20} />
          </div>
          <div className="stat-info">
            <h3>{summary.totalOrders || 0}</h3>
            <p>{t('reports.sales.total_orders_title')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
            <FiBarChart2 size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.averageOrderValue || 0)}</h3>
            <p>{t('reports.sales.avg_order_title')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
            <FiPackage size={20} />
          </div>
          <div className="stat-info">
            <h3>{summary.totalItems || 0}</h3>
            <p>{t('reports.sales.items_sold_title')}</p>
          </div>
        </div>
      </div>

      {stockSummary && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>{t('reports.sales.stock_summary_title')}</h3>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                <FiArrowUpCircle size={20} />
              </div>
              <div className="stat-info">
                <h3>+{stockSummary.stockAdded || 0}</h3>
                <p>{t('reports.sales.stock_added')}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                <FiArrowDownCircle size={20} />
              </div>
              <div className="stat-info">
                <h3>-{stockSummary.stockSold || 0}</h3>
                <p>{t('reports.sales.stock_sold')}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>
                <FiTrendingDown size={20} />
              </div>
              <div className="stat-info">
                <h3>{stockSummary.stockAdjusted || 0}</h3>
                <p>{t('reports.sales.stock_adjusted')}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
                <FiRefreshCw size={20} />
              </div>
              <div className="stat-info">
                <h3>+{stockSummary.stockReturned || 0}</h3>
                <p>{t('reports.sales.stock_returned')}</p>
              </div>
            </div>
          </div>
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: stockSummary.netStockChange > 0 ? '#ecfdf5' :
                             stockSummary.netStockChange < 0 ? '#f2f8f1' : '#f3f4f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <strong>{t('reports.sales.net_stock_change')}</strong>
            <span style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: getNetStockColor(stockSummary.netStockChange || 0)
            }}>
              {stockSummary.netStockChange > 0 ? '+' : ''}{stockSummary.netStockChange || 0}{' '}
              {t('reports.sales.units')}
            </span>
          </div>
        </div>
      )}

      {productStockMovements && productStockMovements.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>{t('reports.sales.product_movements_title')}</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('reports.sales.movement_columns.product')}</th>
                  <th>{t('reports.sales.movement_columns.opening')}</th>
                  <th>{t('reports.sales.movement_columns.added')}</th>
                  <th>{t('reports.sales.movement_columns.sold')}</th>
                  <th>{t('reports.sales.movement_columns.adjusted')}</th>
                  <th>{t('reports.sales.movement_columns.returned')}</th>
                  <th>{t('reports.sales.movement_columns.closing')}</th>
                </tr>
              </thead>
              <tbody>
                {productStockMovements.map((item, index) => {
                  const netChange = item.netChange || 0;
                  return (
                    <tr key={index}>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td style={{ color: '#6b7280' }}>{item.openingStock || 0}</td>
                      <td style={{ color: '#059669' }}>+{item.added || 0}</td>
                      <td style={{ color: '#dc2626' }}>-{item.sold || 0}</td>
                      <td style={{ color: '#b45309' }}>{item.adjusted || 0}</td>
                      <td style={{ color: '#7c3aed' }}>+{item.returned || 0}</td>
                      <td style={{
                        fontWeight: 'bold',
                        color: netChange > 0 ? '#059669' : netChange < 0 ? '#dc2626' : '#6b7280'
                      }}>
                        {item.closingStock || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {productFinancials && productFinancials.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>{t('reports.sales.product_financials_title')}</h3>
          </div>

          <div className="stats-grid" style={{ marginBottom: '16px' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                <FiDollarSign size={20} />
              </div>
              <div className="stat-info">
                <h3>{formatCurrency(productFinancials.reduce((sum, p) => sum + p.sales, 0))}</h3>
                <p>{t('reports.sales.product_sales_total')}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                <FiCreditCard size={20} />
              </div>
              <div className="stat-info">
                <h3>{formatCurrency(productFinancials.reduce((sum, p) => sum + p.payments, 0))}</h3>
                <p>{t('reports.sales.product_money_total')}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>
                <FiPercent size={20} />
              </div>
              <div className="stat-info">
                <h3>{formatCurrency(productFinancials.reduce((sum, p) => sum + p.vat, 0))}</h3>
                <p>{t('reports.sales.product_vat_total')}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                <FiClock size={20} />
              </div>
              <div className="stat-info">
                <h3>{formatCurrency(productFinancials.reduce((sum, p) => sum + p.outstanding, 0))}</h3>
                <p>{t('reports.sales.product_outstanding_total')}</p>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('reports.sales.financial_columns.product')}</th>
                  <th style={{ textAlign: 'right' }}>{t('reports.sales.financial_columns.sales')}</th>
                  <th style={{ textAlign: 'right' }}>{t('reports.sales.financial_columns.payments')}</th>
                  <th style={{ textAlign: 'right' }}>{t('reports.sales.financial_columns.vat')}</th>
                  <th style={{ textAlign: 'right' }}>{t('reports.sales.financial_columns.outstanding')}</th>
                  <th style={{ textAlign: 'center' }}>{t('reports.sales.financial_columns.status')}</th>
                </tr>
              </thead>
              <tbody>
                {productFinancials.map((item, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td style={{ textAlign: 'right', color: '#059669', fontWeight: 500 }}>
                      {formatCurrency(item.sales || 0)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#1d4ed8', fontWeight: 500 }}>
                      {formatCurrency(item.payments || 0)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#b45309', fontWeight: 500 }}>
                      {formatCurrency(item.vat || 0)}
                    </td>
                    <td style={{
                      textAlign: 'right',
                      color: (item.outstanding || 0) > 0 ? '#dc2626' : '#6b7280',
                      fontWeight: 600
                    }}>
                      {formatCurrency(item.outstanding || 0)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {(item.outstanding || 0) > 0 ? (
                        <span className="badge badge-warning">
                          {t('reports.sales.financial_status.credit')}
                        </span>
                      ) : (
                        <span className="badge badge-success">
                          {t('reports.sales.financial_status.paid')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{
                backgroundColor: '#f8fafc',
                borderTop: '2px solid #0f172a',
                fontWeight: '700'
              }}>
                <tr>
                  <td style={{ fontWeight: '700', color: '#0f172a', padding: '12px 20px' }}>
                    <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t('reports.sales.totals_label')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', color: '#059669', fontWeight: '700', fontSize: '15px', padding: '12px 20px' }}>
                    {formatCurrency(productFinancials.reduce((sum, p) => sum + p.sales, 0))}
                  </td>
                  <td style={{ textAlign: 'right', color: '#1d4ed8', fontWeight: '700', fontSize: '15px', padding: '12px 20px' }}>
                    {formatCurrency(productFinancials.reduce((sum, p) => sum + p.payments, 0))}
                  </td>
                  <td style={{ textAlign: 'right', color: '#b45309', fontWeight: '700', fontSize: '15px', padding: '12px 20px' }}>
                    {formatCurrency(productFinancials.reduce((sum, p) => sum + p.vat, 0))}
                  </td>
                  <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: '700', fontSize: '15px', padding: '12px 20px' }}>
                    {formatCurrency(productFinancials.reduce((sum, p) => sum + p.outstanding, 0))}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 20px' }}>
                    <span className="badge badge-info" style={{ fontSize: '11px' }}>
                      {t('reports.sales.credit_count_badge', {
                        count: productFinancials.filter(p => p.outstanding > 0).length
                      })}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {comparison && comparison.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>{t('reports.sales.yoy_title')}</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('reports.sales.yoy_columns.year')}</th>
                  <th>{t('reports.sales.yoy_columns.sales')}</th>
                  <th>{t('reports.sales.yoy_columns.vat')}</th>
                  <th>{t('reports.sales.yoy_columns.orders')}</th>
                  <th>{t('reports.sales.yoy_columns.growth')}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((item) => (
                  <tr key={item.year}>
                    <td style={{ fontWeight: 700 }}>{item.year}</td>
                    <td>{formatCurrency(item.revenue)}</td>
                    <td style={{ color: '#b45309' }}>{formatCurrency(item.vat || 0)}</td>
                    <td>{item.orders}</td>
                    <td>
                      {item.growth !== null ? (
                        <span className={item.growth > 0 ? 'badge badge-success' : 'badge badge-danger'}>
                          {item.growth > 0 ? '+' : ''}{item.growth}%
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {monthlyBreakdown && monthlyBreakdown.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>{t('reports.sales.monthly_title')}</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('reports.sales.monthly_columns.month')}</th>
                  <th>{t('reports.sales.monthly_columns.sales')}</th>
                  <th>{t('reports.sales.monthly_columns.orders')}</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map((item) => (
                  <tr key={item.month}>
                    <td>{item.month}</td>
                    <td>{formatCurrency(item.revenue)}</td>
                    <td>{item.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>{t('reports.sales.payment_methods_title')}</h3>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <FiDollarSign size={20} />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(paymentMethods.cash || 0)}</h3>
              <p>{t('payments.list.methods.cash')}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>
              <FiSmartphone size={20} />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(paymentMethods.mpesa || 0)}</h3>
              <p>{t('payments.list.methods.mpesa')}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
              <FiSmartphone size={20} />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(paymentMethods.tigo_pesa || 0)}</h3>
              <p>{t('payments.list.methods.tigo_pesa')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>{t('reports.sales.top_products_title')}</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('reports.sales.top_columns.product')}</th>
                <th>{t('reports.sales.top_columns.quantity_sold')}</th>
                <th style={{ textAlign: 'right' }}>{t('reports.sales.top_columns.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center">{t('reports.sales.no_products_sold')}</td>
                </tr>
              ) : (
                topProducts.map((item, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(item.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>{t('reports.sales.recent_orders_title')}</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('reports.sales.recent_columns.order_number')}</th>
                <th>{t('reports.sales.recent_columns.customer')}</th>
                <th>{t('reports.sales.recent_columns.amount')}</th>
                <th>{t('reports.sales.recent_columns.status')}</th>
                <th>{t('reports.sales.recent_columns.payment')}</th>
                <th>{t('reports.sales.recent_columns.date')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">{t('reports.sales.no_orders')}</td>
                </tr>
              ) : (
                orders.map((order) => {
                  const paymentStatusRaw = (order.payment_status || 'unpaid').toLowerCase();
                  const isPartial = paymentStatusRaw === 'partial';
                  const isOpen = expandedPayments[order.id];
                  const paid = parseFloat(order.paid_amount) || 0;
                  const total = parseFloat(order.total_amount) || 0;
                  const owed = Math.max(0, total - paid);

                  const paymentMeta = {
                    paid: { label: t('status.paid'), color: '#0bc518' },
                    unpaid: { label: t('status.unpaid'), color: '#d00f0f' },
                    partial: { label: t('status.partial'), color: '#d97706' }
                  }[paymentStatusRaw] || { label: t('status.unpaid'), color: '#d00f0f' };

                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{order.order_number}</td>
                      <td>{order.customers?.name || t('orders.list.walk_in')}</td>
                      <td>{formatCurrency(order.total_amount)}</td>
                      <td>
                        <span className={`badge badge-${order.order_status}`}>
                          {t('status.' + (order.order_status || 'pending'))}
                        </span>
                      </td>
                      <td>
                        {!isPartial ? (
                          <span style={{
                            color: paymentMeta.color,
                            fontWeight: '600',
                            textTransform: 'capitalize'
                          }}>
                            {paymentMeta.label}
                          </span>
                        ) : (
                          <div>
                            <button
                              type="button"
                              onClick={() => togglePaymentExpanded(order.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                color: paymentMeta.color,
                                fontWeight: '600',
                                textTransform: 'capitalize'
                              }}
                            >
                              {paymentMeta.label}
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
                        )}
                      </td>
                      <td>{formatDate(order.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesReport;