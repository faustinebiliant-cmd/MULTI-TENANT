// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Stats Cards
// ============================================================

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiDollarSign, FiCreditCard, FiClock, FiAlertTriangle, FiPercent, FiTrendingUp } from 'react-icons/fi';
import { formatCurrency } from '../../utils/helpers';

const StatsCards = ({ stats }) => {
  const { t } = useTranslation();

  if (!stats) return null;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSalesRep = user.role === 'sales_rep';
  const canSeeProfit = ['boss', 'manager'].includes(user.role);

  const safeStats = stats || {
    todaySales: 0,
    todayVATBilled: 0,
    businessMoneyReceived: 0,
    vatCollectedFromPayments: 0,
    outstandingCredit: 0,
    lowStockItems: 0,
    todayProfit: 0
  };

  const cards = [
    {
      title: t('stats.today_sales'),
      value: formatCurrency(safeStats.todaySales || 0),
      icon: FiDollarSign,
      color: 'var(--tone-green-text)',
      bg: 'var(--tone-green-bg)'
    }
  ];

  if (canSeeProfit) {
    cards.push({
      title: t('stats.today_profit'),
      value: formatCurrency(safeStats.todayProfit || 0),
      icon: FiTrendingUp,
      color: 'var(--tone-purple-text)',
      bg: 'var(--tone-purple-bg)'
    });
  }

  cards.push(
    {
      title: t('stats.business_money_received'),
      value: formatCurrency(safeStats.businessMoneyReceived || 0),
      icon: FiCreditCard,
      color: 'var(--tone-blue-text)',
      bg: 'var(--tone-blue-bg)'
    },
    {
      title: t('stats.vat_collected'),
      value: formatCurrency(safeStats.vatCollectedFromPayments || 0),
      icon: FiPercent,
      color: 'var(--tone-amber-text)',
      bg: 'var(--tone-amber-bg)'
    },
    {
      title: t('stats.outstanding_credit'),
      value: formatCurrency(safeStats.outstandingCredit || 0),
      icon: FiClock,
      color: 'var(--tone-red-text)',
      bg: 'var(--tone-red-bg)'
    }
  );

  if (!isSalesRep) {
    cards.push({
      title: t('stats.low_stock_items'),
      value: safeStats.lowStockItems || 0,
      icon: FiAlertTriangle,
      color: 'var(--tone-red-text)',
      bg: 'var(--tone-red-bg)'
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