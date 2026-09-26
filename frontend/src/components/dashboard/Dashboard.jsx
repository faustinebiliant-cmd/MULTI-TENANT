// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Dashboard
// ============================================================

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import StatsCards from './StatsCards';
import RecentOrders from './RecentOrders';
import LowStockAlerts from './LowStockAlerts';
import Loader from '../common/Loader';
import api from '../../api/client';

const Dashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <Loader message={t('dashboard.loading')} />;
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>{t('dashboard.title')}</h1>
        <p>{t('dashboard.welcome')}</p>
      </div>

      <div className="dashboard-stats">
        <StatsCards stats={stats} />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <RecentOrders orders={stats?.recentOrders || []} />
      </div>

      <div>
        <LowStockAlerts items={stats?.lowStock || []} />
      </div>
    </div>
  );
};

export default Dashboard;