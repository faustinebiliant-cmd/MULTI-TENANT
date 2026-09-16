// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Extract Reports
// ============================================================

import React, { useState } from 'react';
import {
  FiDownload, FiFileText, FiDollarSign, FiCreditCard, FiPackage,
  FiBox, FiUsers, FiTruck, FiClipboard, FiTrendingUp, FiPercent, FiArchive
} from 'react-icons/fi';
import api from '../../api/client';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const REPORT_TYPES = [
  {
    value: 'sales',
    label: 'Sales Report',
    description: 'Orders, items, payments, and product breakdown',
    icon: FiDollarSign,
    color: '#059669'
  },
  {
    value: 'payments',
    label: 'Payments Report',
    description: 'All payments received with methods and references',
    icon: FiCreditCard,
    color: '#1d4ed8'
  },
  {
    value: 'expenses',
    label: 'Expenses Report',
    description: 'All expenses with category breakdown',
    icon: FiFileText,
    color: '#b45309'
  },
  {
    value: 'products',
    label: 'Products Report',
    description: 'Full product list with pricing and stock',
    icon: FiPackage,
    color: '#7c3aed'
  },
  {
    value: 'stock-movements',
    label: 'Stock Movements Report',
    description: 'Every stock movement (sale, purchase, adjustment, return)',
    icon: FiBox,
    color: '#0891b2'
  },
  {
    value: 'customers',
    label: 'Customers Report',
    description: 'All customers with order history and spend',
    icon: FiUsers,
    color: '#10b981'
  },
  {
    value: 'suppliers',
    label: 'Suppliers Report',
    description: 'All suppliers with contact information',
    icon: FiTruck,
    color: '#f59e0b'
  },
  {
    value: 'purchase-orders',
    label: 'Purchase Orders Report',
    description: 'All POs to suppliers with line items',
    icon: FiClipboard,
    color: '#6366f1'
  },
  {
    value: 'profit',
    label: 'Profit & Loss Report',
    description: 'Revenue, cost, expenses, and net profit',
    icon: FiTrendingUp,
    color: '#16a34a'
  },
  {
    value: 'vat',
    label: 'VAT Report',
    description: 'VAT collected for tax filing',
    icon: FiPercent,
    color: '#d97706'
  },
  {
    value: 'full',
    label: 'Full Report (Everything)',
    description: 'All reports combined in one workbook',
    icon: FiArchive,
    color: '#0a1730',
    featured: true
  }
];

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom Range' }
];

const MONTHS = [
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

const currentYear = new Date().getFullYear();
const AVAILABLE_YEARS = [];
for (let y = 2020; y <= currentYear; y++) {
  AVAILABLE_YEARS.push(y);
}

const ExtractReports = () => {
  const [selectedReport, setSelectedReport] = useState('sales');
  const [period, setPeriod] = useState('today');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloading, setDownloading] = useState(false);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (period === 'today') params.append('period', 'today');
    else if (period === 'week') params.append('period', 'week');
    else if (period === 'year') params.append('year', year);
    else if (period === 'month') {
      params.append('year', year);
      params.append('month', month);
    } else if (period === 'custom') {
      params.append('startDate', startDate);
      params.append('endDate', endDate);
    }
    return params.toString();
  };

const handleDownload = async () => {
    if (period === 'custom' && (!startDate || !endDate)) {
      toast.error('Please select both start and end dates');
      return;
    }

    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const businessId = localStorage.getItem('activeBusinessId');
      const branchId = localStorage.getItem('activeBranchId');
      const queryString = buildQueryString();

      const response = await fetch(
        `${API_URL}/reports/export/${selectedReport}?${queryString}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Business-Id': businessId || '',
            'X-Branch-Id': branchId || ''
          }
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to generate report';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Non-JSON error body
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const cd = response.headers.get('content-disposition');
      const match = cd && cd.match(/filename="(.+)"/);
      a.download = match ? match[1] : `oswago-${selectedReport}.xlsx`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Downloaded: ${a.download}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Extract Reports</h1>
          <p>Download shop data as Excel files</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>1. Choose a report</h3>
        <div className="report-type-grid">
          {REPORT_TYPES.map((report) => {
            const Icon = report.icon;
            const isSelected = selectedReport === report.value;
            return (
              <button
                key={report.value}
                type="button"
                onClick={() => setSelectedReport(report.value)}
                className={`report-type-card ${isSelected ? 'active' : ''}`}
                style={{ borderColor: isSelected ? report.color : undefined }}
              >
                <div
                  className="report-type-icon"
                  style={{
                    backgroundColor: `${report.color}15`,
                    color: report.color
                  }}
                >
                  <Icon size={22} />
                </div>
                <div className="report-type-info">
                  <strong>{report.label}</strong>
                  <span>{report.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>2. Choose a period</h3>

        <div className="report-tabs">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`report-tab ${period === opt.value ? 'active' : ''}`}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex" style={{
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginTop: '16px'
        }}>
          {(period === 'month' || period === 'year') && (
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="form-control"
              style={{ width: '120px' }}
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          {period === 'month' && (
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="form-control"
              style={{ width: '160px' }}
            >
              {MONTHS.map((m) => (
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
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>3. Download</h3>
        <div className="flex" style={{ alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn btn-primary"
            style={{ padding: '12px 32px', fontSize: '14px' }}
          >
            <FiDownload size={18} />
            {downloading ? 'Generating...' : 'Download Excel File'}
          </button>
          <span style={{ fontSize: '13px', color: 'var(--gray)' }}>
            {REPORT_TYPES.find(r => r.value === selectedReport)?.label} —{' '}
            {period === 'today' && 'Today'}
            {period === 'week' && 'This Week'}
            {period === 'month' && `${MONTHS.find(m => m.value === month)?.label} ${year}`}
            {period === 'year' && `${year}`}
            {period === 'custom' && (startDate && endDate ? `${startDate} to ${endDate}` : 'Select dates')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ExtractReports;