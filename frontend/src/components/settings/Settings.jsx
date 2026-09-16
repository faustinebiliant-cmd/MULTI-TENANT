// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Settings
// Reads and writes the active business via /api/business/current
// Also manages branches (create, rename, activate, deactivate).
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUser, FiUsers, FiSettings, FiMoon, FiSun,
  FiPlus, FiEdit2, FiCheck, FiX, FiPower
} from 'react-icons/fi';
import { useApp } from '../../contexts/AppContext';
import { useShop } from '../../contexts/ShopContext';
import { useBranch } from '../../contexts/BranchContext';
import api from '../../api/client';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

const Settings = () => {
  const { darkMode, toggleDarkMode } = useApp();
  const { refresh: refreshShop } = useShop();
  const { activeBusinessId, refresh: refreshBranch } = useBranch();

  const [form, setForm] = useState({
    name: '',
    shop_name: '',
    location: '',
    phone: '',
    email: '',
    currency: 'TZS',
    vat_enabled: false,
    vat_rate: 18,
    tin: '',
    vrn: ''
  });

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Branch UI state
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', location: '', phone: '' });
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [editBranchValue, setEditBranchValue] = useState('');
  const [branchAction, setBranchAction] = useState(null); // { type: 'deactivate'|'activate', branch }

  // New business modal state
  const [showNewBusiness, setShowNewBusiness] = useState(false);
  const [newBusiness, setNewBusiness] = useState({
    name: '', branch_name: '', location: '', phone: '', email: ''
  });

  // ---------------------------------------------------------
  // Load business + branches
  // ---------------------------------------------------------
  const fetchBranches = useCallback(async () => {
    try {
      const list = await api.listBranches();
      setBranches(list);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }, []);

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const data = await api.getBusiness();
        if (!data || !data.id) {
          setLoaded(true);
          return;
        }

        setForm({
          name: data.name || '',
          shop_name: data.shopName || data.shop_name || '',
          location: data.location || '',
          phone: data.phone || '',
          email: data.email || '',
          currency: data.currency || 'TZS',
          vat_enabled: data.vat_enabled === true,
          vat_rate: parseFloat(data.vat_rate) || 18,
          tin: data.tin || '',
          vrn: data.vrn || ''
        });

        await fetchBranches();
      } catch (error) {
        console.error('Error fetching business:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoaded(true);
      }
    };
    fetchBusiness();
  }, [activeBusinessId, fetchBranches]);

  // ---------------------------------------------------------
  // Business form
  // ---------------------------------------------------------
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleVatToggle = (e) => {
    setForm({ ...form, vat_enabled: e.target.checked });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.updateBusiness({
        name: form.name,
        shop_name: form.shop_name,
        location: form.location,
        phone: form.phone,
        email: form.email,
        currency: form.currency,
        vat_enabled: form.vat_enabled,
        vat_rate: parseFloat(form.vat_rate) || 0,
        tin: form.tin,
        vrn: form.vrn
      });

      await refreshShop();
      await refreshBranch();
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Branch actions
  // ---------------------------------------------------------
  const handleAddBranch = async () => {
    if (!newBranch.name.trim()) {
      toast.error('Branch name is required');
      return;
    }

    try {
      await api.createBranch({
        name: newBranch.name.trim(),
        location: newBranch.location.trim() || '',
        phone: newBranch.phone.trim() || ''
      });
      toast.success('Branch created');
      setNewBranch({ name: '', location: '', phone: '' });
      setIsAddingBranch(false);
      await fetchBranches();
      await refreshBranch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create branch');
    }
  };

  const handleSaveBranchEdit = async (id) => {
    if (!editBranchValue.trim()) {
      toast.error('Branch name cannot be empty');
      return;
    }

    try {
      await api.updateBranch(id, { name: editBranchValue.trim() });
      toast.success('Branch updated');
      setEditingBranchId(null);
      setEditBranchValue('');
      await fetchBranches();
      await refreshBranch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update branch');
    }
  };

  const handleBranchToggleConfirm = async () => {
    if (!branchAction) return;
    const { type, branch } = branchAction;

    try {
      if (type === 'deactivate') {
        await api.deactivateBranch(branch.id);
        toast.success('Branch deactivated. Its data is preserved.');
      } else {
        await api.activateBranch(branch.id);
        toast.success('Branch activated');
      }
      setBranchAction(null);
      await fetchBranches();
      await refreshBranch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change branch status');
    }
  };

  // ---------------------------------------------------------
  // New business
  // ---------------------------------------------------------
  const handleCreateBusiness = async () => {
    if (!newBusiness.name.trim()) {
      toast.error('Business name is required');
      return;
    }
    if (!newBusiness.branch_name.trim()) {
      toast.error('First branch name is required');
      return;
    }

    try {
      await api.createBusiness({
        name: newBusiness.name.trim(),
        branch_name: newBusiness.branch_name.trim(),
        location: newBusiness.location.trim() || '',
        phone: newBusiness.phone.trim() || '',
        email: newBusiness.email.trim() || ''
      });
      toast.success('Business created. Reloading...');
      setShowNewBusiness(false);
      setNewBusiness({ name: '', branch_name: '', location: '', phone: '', email: '' });
      // Full reload to pull the new businesses list into BranchContext
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create business');
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
        <div>
          <h1>Settings</h1>
          <p>Manage your shop settings</p>
        </div>
        <button
          onClick={() => setShowNewBusiness(true)}
          className="btn btn-primary"
        >
          <FiPlus size={16} /> New Business
        </button>
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
          <h3>Business Identity</h3>
          <small style={{ color: '#6b7280', display: 'block', marginBottom: '16px' }}>
            The <strong>Business Name</strong> is internal — used in reports and switcher.
            The <strong>Display Name</strong> appears on receipts and the header.
          </small>

          <div className="grid-2">
            <div className="form-group">
              <label>Business Name (internal) *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g., OSWAGO Electronics"
                required
              />
            </div>
            <div className="form-group">
              <label>Display Name (on receipts) *</label>
              <input
                type="text"
                name="shop_name"
                value={form.shop_name}
                onChange={handleChange}
                placeholder="e.g., OSWAGO Electrical Equipment"
                required
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="0750825721"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="shop@example.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location / Address</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g., Darajani, Kigamboni, Dar es Salaam"
            />
          </div>

          <div className="form-group">
            <label>Currency</label>
            <select
              name="currency"
              value={form.currency}
              onChange={handleChange}
            >
              <option value="TZS">TZS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
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
                  checked={form.vat_enabled}
                  onChange={handleVatToggle}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>{form.vat_enabled ? 'VAT is enabled' : 'VAT is disabled'}</span>
              </div>
              <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                Enable this if your business is VAT registered with TRA
              </small>
            </div>

            {form.vat_enabled && (
              <>
                <div className="form-group">
                  <label>VAT Rate (%)</label>
                  <input
                    type="number"
                    name="vat_rate"
                    value={form.vat_rate}
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
                      value={form.tin}
                      onChange={handleChange}
                      placeholder="123-456-789"
                    />
                  </div>
                  <div className="form-group">
                    <label>VRN (VAT Registration No.)</label>
                    <input
                      type="text"
                      name="vrn"
                      value={form.vrn}
                      onChange={handleChange}
                      placeholder="40-123456-789"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0 }}>Branches</h3>
              <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                Each branch has its own products, customers, orders, and staff.
              </small>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingBranch(true)}
              className="btn btn-sm btn-primary"
            >
              <FiPlus size={14} /> Add Branch
            </button>
          </div>

          {isAddingBranch && (
            <div style={{
              padding: '14px',
              border: '1.5px solid var(--primary)',
              borderRadius: 'var(--radius)',
              marginBottom: '16px',
              background: 'var(--primary-soft)'
            }}>
              <div className="grid-2" style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Branch name *"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="form-control"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Location (optional)"
                  value={newBranch.location}
                  onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
                  className="form-control"
                />
              </div>
              <div className="flex" style={{ gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setIsAddingBranch(false); setNewBranch({ name: '', location: '', phone: '' }); }}
                  className="btn btn-sm btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddBranch}
                  className="btn btn-sm btn-primary"
                >
                  <FiPlus size={14} /> Create Branch
                </button>
              </div>
            </div>
          )}

          {branches.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: 'var(--gray)' }}>
              No branches yet. Click "Add Branch" to create one.
            </p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => {
                    const isEditing = editingBranchId === branch.id;
                    return (
                      <tr key={branch.id}>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editBranchValue}
                              onChange={(e) => setEditBranchValue(e.target.value)}
                              className="form-control"
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveBranchEdit(branch.id)}
                            />
                          ) : (
                            <strong>{branch.name}</strong>
                          )}
                        </td>
                        <td style={{ color: 'var(--gray)' }}>{branch.location || '-'}</td>
                        <td>
                          <span className={`badge ${branch.is_active ? 'badge-success' : 'badge-danger'}`}>
                            {branch.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="flex" style={{ gap: '6px', justifyContent: 'flex-end' }}>
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveBranchEdit(branch.id)}
                                  className="btn btn-sm btn-success"
                                >
                                  <FiCheck size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEditingBranchId(null); setEditBranchValue(''); }}
                                  className="btn btn-sm btn-secondary"
                                >
                                  <FiX size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => { setEditingBranchId(branch.id); setEditBranchValue(branch.name); }}
                                  className="btn btn-sm btn-secondary"
                                  title="Rename"
                                >
                                  <FiEdit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBranchAction({
                                    type: branch.is_active ? 'deactivate' : 'activate',
                                    branch
                                  })}
                                  className={`btn btn-sm ${branch.is_active ? 'btn-danger' : 'btn-success'}`}
                                  title={branch.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  <FiPower size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex" style={{ gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>

      {/* New Business Modal */}
      {showNewBusiness && (
        <div className="modal-overlay" onClick={() => setShowNewBusiness(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Create New Business</h2>
              <button
                onClick={() => setShowNewBusiness(false)}
                className="btn btn-sm btn-secondary"
              >
                <FiX size={16} />
              </button>
            </div>

            <p style={{ color: 'var(--gray)', fontSize: '13px', marginBottom: '16px' }}>
              Each business is completely separate: its own products, customers, staff, and settings.
              You will start with one branch.
            </p>

            <div className="form-group">
              <label>Business Name (internal) *</label>
              <input
                type="text"
                value={newBusiness.name}
                onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                placeholder="e.g., OSWAGO Cosmetics"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>First Branch Name *</label>
              <input
                type="text"
                value={newBusiness.branch_name}
                onChange={(e) => setNewBusiness({ ...newBusiness, branch_name: e.target.value })}
                placeholder="e.g., Main Branch"
              />
            </div>

            <div className="form-group">
              <label>Location (optional)</label>
              <input
                type="text"
                value={newBusiness.location}
                onChange={(e) => setNewBusiness({ ...newBusiness, location: e.target.value })}
                placeholder="e.g., Mwenge, Dar es Salaam"
              />
            </div>

            <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
              <button onClick={handleCreateBusiness} className="btn btn-primary" style={{ flex: 1 }}>
                <FiPlus size={16} /> Create Business
              </button>
              <button onClick={() => setShowNewBusiness(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm branch toggle */}
      <ConfirmDialog
        open={!!branchAction}
        title={branchAction?.type === 'deactivate' ? 'Deactivate Branch' : 'Activate Branch'}
        message={
          branchAction?.type === 'deactivate'
            ? `Deactivate "${branchAction?.branch?.name}"? Its orders, customers, and stock are preserved. Staff assigned to it must be moved first.`
            : `Reactivate "${branchAction?.branch?.name}"? It will become usable again.`
        }
        confirmLabel={branchAction?.type === 'deactivate' ? 'Deactivate' : 'Activate'}
        cancelLabel="Cancel"
        variant={branchAction?.type === 'deactivate' ? 'danger' : 'primary'}
        onConfirm={handleBranchToggleConfirm}
        onCancel={() => setBranchAction(null)}
      />
    </div>
  );
};

export default Settings;