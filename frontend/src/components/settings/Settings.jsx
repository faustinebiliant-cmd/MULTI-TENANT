// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Settings
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiUsers, FiSettings, FiMoon, FiSun } from 'react-icons/fi';
import { useApp } from '../../contexts/AppContext';
import api from '../../api/client';
import toast from 'react-hot-toast';

const Settings = () => {
    const { darkMode, toggleDarkMode } = useApp();

    const [shopSettings, setShopSettings] = useState({
        shopName: 'OSWAGO Electrical Equipment',
        location: 'Darajani, Kigamboni, Dar es Salaam',
        phone: '0750825721',
        email: 'faustinebiliant@gmail.com',
        currency: 'TZS',
        taxRate: '0',
        // VAT Settings
        vat_enabled: false,
        vat_rate: 18,
        tin: '',
        vrn: ''
    });

    const [loading, setLoading] = useState(false);

    // ✅ Load settings from API on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.getSettings();
                console.log('📦 Settings fetched:', data);
                
                if (data) {
                    setShopSettings(prev => ({
                        ...prev,
                        vat_enabled: data.vat_enabled === 'true' || data.vat_enabled === true || false,
                        vat_rate: parseFloat(data.vat_rate) || 18,
                        tin: data.tin || '',
                        vrn: data.vrn || ''
                    }));
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        setShopSettings({
            ...shopSettings,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // ✅ Save to real API
            await api.updateSettings({
                vat_enabled: shopSettings.vat_enabled,
                vat_rate: parseFloat(shopSettings.vat_rate),
                tin: shopSettings.tin,
                vrn: shopSettings.vrn
            });
            toast.success('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const handleVatToggle = (e) => {
        setShopSettings({
            ...shopSettings,
            vat_enabled: e.target.checked
        });
    };

    return (
        <div>
            <div className="page-header">
                <h1>⚙️ Settings</h1>
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
                <Link to="/settings/users" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
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

            {/* ✅ DARK MODE TOGGLE */}
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

            {/* ✅ VAT CONFIGURATION */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3>🇹🇿 VAT Configuration</h3>
                <div style={{ marginTop: '16px' }}>
                    <div className="form-group">
                        <label>Enable VAT</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="checkbox"
                                checked={shopSettings.vat_enabled}
                                onChange={handleVatToggle}
                                style={{ width: 'auto', height: '20px', width: '20px' }}
                            />
                            <span>{shopSettings.vat_enabled ? 'VAT is ENABLED' : 'VAT is DISABLED'}</span>
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

            {/* ✅ SHOP CONFIGURATION */}
            <div className="card" style={{ maxWidth: '600px' }}>
                <h3>Shop Configuration</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Shop Name</label>
                        <input
                            type="text"
                            name="shopName"
                            value={shopSettings.shopName}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Location</label>
                        <input
                            type="text"
                            name="location"
                            value={shopSettings.location}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone</label>
                        <input
                            type="tel"
                            name="phone"
                            value={shopSettings.phone}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={shopSettings.email}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid-2">
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
                        <div className="form-group">
                            <label>Tax Rate (%)</label>
                            <input
                                type="number"
                                name="taxRate"
                                value={shopSettings.taxRate}
                                onChange={handleChange}
                                placeholder="0"
                                min="0"
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Settings;