import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBriefcase,
  FiUsers,
  FiShoppingCart,
  FiActivity,
  FiUserCheck
} from 'react-icons/fi';
import adminApi from '../../api/adminClient';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminApi.metrics();
        setMetrics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="admin-loading">Loading metrics...</div>;
  if (!metrics) return <div className="admin-loading">Failed to load.</div>;

  // Businesses per customer — shows if clients run multiple shops
  const businessesPerCustomer =
    metrics.bossesTotal > 0
      ? (metrics.businessesTotal / metrics.bossesTotal).toFixed(2)
      : '0.00';

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Platform Overview</h1>
        <p>Everything happening across your SaaS</p>
      </div>

      <div className="admin-stats-grid">
        <StatCard
          icon={<FiUsers />}
          label="Customers (Bosses)"
          value={metrics.bossesTotal}
          tone="primary"
        />
        <StatCard
          icon={<FiUserCheck />}
          label="Staff Accounts"
          value={metrics.staffTotal}
          tone="muted"
        />
        <StatCard
          icon={<FiBriefcase />}
          label="Total Businesses"
          value={metrics.businessesTotal}
        />
        <StatCard
          icon={<FiActivity />}
          label="Active Businesses"
          value={metrics.businessesActive}
          tone="green"
        />
        <StatCard
          icon={<FiShoppingCart />}
          label="Total Orders"
          value={metrics.ordersTotal}
        />
      </div>

      <div className="admin-card admin-metrics-note">
        <div className="admin-metrics-row">
          <span className="admin-metrics-label">Total user accounts:</span>
          <span className="admin-metrics-value">{metrics.usersTotal ?? 0}</span>
        </div>
        <div className="admin-metrics-row">
          <span className="admin-metrics-label">Businesses per customer:</span>
          <span className="admin-metrics-value">{businessesPerCustomer}</span>
        </div>
      </div>

      <div className="admin-card">
        <h3>Signups — Last 30 Days</h3>
        <div className="admin-sparkline">
          {metrics.signupsSeries?.map((point) => {
            const max = Math.max(...metrics.signupsSeries.map(p => p.count), 1);
            const height = (point.count / max) * 100;
            return (
              <div
                key={point.date}
                className="admin-sparkline-bar"
                style={{ height: `${Math.max(height, 3)}%` }}
                title={`${point.date}: ${point.count}`}
              />
            );
          })}
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h3>Recent Businesses</h3>
          <Link to="/admin/businesses" className="admin-btn admin-btn--sm">View all</Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentBusinesses?.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong></td>
                  <td><code>{b.business_code || '—'}</code></td>
                  <td>{b.owner?.email || '—'}</td>
                  <td>
                    <span className={`admin-badge ${b.is_active ? 'admin-badge--success' : 'admin-badge--danger'}`}>
                      {b.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td>{new Date(b.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/admin/businesses/${b.id}`} className="admin-btn admin-btn--sm">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, tone }) => (
  <div className="admin-stat-card">
    <div className={`admin-stat-icon ${tone ? 'admin-stat-icon--' + tone : ''}`}>{icon}</div>
    <div>
      <div className="admin-stat-value">{value ?? 0}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  </div>
);

export default AdminDashboard;