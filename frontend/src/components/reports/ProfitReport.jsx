// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Profit Report
// ============================================================

import React, { useState } from 'react';
import { formatCurrency } from '../../utils/helpers';

const ProfitReport = () => {
  const [period, setPeriod] = useState('today');

  // Mock data
  const profitData = {
    today: {
      revenue: 450000,
      cost: 270000,
      profit: 180000,
      margin: 40,
      items: [
        { name: 'Cable 2.5mm', revenue: 250000, cost: 150000, profit: 100000 },
        { name: 'Switch 16A', revenue: 28000, cost: 16000, profit: 12000 },
        { name: 'LED Bulb 9W', revenue: 82500, cost: 45000, profit: 37500 },
      ]
    },
    week: {
      revenue: 2850000,
      cost: 1710000,
      profit: 1140000,
      margin: 40,
      items: [
        { name: 'Cable 2.5mm', revenue: 1375000, cost: 825000, profit: 550000 },
        { name: 'MCB 20A', revenue: 210000, cost: 120000, profit: 90000 },
        { name: 'Socket 13A', revenue: 202500, cost: 112500, profit: 90000 },
      ]
    },
    month: {
      revenue: 12850000,
      cost: 7710000,
      profit: 5140000,
      margin: 40,
      items: [
        { name: 'Cable 2.5mm', revenue: 6125000, cost: 3675000, profit: 2450000 },
        { name: 'LED Bulb 9W', revenue: 1760000, cost: 960000, profit: 800000 },
        { name: 'Switch 16A', revenue: 630000, cost: 360000, profit: 270000 },
      ]
    }
  };

  const data = profitData[period] || profitData.today;

  return (
    <div>
      <div className="page-header">
        <h1>📊 Profit Report</h1>
        <p>View profit and loss analysis</p>
      </div>

      <div className="card">
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

      <div className="grid-3">
        <div className="card">
          <h3>💰 Revenue</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>
            {formatCurrency(data.revenue)}
          </p>
        </div>
        <div className="card">
          <h3>📉 Cost</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>
            {formatCurrency(data.cost)}
          </p>
        </div>
        <div className="card">
          <h3>📈 Profit</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
            {formatCurrency(data.profit)}
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Margin: {data.margin}%
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Product Profit Breakdown</h3>
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
              {data.items.map((item, index) => {
                const margin = item.revenue > 0 ? Math.round((item.profit / item.revenue) * 100) : 0;
                return (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>{formatCurrency(item.revenue)}</td>
                    <td>{formatCurrency(item.cost)}</td>
                    <td style={{ color: '#10b981' }}>{formatCurrency(item.profit)}</td>
                    <td>
                      <span className="badge badge-success">{margin}%</span>
                    </td>
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

export default ProfitReport;