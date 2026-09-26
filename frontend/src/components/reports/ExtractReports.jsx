// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Extract Reports
// ============================================================

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiDownload, FiFileText, FiDollarSign, FiCreditCard, FiPackage,
  FiBox, FiUsers, FiTruck, FiClipboard, FiTrendingUp, FiPercent, FiArchive
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const REPORT_TYPES = [
  {
    value: 'sales',
    labelKey: 'reports.extract.types.sales.label',
    descriptionKey: 'reports.extract.types.sales.description',
    icon: FiDollarSign,
    color: '#059669'
  },
  {
    value: 'payments',
    labelKey: 'reports.extract.types.payments.label',
    descriptionKey: 'reports.extract.types.payments.description',
    icon: FiCreditCard,
    color: '#1d4ed8'
  },
  {
    value: 'expenses',
    labelKey: 'reports.extract.types.expenses.label',
    descriptionKey: 'reports.extract.types.expenses.description',
    icon: FiFileText,
    color: '#b45309'
  },
  {
    value: 'products',
    labelKey: 'reports.extract.types.products.label',
    descriptionKey: 'reports.extract.types.products.description',
    icon: FiPackage,
    color: '#7c3aed'
  },
  {
    value: 'stock-movements',
    labelKey: 'reports.extract.types.stock-movements.label',
    descriptionKey: 'reports.extract.types.stock-movements.description',
    icon: FiBox,
    color: '#0891b2'
  },
  {
    value: 'customers',
    labelKey: 'reports.extract.types.customers.label',
    descriptionKey: 'reports.extract.types.customers.description',
    icon: FiUsers,
    color: '#10b981'
  },
  {
    value: 'suppliers',
    labelKey: 'reports.extract.types.suppliers.label',
    descriptionKey: 'reports.extract.types.suppliers.description',
    icon: FiTruck,
    color: '#f59e0b'
  },
  {
    value: 'purchase-orders',
    labelKey: 'reports.extract.types.purchase-orders.label',
    descriptionKey: 'reports.extract.types.purchase-orders.description',
    icon: FiClipboard,
    color: '#6366f1'
  },
  {
    value: 'profit',
    labelKey: 'reports.extract.types.profit.label',
    descriptionKey: 'reports.extract.types.profit.description',
    icon: FiTrendingUp,
    color: '#16a34a'
  },
  {
    value: 'vat',
    labelKey: 'reports.extract.types.vat.label',
    descriptionKey: 'reports.extract.types.vat.description',
    icon: FiPercent,
    color: '#d97706'
  },
  {
    value: 'full',
    labelKey: 'reports.extract.types.full.label',
    descriptionKey: 'reports.extract.types.full.description',
    icon: FiArchive,
    color: '#0a1730',
    featured: true
  }
];

const PERIOD_OPTIONS = [
  { value: 'today', labelKey: 'reports.common.periods.today' },
  { value: 'week', labelKey: 'reports.common.periods.week' },
  { value: 'month', labelKey: 'reports.common.periods.month' },
  { value: 'year', labelKey: 'reports.common.periods.year' },
  { value: 'custom', labelKey: 'reports.common.periods.custom' }
];

const MONTHS = [
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

const currentYear = new Date().getFullYear();
const AVAILABLE_YEARS = [];
for (let y = 2020; y <= currentYear; y++) {
  AVAILABLE_YEARS.push(y);
}

const ExtractReports = () => {
  const { t } = useTranslation();
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
      toast.error(t('reports.common.select_dates_error'));
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
        let errorMessage = t('reports.common.download_failed');
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

      toast.success(t('reports.extract.downloaded_toast', { filename: a.download }));
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.message || t('reports.common.download_failed'));
    } finally {
      setDownloading(false);
    }
  };

  const selectedType = REPORT_TYPES.find(r => r.value === selectedReport);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('reports.extract.title')}</h1>
          <p>{t('reports.extract.subtitle')}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>{t('reports.extract.step1_title')}</h3>
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
                  <strong>{t(report.labelKey)}</strong>
                  <span>{t(report.descriptionKey)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>{t('reports.extract.step2_title')}</h3>

        <div className="report-tabs">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`report-tab ${period === opt.value ? 'active' : ''}`}
              onClick={() => setPeriod(opt.value)}
            >
              {t(opt.labelKey)}
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
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>{t('reports.extract.step3_title')}</h3>
        <div className="flex" style={{ alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn btn-primary"
            style={{ padding: '12px 32px', fontSize: '14px' }}
          >
            <FiDownload size={18} />
            {downloading
              ? t('reports.extract.downloading_button')
              : t('reports.extract.download_button')}
          </button>
          <span style={{ fontSize: '13px', color: 'var(--gray)' }}>
            {selectedType ? t(selectedType.labelKey) : ''} —{' '}
            {period === 'today' && t('reports.common.periods.today')}
            {period === 'week' && t('reports.common.periods.week')}
            {period === 'month' && `${t('reports.common.months.' + month)} ${year}`}
            {period === 'year' && `${year}`}
            {period === 'custom' && (startDate && endDate
              ? `${startDate} ${t('reports.common.date_range_to')} ${endDate}`
              : t('reports.common.select_dates_error'))}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ExtractReports;