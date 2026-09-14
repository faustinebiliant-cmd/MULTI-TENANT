// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Dashboard
// ============================================================

import React, { useState, useEffect } from 'react';
import StatsCards from './StatsCards';
import RecentOrders from './RecentOrders';
import LowStockAlerts from './LowStockAlerts';
import Loader from '../common/Loader';
import api from '../../api/client';

const Dashboard = () => {
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
        return <Loader message="Loading dashboard..." />;
    }

    return (
        <div className="dashboard">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Welcome back! Here's your shop overview.</p>
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