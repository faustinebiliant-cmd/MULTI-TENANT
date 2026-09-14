// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Sales Report
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  FiDollarSign, FiCreditCard, FiClock, FiShoppingCart, FiBarChart2,
  FiPackage, FiSmartphone, FiTrendingDown, FiArrowUpCircle,
  FiArrowDownCircle, FiRefreshCw, FiPercent
} from 'react-icons/fi';
import { formatCurrency, formatDate } from '../../utils/helpers';
import api from '../../api/client';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const SalesReport = () => {
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
      toast.error('Failed to load sales report');
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
      toast.error('Please select both start and end dates');
    }
  };

  if (loading) return <Loader message="Loading sales report..." />;

  if (!data) {
    return (
      <div className="empty-state">
        <h3>No data available</h3>
        <p>No sales found for this period</p>
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
          <h1>Sales Report</h1>
          <p>View sales performance</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="report-tabs">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              className={`report-tab ${period === opt.value ? 'active' : ''}`}
              onClick={() => handlePeriodChange(opt.value)}
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
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <FiDollarSign size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalSales || 0)}</h3>
            <p>Total Sales — Without VAT</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
            <FiCreditCard size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalPaymentsReceived || 0)}</h3>
            <p>Business Money Received</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>
            <FiPercent size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.totalVATFromPayments || 0)}</h3>
            <p>VAT Collected</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <FiClock size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.outstandingCredit || 0)}</h3>
            <p>Outstanding Credit</p>
          </div>
        </div>
      </div>

      <div className="stats-grid-4">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <FiDollarSign size={20} />
          </div>
          <div className="stat-info">
            <h3>
              {formatCurrency((summary.totalPaymentsReceived || 0) + (summary.totalVATFromPayments || 0))}
            </h3>
            <p>Total Money Received</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
            <FiShoppingCart size={20} />
          </div>
          <div className="stat-info">
            <h3>{summary.totalOrders || 0}</h3>
            <p>Total Orders</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
            <FiBarChart2 size={20} />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(summary.averageOrderValue || 0)}</h3>
            <p>Average Order (excl. VAT)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
            <FiPackage size={20} />
          </div>
          <div className="stat-info">
            <h3>{summary.totalItems || 0}</h3>
            <p>Items Sold</p>
          </div>
        </div>
      </div>

      {/* Stock movement summary */}
      {stockSummary && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>Stock Movement Summary</h3>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                <FiArrowUpCircle size={20} />
              </div>
              <div className="stat-info">
                <h3>+{stockSummary.stockAdded || 0}</h3>
                <p>Stock Added</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                <FiArrowDownCircle size={20} />
              </div>
              <div className="stat-info">
                <h3>-{stockSummary.stockSold || 0}</h3>
                <p>Stock Sold</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>
                <FiTrendingDown size={20} />
              </div>
              <div className="stat-info">
                <h3>{stockSummary.stockAdjusted || 0}</h3>
                <p>Stock Adjusted</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
                <FiRefreshCw size={20} />
              </div>
              <div className="stat-info">
                <h3>+{stockSummary.stockReturned || 0}</h3>
                <p>Stock Returned</p>
              </div>
            </div>
          </div>
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: stockSummary.netStockChange > 0 ? '#ecfdf5' :
                             stockSummary.netStockChange < 0 ? '#fef2f2' : '#f3f4f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <strong>Net Stock Change:</strong>
            <span style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: getNetStockColor(stockSummary.netStockChange || 0)
            }}>
              {stockSummary.netStockChange > 0 ? '+' : ''}{stockSummary.netStockChange || 0} units
            </span>
          </div>
        </div>
      )}

      {/* Product stock movements */}
      {productStockMovements && productStockMovements.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>Product Stock Movements</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Opening</th>
                  <th>Added</th>
                  <th>Sold</th>
                  <th>Adjusted</th>
                  <th>Returned</th>
                  <th>Closing</th>
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

      {/* Product financial summary */}
      {productFinancials && productFinancials.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>Product Financial Summary</h3>
          </div>

          <div className="stats-grid" style={{ marginBottom: '16px' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                <FiDollarSign size={20} />
              </div>
              <div className="stat-info">
                <h3>{formatCurrency(productFinancials.reduce((sum, p) => sum + p.sales, 0))}</h3>
                <p>Total Sales (excl. VAT)</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                <FiCreditCard size={20} />
              </div>
              <div className="stat-info">
                <h3>{formatCurrency(productFinancials.reduce((sum, p) => sum + p.payments, 0))}</h3>
                <p>Business Money Received</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>
                <FiPercent size={20} />
              </div>
              <div className="stat-info">
                <h3>{formatCurrency(productFinancials.reduce((sum, p) => sum + p.vat, 0))}</h3>
                <p>VAT Collected</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                <FiClock size={20} />
              </div>
              <div className="stat-info">
                <h3>{formatCurrency(productFinancials.reduce((sum, p) => sum + p.outstanding, 0))}</h3>
                <p>Outstanding Credit</p>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Sales</th>
                  <th style={{ textAlign: 'right' }}>Payments</th>
                  <th style={{ textAlign: 'right' }}>VAT Collected</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
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
                        <span className="badge badge-warning">Credit</span>
                      ) : (
                        <span className="badge badge-success">Paid</span>
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
                      Totals
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
                      {productFinancials.filter(p => p.outstanding > 0).length} Credit
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Year over year */}
      {comparison && comparison.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>Year-over-Year Comparison</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Sales</th>
                  <th>VAT</th>
                  <th>Orders</th>
                  <th>Growth</th>
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

      {/* Monthly breakdown */}
      {monthlyBreakdown && monthlyBreakdown.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>Monthly Breakdown</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Sales</th>
                  <th>Orders</th>
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

      {/* Payment methods */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>Money Received By Method</h3>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <FiDollarSign size={20} />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(paymentMethods.cash || 0)}</h3>
              <p>Cash</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>
              <FiSmartphone size={20} />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(paymentMethods.mpesa || 0)}</h3>
              <p>M-Pesa</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
              <FiSmartphone size={20} />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(paymentMethods.tigo_pesa || 0)}</h3>
              <p>Tigo Pesa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top products */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>Top Selling Products</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity Sold</th>
                <th style={{ textAlign: 'right' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center">No products sold</td>
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

      {/* Recent orders */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3>Recent Orders</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">No orders found</td>
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
                    paid: { label: 'Paid', color: '#0bc518' },
                    unpaid: { label: 'Unpaid', color: '#d00f0f' },
                    partial: { label: 'Partial', color: '#d97706' }
                  }[paymentStatusRaw] || { label: 'Unpaid', color: '#d00f0f' };

                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{order.order_number}</td>
                      <td>{order.customers?.name || 'Walk-in'}</td>
                      <td>{formatCurrency(order.total_amount)}</td>
                      <td>
                        <span className={`badge badge-${order.order_status}`}>
                          {order.order_status?.toUpperCase() || 'PENDING'}
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