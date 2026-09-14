// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Stats Cards
// ============================================================

import React from 'react';
import { FiDollarSign, FiCreditCard, FiClock, FiAlertTriangle, FiPercent } from 'react-icons/fi';
import { formatCurrency } from '../../utils/helpers';

const StatsCards = ({ stats }) => {
  if (!stats) return null;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSalesRep = user.role === 'sales_rep';

  const safeStats = stats || {
    todaySales: 0,
    todayVATBilled: 0,
    businessMoneyReceived: 0,
    vatCollectedFromPayments: 0,
    outstandingCredit: 0,
    lowStockItems: 0
  };

  // Backend sends todayVATBilled; fallback to legacy todayVAT
  const vatBilled = safeStats.todayVATBilled ?? safeStats.todayVAT ?? 0;

  const cards = [
    {
      title: "Today's Sales",
      value: formatCurrency(safeStats.todaySales || 0),
      icon: FiDollarSign,
      color: '#059669',
      bg: '#ecfdf5'
    },
    {
      title: 'Business Money Received',
      value: formatCurrency(safeStats.businessMoneyReceived || 0),
      icon: FiCreditCard,
      color: '#1d4ed8',
      bg: '#eff6ff'
    },
    {
      title: 'VAT Collected',
      value: formatCurrency(safeStats.vatCollectedFromPayments || 0),
      icon: FiPercent,
      color: '#b45309',
      bg: '#fffbeb'
    },
    {
      title: 'Outstanding Credit',
      value: formatCurrency(safeStats.outstandingCredit || 0),
      icon: FiClock,
      color: '#dc2626',
      bg: '#fef2f2'
    }
  ];

  if (!isSalesRep) {
    cards.push({
      title: 'Low Stock Items',
      value: safeStats.lowStockItems || 0,
      icon: FiAlertTriangle,
      color: '#dc2626',
      bg: '#fef2f2'
    });
  }

  return (
    <div className="stats-grid">
      {cards.map((card, index) => (
        <div className="stat-card" key={index}>
          <div className="stat-icon" style={{ backgroundColor: card.bg, color: card.color }}>
            <card.icon size={20} />
          </div>
          <div className="stat-info">
            <h3>{card.value}</h3>
            <p>{card.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;