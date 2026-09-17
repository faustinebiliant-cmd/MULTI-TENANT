// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Settings
// - My Businesses: switch / deactivate / force-delete
// - Active business: edit identity, VAT
// - Branches: add / rename / deactivate / force-delete
// Force delete requires typing the name twice for confirmation.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUser, FiUsers, FiSettings, FiMoon, FiSun,
  FiPlus, FiEdit2, FiCheck, FiX, FiPower, FiTrash2, FiBriefcase
} from 'react-icons/fi';
import { useApp } from '../../contexts/AppContext';
import { useShop } from '../../contexts/ShopContext';
import { useBranch } from '../../contexts/BranchContext';
import api from '../../api/client';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

// Count non-branch rows that would be destroyed in a force delete
const totalRows = (counts) => {
  if (!counts) return 0;
  return Object.entries(counts)
    .filter(([k]) => k !== 'branches')
    .reduce((sum, [, n]) => sum + (n || 0), 0);
};

const Settings = () => {
  const { darkMode, toggleDarkMode } = useApp();
  const { refresh: refreshShop } = useShop();
  const { activeBusinessId, businesses, refresh: refreshBranch, switchBusiness } = useBranch();

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
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', location: '', phone: '' });
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [editBranchValue, setEditBranchValue] = useState('');
  const [branchAction, setBranchAction] = useState(null);

  // New business modal
  const [showNewBusiness, setShowNewBusiness] = useState(false);
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [newBusiness, setNewBusiness] = useState({
    name: '', branch_name: '', location: '', phone: '', email: ''
  });

  // Business lifecycle modals
  const [businessAction, setBusinessAction] = useState(null); // { type: 'deactivate'|'activate'|'delete', business, counts }

  // Force delete confirmation state
  const [forceDelete, setForceDelete] = useState(null); // { kind: 'business'|'branch', id, name, counts, confirmName, confirmWord }

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
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Branch actions
  // ---------------------------------------------------------
  const handleAddBranch = async () => {
    if (creatingBranch) return;
    if (!newBranch.name.trim()) {
      toast.error('Branch name is required');
      return;
    }

    setCreatingBranch(true);
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
    } finally {
      setCreatingBranch(false);
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
        toast.success('Branch deactivated');
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
  // Business lifecycle
  // ---------------------------------------------------------
  const handleCreateBusiness = async () => {
    if (creatingBusiness) return;
    if (!newBusiness.name.trim()) {
      toast.error('Business name is required');
      return;
    }
    if (!newBusiness.branch_name.trim()) {
      toast.error('First branch name is required');
      return;
    }

    setCreatingBusiness(true);
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
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create business');
      setCreatingBusiness(false);
    }
  };

  const handleBusinessToggleConfirm = async () => {
    if (!businessAction) return;
    const { type, business } = businessAction;

    try {
      if (type === 'deactivate') {
        await api.deactivateBusiness(business.id);
        toast.success('Business deactivated. Data preserved.');
      } else {
        await api.activateBusiness(business.id);
        toast.success('Business activated.');
      }
      setBusinessAction(null);
      await refreshBranch();
      await refreshShop();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change business status');
    }
  };

  // ---------------------------------------------------------
  // Delete flows
  // ---------------------------------------------------------
  const attemptDeleteBusiness = async (business) => {
    try {
      const res = await api.deleteBusiness(business.id, false);
      toast.success(res.message || 'Business deleted');
      await refreshBranch();
      await refreshShop();
      if (business.id === activeBusinessId) {
        setTimeout(() => window.location.reload(), 600);
      }
    } catch (error) {
      const data = error.response?.data;
      if (data?.requires_force) {
        // Open force delete modal with the counts
        setForceDelete({
          kind: 'business',
          id: business.id,
          name: business.name,
          counts: data.details,
          confirmName: '',
          confirmWord: ''
        });
      } else {
        toast.error(data?.error || 'Failed to delete business');
      }
    }
  };

  const attemptDeleteBranch = async (branch) => {
    try {
      const res = await api.deleteBranch(branch.id, false);
      toast.success(res.message || 'Branch deleted');
      await fetchBranches();
      await refreshBranch();
    } catch (error) {
      const data = error.response?.data;
      if (data?.requires_force) {
        setForceDelete({
          kind: 'branch',
          id: branch.id,
          name: branch.name,
          counts: data.details,
          confirmName: '',
          confirmWord: ''
        });
      } else {
        toast.error(data?.error || 'Failed to delete branch');
      }
    }
  };

  const confirmForceDelete = async () => {
    if (!forceDelete) return;
    const { kind, id, name, confirmName, confirmWord } = forceDelete;

    if (confirmName.trim() !== name) {
      toast.error('Typed name does not match');
      return;
    }
    if (confirmWord.trim() !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }

    try {
      if (kind === 'business') {
        const res = await api.deleteBusiness(id, true);
        toast.success(res.message || 'Business force-deleted');
        setForceDelete(null);
        await refreshBranch();
        await refreshShop();
        setTimeout(() => window.location.reload(), 800);
      } else {
        const res = await api.deleteBranch(id, true);
        toast.success(res.message || 'Branch force-deleted');
        setForceDelete(null);
        await fetchBranches();
        await refreshBranch();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Force delete failed');
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
          <p>Manage your shops and branches</p>
        </div>
        <button onClick={() => setShowNewBusiness(true)} className="btn btn-primary">
          <FiPlus size={16} /> New Business
        </button>
      </div>

      {/* -------------------------------------------------------
          MY BUSINESSES
          ------------------------------------------------------- */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0 }}>My Businesses</h3>
            <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
              Each business is fully separate. Switch, deactivate, or delete.
            </small>
          </div>
        </div>

        {businesses.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: 'var(--gray)' }}>
            No businesses yet. Click "New Business" above.
          </p>
        ) : (
          <div className="business-list">
            {businesses.map((b) => {
              const isActive = b.id === activeBusinessId;
              const branchCount = (b.branches || []).length;

              return (
                <div
                  key={b.id}
                  className={`business-row ${isActive ? 'is-active' : ''}`}
                >
                  <div className="business-row-left">
                    <div className="business-row-icon">
                      <FiBriefcase size={18} />
                    </div>
                    <div>
                      <div className="business-row-name">
                        {b.name}
                        {isActive && <span className="business-row-badge">Active view</span>}
                      </div>
                      <div className="business-row-meta">
                        {branchCount} {branchCount === 1 ? 'branch' : 'branches'}
                        {b.location ? ` · ${b.location}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="business-row-actions">
                    {!isActive && (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => switchBusiness(b.id)}
                      >
                        Switch to
                      </button>
                    )}
                    {isActive && (
                      <span className="business-row-active-label">Currently viewing</span>
                    )}

                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setBusinessAction({
                        type: b.is_active === false ? 'activate' : 'deactivate',
                        business: b
                      })}
                      title={b.is_active === false ? 'Activate business' : 'Deactivate business'}
                    >
                      <FiPower size={14} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => attemptDeleteBusiness(b)}
                      title="Delete business permanently"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------
          ACTIVE BUSINESS IDENTITY
          ------------------------------------------------------- */}
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3>Business Identity</h3>
          <small style={{ color: '#6b7280', display: 'block', marginBottom: '16px' }}>
            Editing the active business: <strong>{form.name || '—'}</strong>
          </small>

          <div className="grid-2">
            <div className="form-group">
              <label>Business Name (internal) *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Display Name (on receipts) *</label>
              <input type="text" name="shop_name" value={form.shop_name} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label>Location / Address</label>
            <input type="text" name="location" value={form.location} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Currency</label>
            <select name="currency" value={form.currency} onChange={handleChange}>
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
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>TIN</label>
                    <input type="text" name="tin" value={form.tin} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>VRN</label>
                    <input type="text" name="vrn" value={form.vrn} onChange={handleChange} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* -------------------------------------------------------
            BRANCHES
            ------------------------------------------------------- */}
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
              disabled={isAddingBranch}
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
                  disabled={creatingBranch}
                />
                <input
                  type="text"
                  placeholder="Location (optional)"
                  value={newBranch.location}
                  onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
                  className="form-control"
                  disabled={creatingBranch}
                />
              </div>
              <div className="flex" style={{ gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setIsAddingBranch(false); setNewBranch({ name: '', location: '', phone: '' }); }}
                  className="btn btn-sm btn-secondary"
                  disabled={creatingBranch}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddBranch}
                  className="btn btn-sm btn-primary"
                  disabled={creatingBranch}
                >
                  <FiPlus size={14} /> {creatingBranch ? 'Creating...' : 'Create Branch'}
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
                                <button type="button" onClick={() => handleSaveBranchEdit(branch.id)} className="btn btn-sm btn-success">
                                  <FiCheck size={14} />
                                </button>
                                <button type="button" onClick={() => { setEditingBranchId(null); setEditBranchValue(''); }} className="btn btn-sm btn-secondary">
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
                                <button
                                  type="button"
                                  onClick={() => attemptDeleteBranch(branch)}
                                  className="btn btn-sm btn-danger"
                                  title="Delete permanently"
                                >
                                  <FiTrash2 size={14} />
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

      {/* -------------------------------------------------------
          APPEARANCE
          ------------------------------------------------------- */}
      <div className="card" style={{ marginTop: '24px', marginBottom: '24px' }}>
        <h3>Appearance</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {darkMode ? <FiMoon size={24} color="#8b5cf6" /> : <FiSun size={24} color="#f59e0b" />}
            <div>
              <h4 style={{ margin: 0 }}>{darkMode ? 'Dark Mode' : 'Light Mode'}</h4>
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

      {/* -------------------------------------------------------
          NEW BUSINESS MODAL
          ------------------------------------------------------- */}
      {showNewBusiness && (
        <div className="modal-overlay" onClick={() => !creatingBusiness && setShowNewBusiness(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Create New Business</h2>
              <button onClick={() => setShowNewBusiness(false)} className="btn btn-sm btn-secondary" disabled={creatingBusiness}>
                <FiX size={16} />
              </button>
            </div>

            <div className="form-group">
              <label>Business Name (internal) *</label>
              <input
                type="text"
                value={newBusiness.name}
                onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                placeholder="e.g., OSWAGO Cosmetics"
                autoFocus
                disabled={creatingBusiness}
              />
            </div>

            <div className="form-group">
              <label>First Branch Name *</label>
              <input
                type="text"
                value={newBusiness.branch_name}
                onChange={(e) => setNewBusiness({ ...newBusiness, branch_name: e.target.value })}
                placeholder="e.g., Main Branch"
                disabled={creatingBusiness}
              />
            </div>

            <div className="form-group">
              <label>Location (optional)</label>
              <input
                type="text"
                value={newBusiness.location}
                onChange={(e) => setNewBusiness({ ...newBusiness, location: e.target.value })}
                disabled={creatingBusiness}
              />
            </div>

            <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
              <button onClick={handleCreateBusiness} className="btn btn-primary" style={{ flex: 1 }} disabled={creatingBusiness}>
                <FiPlus size={16} /> {creatingBusiness ? 'Creating...' : 'Create Business'}
              </button>
              <button onClick={() => setShowNewBusiness(false)} className="btn btn-secondary" disabled={creatingBusiness}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------
          BUSINESS DEACTIVATE / ACTIVATE CONFIRM
          ------------------------------------------------------- */}
      <ConfirmDialog
        open={!!businessAction}
        title={businessAction?.type === 'deactivate' ? 'Deactivate Business' : 'Activate Business'}
        message={
          businessAction?.type === 'deactivate'
            ? `Deactivate "${businessAction?.business?.name}"? All its branches and data are preserved but hidden from the switcher.`
            : `Activate "${businessAction?.business?.name}"? Its branches become available again.`
        }
        confirmLabel={businessAction?.type === 'deactivate' ? 'Deactivate' : 'Activate'}
        cancelLabel="Cancel"
        variant={businessAction?.type === 'deactivate' ? 'danger' : 'primary'}
        onConfirm={handleBusinessToggleConfirm}
        onCancel={() => setBusinessAction(null)}
      />

      {/* -------------------------------------------------------
          BRANCH DEACTIVATE / ACTIVATE CONFIRM
          ------------------------------------------------------- */}
      <ConfirmDialog
        open={!!branchAction}
        title={branchAction?.type === 'deactivate' ? 'Deactivate Branch' : 'Activate Branch'}
        message={
          branchAction?.type === 'deactivate'
            ? `Deactivate "${branchAction?.branch?.name}"? Its data is preserved.`
            : `Reactivate "${branchAction?.branch?.name}"?`
        }
        confirmLabel={branchAction?.type === 'deactivate' ? 'Deactivate' : 'Activate'}
        cancelLabel="Cancel"
        variant={branchAction?.type === 'deactivate' ? 'danger' : 'primary'}
        onConfirm={handleBranchToggleConfirm}
        onCancel={() => setBranchAction(null)}
      />

      {/* -------------------------------------------------------
          FORCE DELETE MODAL (business or branch)
          ------------------------------------------------------- */}
      {forceDelete && (
        <div className="modal-overlay" onClick={() => setForceDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: 0, color: 'var(--danger)' }}>
              Force Delete {forceDelete.kind === 'business' ? 'Business' : 'Branch'}
            </h2>

            <p style={{ color: 'var(--gray)', fontSize: '13.5px', marginTop: '8px' }}>
              This will permanently destroy <strong>{forceDelete.name}</strong> and every row attached to it.
              There is <strong>no undo</strong>.
            </p>

            <div style={{
              background: 'var(--danger-soft)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              margin: '16px 0',
              fontSize: '13px'
            }}>
              <strong style={{ color: '#991b1b' }}>Rows that will be destroyed:</strong>
              <ul style={{ margin: '8px 0 0 18px', color: '#991b1b' }}>
                {Object.entries(forceDelete.counts || {})
                  .filter(([, n]) => n > 0)
                  .map(([k, n]) => (
                    <li key={k}>
                      <strong>{n}</strong> {k.replace('_', ' ')}
                    </li>
                  ))}
              </ul>
            </div>

            <div className="form-group">
              <label>Type the exact name: <code>{forceDelete.name}</code></label>
              <input
                type="text"
                value={forceDelete.confirmName}
                onChange={(e) => setForceDelete({ ...forceDelete, confirmName: e.target.value })}
                placeholder={forceDelete.name}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Type <code>DELETE</code> to confirm</label>
              <input
                type="text"
                value={forceDelete.confirmWord}
                onChange={(e) => setForceDelete({ ...forceDelete, confirmWord: e.target.value })}
                placeholder="DELETE"
              />
            </div>

            <div className="flex" style={{ gap: '10px', marginTop: '16px' }}>
              <button
                onClick={confirmForceDelete}
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={
                  forceDelete.confirmName.trim() !== forceDelete.name ||
                  forceDelete.confirmWord.trim() !== 'DELETE'
                }
              >
                <FiTrash2 size={16} /> Permanently Delete
              </button>
              <button onClick={() => setForceDelete(null)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;