// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Settings
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiUsers, FiSettings, FiMoon, FiSun } from 'react-icons/fi';
import { useApp } from '../../contexts/AppContext';
import { useShop } from '../../contexts/ShopContext';
import api from '../../api/client';
import toast from 'react-hot-toast';

const Settings = () => {
  const { darkMode, toggleDarkMode } = useApp();
  const { refresh: refreshShop } = useShop();

  const [shopSettings, setShopSettings] = useState({
    shopName: '',
    location: '',
    phone: '',
    email: '',
    currency: 'TZS',
    taxRate: '0',
    vat_enabled: false,
    vat_rate: 18,
    tin: '',
    vrn: ''
  });

  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        if (!data) return;

        setShopSettings({
          shopName: data.shopName || 'OSWAGO Electrical Equipment',
          location: data.location || '',
          phone: data.phone || '',
          email: data.email || '',
          currency: data.currency || 'TZS',
          taxRate: data.taxRate || '0',
          vat_enabled: data.vat_enabled === 'true' || data.vat_enabled === true,
          vat_rate: parseFloat(data.vat_rate) || 18,
          tin: data.tin || '',
          vrn: data.vrn || ''
        });
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoaded(true);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    setShopSettings({ ...shopSettings, [e.target.name]: e.target.value });
  };

  const handleVatToggle = (e) => {
    setShopSettings({ ...shopSettings, vat_enabled: e.target.checked });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.updateSettings({
        shopName: shopSettings.shopName,
        location: shopSettings.location,
        phone: shopSettings.phone,
        email: shopSettings.email,
        currency: shopSettings.currency,
        taxRate: shopSettings.taxRate,
        vat_enabled: shopSettings.vat_enabled,
        vat_rate: parseFloat(shopSettings.vat_rate),
        tin: shopSettings.tin,
        vrn: shopSettings.vrn
      });

      await refreshShop();

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (!loaded) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your shop settings</p>
      </div>

      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <Link to="/settings/profile" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FiUser size={24} style={{ color: '#3b82f6' }} />
            <div>
              <h3>Profile</h3>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Manage your account</p>
            </div>
          </div>
        </Link>
        <Link to="/staff" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FiUsers size={24} style={{ color: '#8b5cf6' }} />
            <div>
              <h3>Staff Management</h3>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Manage your team</p>
            </div>
          </div>
        </Link>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FiSettings size={24} style={{ color: '#f59e0b' }} />
            <div>
              <h3>Shop Settings</h3>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Configure your shop</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3>Appearance</h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {darkMode ? <FiMoon size={24} color="#8b5cf6" /> : <FiSun size={24} color="#f59e0b" />}
            <div>
              <h4 style={{ margin: 0 }}>{darkMode ? 'Dark Mode' : 'Light Mode'}</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                {darkMode ? 'Dark theme is active' : 'Light theme is active'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className="btn"
            style={{
              backgroundColor: darkMode ? '#8b5cf6' : '#f59e0b',
              color: '#fff',
              borderRadius: '50px',
              padding: '10px 24px'
            }}
          >
            {darkMode ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3>Shop Identity</h3>
          <div className="grid-2">
            <div className="form-group">
              <label>Shop Name</label>
              <input
                type="text"
                name="shopName"
                value={shopSettings.shopName}
                onChange={handleChange}
                placeholder="e.g., OSWAGO Electrical Equipment"
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={shopSettings.phone}
                onChange={handleChange}
                placeholder="0750825721"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Location / Address</label>
            <input
              type="text"
              name="location"
              value={shopSettings.location}
              onChange={handleChange}
              placeholder="e.g., Darajani, Kigamboni, Dar es Salaam"
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={shopSettings.email}
                onChange={handleChange}
                placeholder="shop@example.com"
              />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select
                name="currency"
                value={shopSettings.currency}
                onChange={handleChange}
              >
                <option value="TZS">TZS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h3>VAT Configuration</h3>
          <div style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>Enable VAT</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={shopSettings.vat_enabled}
                  onChange={handleVatToggle}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>{shopSettings.vat_enabled ? 'VAT is enabled' : 'VAT is disabled'}</span>
              </div>
              <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                Enable this if your business is VAT registered with TRA
              </small>
            </div>

            {shopSettings.vat_enabled && (
              <>
                <div className="form-group">
                  <label>VAT Rate (%)</label>
                  <input
                    type="number"
                    name="vat_rate"
                    value={shopSettings.vat_rate}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <small style={{ color: '#6b7280' }}>
                    Standard rate in Tanzania is 18%
                  </small>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>TIN (Taxpayer ID)</label>
                    <input
                      type="text"
                      name="tin"
                      value={shopSettings.tin}
                      onChange={handleChange}
                      placeholder="123-456-789"
                    />
                  </div>
                  <div className="form-group">
                    <label>VRN (VAT Registration No.)</label>
                    <input
                      type="text"
                      name="vrn"
                      value={shopSettings.vrn}
                      onChange={handleChange}
                      placeholder="40-123456-789"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex" style={{ gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;