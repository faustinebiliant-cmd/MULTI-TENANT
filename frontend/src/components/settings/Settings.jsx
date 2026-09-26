// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Settings
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiPlus, FiEdit2, FiCheck, FiX, FiPower, FiTrash2, FiBriefcase,
  FiMoon, FiSun, FiAlertTriangle
} from 'react-icons/fi';
import { useApp } from '../../contexts/AppContext';
import { useShop } from '../../contexts/ShopContext';
import { useBranch } from '../../contexts/BranchContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import api from '../../api/client';
import ConfirmDialog from '../common/ConfirmDialog';
import SubscribeModal from '../subscription/SubscribeModal';
import toast from 'react-hot-toast';

const MAX_BRANCHES = 5;

const Settings = () => {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode } = useApp();
  const { refresh: refreshShop } = useShop();
  const { activeBusinessId, businesses, refresh: refreshBranch, switchBusiness } = useBranch();
  const {
    subscription_status,
    days_remaining,
    has_pending_submission,
    refresh: refreshSubscription
  } = useSubscription();

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
    vrn: '',
    quick_sale_enabled: false
  });

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', location: '', phone: '' });
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [editBranchValue, setEditBranchValue] = useState('');
  const [branchAction, setBranchAction] = useState(null);

  const [showNewBusiness, setShowNewBusiness] = useState(false);
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [newBusiness, setNewBusiness] = useState({
    name: '', branch_name: '', location: '', phone: '', email: ''
  });

  const [businessAction, setBusinessAction] = useState(null);

  const [confirmDeleteBusiness, setConfirmDeleteBusiness] = useState(null);
  const [confirmDeleteBranch, setConfirmDeleteBranch] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [forceDelete, setForceDelete] = useState(null);

  const [showSubscribe, setShowSubscribe] = useState(false);

  const isSubscribed = subscription_status === 'active';
  const atBranchLimit = branches.length >= MAX_BRANCHES;
  const branchCount = branches.length;

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
          vrn: data.vrn || '',
          quick_sale_enabled: data.quick_sale_enabled === true
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
        vrn: form.vrn,
        quick_sale_enabled: form.quick_sale_enabled
      });

      await refreshShop();
      await refreshBranch();
      toast.success(t('settings.saved_success'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('settings.messages.save_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async () => {
    if (creatingBranch) return;
    if (!newBranch.name.trim()) {
      toast.error(t('settings.messages.branch_name_required'));
      return;
    }

    setCreatingBranch(true);
    try {
      await api.createBranch({
        name: newBranch.name.trim(),
        location: newBranch.location.trim() || '',
        phone: newBranch.phone.trim() || ''
      });
      toast.success(t('settings.messages.branch_created'));
      setNewBranch({ name: '', location: '', phone: '' });
      setIsAddingBranch(false);
      await fetchBranches();
      await refreshBranch();
    } catch (error) {
      toast.error(error.response?.data?.error || t('settings.messages.branch_create_failed'));
    } finally {
      setCreatingBranch(false);
    }
  };

  const handleSaveBranchEdit = async (id) => {
    if (!editBranchValue.trim()) {
      toast.error(t('settings.messages.branch_name_required'));
      return;
    }

    try {
      await api.updateBranch(id, { name: editBranchValue.trim() });
      toast.success(t('settings.messages.branch_updated'));
      setEditingBranchId(null);
      setEditBranchValue('');
      await fetchBranches();
      await refreshBranch();
    } catch (error) {
      toast.error(error.response?.data?.error || t('settings.messages.branch_update_failed'));
    }
  };

  const handleBranchToggleConfirm = async () => {
    if (!branchAction) return;
    const { type, branch } = branchAction;

    try {
      if (type === 'deactivate') {
        await api.deactivateBranch(branch.id);
        toast.success(t('settings.messages.branch_deactivated'));
      } else {
        await api.activateBranch(branch.id);
        toast.success(t('settings.messages.branch_activated'));
      }
      setBranchAction(null);
      await fetchBranches();
      await refreshBranch();
    } catch (error) {
      toast.error(error.response?.data?.error || t('settings.messages.branch_status_failed'));
    }
  };

  const handleCreateBusiness = async () => {
    if (creatingBusiness) return;
    if (!newBusiness.name.trim()) {
      toast.error(t('settings.messages.business_name_required'));
      return;
    }
    if (!newBusiness.branch_name.trim()) {
      toast.error(t('settings.messages.branch_name_required'));
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

      await refreshBranch();

      toast.success(t('settings.messages.business_created'));
      setShowNewBusiness(false);
      setNewBusiness({ name: '', branch_name: '', location: '', phone: '', email: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || t('settings.messages.business_create_failed'));
    } finally {
      setCreatingBusiness(false);
    }
  };

  const handleBusinessToggleConfirm = async () => {
    if (!businessAction) return;
    const { type, business } = businessAction;

    try {
      if (type === 'deactivate') {
        await api.deactivateBusiness(business.id);
        toast.success(t('settings.messages.business_deactivated'));

        if (business.id === activeBusinessId) {
          localStorage.removeItem('activeBusinessId');
          localStorage.removeItem('activeBranchId');
          localStorage.removeItem('businesses');
        }
      } else {
        await api.activateBusiness(business.id);
        toast.success(t('settings.messages.business_activated'));
      }
      setBusinessAction(null);
      await refreshBranch();
      await refreshShop();
    } catch (error) {
      toast.error(error.response?.data?.error || t('settings.messages.business_status_failed'));
    }
  };

  const attemptDeleteBusiness = async (business) => {
    if (!business) return;
    setDeleting(true);
    try {
      const res = await api.deleteBusiness(business.id, false);
      toast.success(res.message || t('settings.messages.business_deleted'));

      const wasActive = business.id === activeBusinessId;
      if (wasActive) {
        localStorage.removeItem('activeBusinessId');
        localStorage.removeItem('activeBranchId');
        localStorage.removeItem('businesses');
      }

      await refreshBranch();
      await refreshShop();

      if (wasActive) {
        setTimeout(() => window.location.reload(), 600);
      }
    } catch (error) {
      const data = error.response?.data;
      if (data?.requires_force) {
        setForceDelete({
          kind: 'business',
          id: business.id,
          name: business.name,
          counts: data.details,
          confirmName: '',
          confirmWord: ''
        });
      } else {
        toast.error(data?.error || t('settings.messages.business_delete_failed'));
      }
    } finally {
      setDeleting(false);
      setConfirmDeleteBusiness(null);
    }
  };

  const attemptDeleteBranch = async (branch) => {
    if (!branch) return;
    setDeleting(true);
    try {
      const res = await api.deleteBranch(branch.id, false);
      toast.success(res.message || t('settings.messages.branch_deleted'));
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
        toast.error(data?.error || t('settings.messages.branch_delete_failed'));
      }
    } finally {
      setDeleting(false);
      setConfirmDeleteBranch(null);
    }
  };

  const confirmForceDelete = async () => {
    if (!forceDelete) return;
    const { kind, id, name, confirmName, confirmWord } = forceDelete;

    if (confirmName.trim() !== name) {
      toast.error(t('settings.messages.typed_name_mismatch'));
      return;
    }
    if (confirmWord.trim() !== 'DELETE') {
      toast.error(t('settings.messages.type_delete_hint'));
      return;
    }

    try {
      if (kind === 'business') {
        const res = await api.deleteBusiness(id, true);
        toast.success(res.message || t('settings.messages.business_force_deleted'));
        setForceDelete(null);

        if (id === activeBusinessId) {
          localStorage.removeItem('activeBusinessId');
          localStorage.removeItem('activeBranchId');
          localStorage.removeItem('businesses');
        }

        await refreshBranch();
        await refreshShop();
        setTimeout(() => window.location.reload(), 800);
      } else {
        const res = await api.deleteBranch(id, true);
        toast.success(res.message || t('settings.messages.branch_force_deleted'));
        setForceDelete(null);
        await fetchBranches();
        await refreshBranch();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t('settings.messages.force_delete_failed'));
    }
  };

  const handleNewBusinessClick = () => {
    if (!isSubscribed) {
      setShowSubscribe(true);
      return;
    }
    setShowNewBusiness(true);
  };

  const handleAddBranchClick = () => {
    if (!isSubscribed) {
      setShowSubscribe(true);
      return;
    }
    if (atBranchLimit) return;
    setIsAddingBranch(true);
  };

  const handleSubscribeSuccess = async () => {
    setShowSubscribe(false);
    await refreshSubscription();
  };

  if (!loaded) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>{t('settings.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('settings.page_title')}</h1>
          <p>{t('settings.page_subtitle')}</p>
        </div>
        <button onClick={handleNewBusinessClick} className="btn btn-primary">
          <FiPlus size={16} /> {t('settings.new_business_button')}
        </button>
      </div>

      {subscription_status !== 'active' && (
        <div style={notice.wrap}>
          <div style={notice.left}>
            <FiAlertTriangle size={18} style={notice.icon} />
            <div>
              <div style={notice.title}>
                {subscription_status === 'suspended'
                  ? t('settings.subscription_notice.suspended_title')
                  : subscription_status === 'expired' || days_remaining <= 0
                    ? t('settings.subscription_notice.expired_title')
                    : t('settings.subscription_notice.active_title')}
              </div>
              <div style={notice.body}>
                {subscription_status === 'suspended'
                  ? t('settings.subscription_notice.suspended_message')
                  : has_pending_submission
                    ? t('settings.subscription_notice.pending_message')
                    : t('settings.subscription_notice.default_message')}
              </div>
            </div>
          </div>
          {subscription_status !== 'suspended' && !has_pending_submission && (
            <button onClick={() => setShowSubscribe(true)} className="btn btn-primary btn-sm">
              {t('settings.subscription_notice.subscribe_button')}
            </button>
          )}
          {has_pending_submission && (
            <span className="badge badge-info">
              {t('settings.subscription_notice.pending_badge')}
            </span>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0 }}>{t('settings.my_businesses.title')}</h3>
            <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
              {t('settings.my_businesses.subtitle')}
            </small>
          </div>
        </div>

        {businesses.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: 'var(--gray)' }}>
            {t('settings.my_businesses.empty')}
          </p>
        ) : (
          <div className="business-list">
            {businesses.map((b) => {
              const isActive = b.id === activeBusinessId;
              const branchCountForBiz = (b.branches || []).length;

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
                        {isActive && (
                          <span className="business-row-badge">
                            {t('settings.my_businesses.active_view_badge')}
                          </span>
                        )}
                      </div>
                      <div className="business-row-meta">
                        {t('settings.my_businesses.branch_count', { count: branchCountForBiz })}
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
                        {t('settings.my_businesses.switch_button')}
                      </button>
                    )}
                    {isActive && (
                      <span className="business-row-active-label">
                        {t('settings.my_businesses.current_view_label')}
                      </span>
                    )}

                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setBusinessAction({
                        type: b.is_active === false ? 'activate' : 'deactivate',
                        business: b
                      })}
                      title={
                        b.is_active === false
                          ? t('settings.my_businesses.activate_tooltip')
                          : t('settings.my_businesses.deactivate_tooltip')
                      }
                    >
                      <FiPower size={14} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => setConfirmDeleteBusiness(b)}
                      title={t('settings.my_businesses.delete_tooltip')}
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

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3>{t('settings.identity.title')}</h3>
          <small style={{ color: '#6b7280', display: 'block', marginBottom: '16px' }}>
            {t('settings.identity.editing_prefix')} <strong>{form.name || '-'}</strong>
          </small>

          <div className="grid-2">
            <div className="form-group">
              <label>{t('settings.identity.name_label')}</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{t('settings.identity.shop_name_label')}</label>
              <input type="text" name="shop_name" value={form.shop_name} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>{t('settings.identity.phone_label')}</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>{t('settings.identity.email_label')}</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label>{t('settings.identity.location_label')}</label>
            <input type="text" name="location" value={form.location} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>{t('settings.identity.currency_label')}</label>
            <select name="currency" value={form.currency} onChange={handleChange}>
              <option value="TZS">TZS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h3>{t('settings.vat.title')}</h3>
          <div style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>{t('settings.vat.enable_label')}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={form.vat_enabled}
                  onChange={handleVatToggle}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>
                  {form.vat_enabled
                    ? t('settings.vat.enabled_text')
                    : t('settings.vat.disabled_text')}
                </span>
              </div>
            </div>

            {form.vat_enabled && (
              <>
                <div className="form-group">
                  <label>{t('settings.vat.rate_label')}</label>
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
                    <label>{t('settings.vat.tin_label')}</label>
                    <input type="text" name="tin" value={form.tin} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>{t('settings.vat.vrn_label')}</label>
                    <input type="text" name="vrn" value={form.vrn} onChange={handleChange} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h3>{t('settings.pos.title')}</h3>
          <div style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label>{t('settings.pos.enable_label')}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={form.quick_sale_enabled}
                  onChange={(e) => setForm({ ...form, quick_sale_enabled: e.target.checked })}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>
                  {form.quick_sale_enabled
                    ? t('settings.pos.enabled_text')
                    : t('settings.pos.disabled_text')}
                </span>
              </div>
              <small style={{ color: '#6b7280', display: 'block', marginTop: '8px', lineHeight: 1.5 }}>
                {t('settings.pos.hint')}
              </small>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0 }}>
                {t('settings.branches.title')}{' '}
                <span style={{ color: '#64748b', fontWeight: 500 }}>
                  {t('settings.branches.counter', { count: branchCount, max: MAX_BRANCHES })}
                </span>
              </h3>
              <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
                {t('settings.branches.subtitle')}
                {atBranchLimit && ` ${t('settings.branches.limit_reached_note')}`}
              </small>
            </div>
            <button
              type="button"
              onClick={handleAddBranchClick}
              className="btn btn-sm btn-primary"
              disabled={isAddingBranch || atBranchLimit || !isSubscribed}
              title={
                !isSubscribed
                  ? t('settings.branches.subscribed_tooltip')
                  : atBranchLimit
                    ? t('settings.branches.limit_tooltip')
                    : t('settings.branches.add_tooltip')
              }
            >
              <FiPlus size={14} />{' '}
              {atBranchLimit
                ? t('settings.branches.limit_reached_button')
                : t('settings.branches.add_button')}
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
                  placeholder={t('settings.branches.new_name_placeholder')}
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="form-control"
                  autoFocus
                  disabled={creatingBranch}
                />
                <input
                  type="text"
                  placeholder={t('settings.branches.new_location_placeholder')}
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
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleAddBranch}
                  className="btn btn-sm btn-primary"
                  disabled={creatingBranch}
                >
                  <FiPlus size={14} />{' '}
                  {creatingBranch
                    ? t('settings.branches.creating_button')
                    : t('settings.branches.create_button')}
                </button>
              </div>
            </div>
          )}

          {branches.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: 'var(--gray)' }}>
              {t('settings.branches.empty')}
            </p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('settings.branches.columns.branch')}</th>
                    <th>{t('settings.branches.columns.location')}</th>
                    <th>{t('settings.branches.columns.status')}</th>
                    <th style={{ textAlign: 'right' }}>{t('settings.branches.columns.actions')}</th>
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
                            {branch.is_active
                              ? t('settings.branches.badge_active')
                              : t('settings.branches.badge_inactive')}
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
                                  title={t('settings.branches.rename_tooltip')}
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
                                  title={
                                    branch.is_active
                                      ? t('settings.branches.deactivate_tooltip')
                                      : t('settings.branches.activate_tooltip')
                                  }
                                >
                                  <FiPower size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteBranch(branch)}
                                  className="btn btn-sm btn-danger"
                                  title={t('settings.branches.delete_tooltip')}
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
              {loading ? t('settings.saving_button') : t('settings.save_button')}
            </button>
          </div>
        </div>
      </form>

      <div className="card" style={{ marginTop: '24px', marginBottom: '24px' }}>
        <h3>{t('settings.appearance.title')}</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {darkMode ? <FiMoon size={24} color="#8b5cf6" /> : <FiSun size={24} color="#f59e0b" />}
            <div>
              <h4 style={{ margin: 0 }}>
                {darkMode
                  ? t('settings.appearance.dark_mode_label')
                  : t('settings.appearance.light_mode_label')}
              </h4>
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
            {darkMode
              ? t('settings.appearance.switch_to_light')
              : t('settings.appearance.switch_to_dark')}
          </button>
        </div>
      </div>

      {showNewBusiness && (
        <div className="modal-overlay" onClick={() => !creatingBusiness && setShowNewBusiness(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>{t('settings.new_business_modal.title')}</h2>
              <button onClick={() => setShowNewBusiness(false)} className="btn btn-sm btn-secondary" disabled={creatingBusiness}>
                <FiX size={16} />
              </button>
            </div>

            <div className="form-group">
              <label>{t('settings.new_business_modal.name_label')}</label>
              <input
                type="text"
                value={newBusiness.name}
                onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                placeholder={t('settings.new_business_modal.name_placeholder')}
                autoFocus
                disabled={creatingBusiness}
              />
            </div>

            <div className="form-group">
              <label>{t('settings.new_business_modal.branch_label')}</label>
              <input
                type="text"
                value={newBusiness.branch_name}
                onChange={(e) => setNewBusiness({ ...newBusiness, branch_name: e.target.value })}
                placeholder={t('settings.new_business_modal.branch_placeholder')}
                disabled={creatingBusiness}
              />
            </div>

            <div className="form-group">
              <label>{t('settings.new_business_modal.location_label')}</label>
              <input
                type="text"
                value={newBusiness.location}
                onChange={(e) => setNewBusiness({ ...newBusiness, location: e.target.value })}
                disabled={creatingBusiness}
              />
            </div>

            <div className="flex" style={{ gap: '10px', marginTop: '20px' }}>
              <button onClick={handleCreateBusiness} className="btn btn-primary" style={{ flex: 1 }} disabled={creatingBusiness}>
                <FiPlus size={16} />{' '}
                {creatingBusiness
                  ? t('settings.new_business_modal.creating_button')
                  : t('settings.new_business_modal.create_button')}
              </button>
              <button onClick={() => setShowNewBusiness(false)} className="btn btn-secondary" disabled={creatingBusiness}>
                {t('settings.new_business_modal.cancel_button')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteBusiness}
        title={t('settings.delete_business_dialog.title')}
        message={
          confirmDeleteBusiness
            ? t('settings.delete_business_dialog.message', { name: confirmDeleteBusiness.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        loading={deleting}
        onConfirm={() => attemptDeleteBusiness(confirmDeleteBusiness)}
        onCancel={() => setConfirmDeleteBusiness(null)}
      />

      <ConfirmDialog
        open={!!confirmDeleteBranch}
        title={t('settings.delete_branch_dialog.title')}
        message={
          confirmDeleteBranch
            ? t('settings.delete_branch_dialog.message', { name: confirmDeleteBranch.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        loading={deleting}
        onConfirm={() => attemptDeleteBranch(confirmDeleteBranch)}
        onCancel={() => setConfirmDeleteBranch(null)}
      />

      <ConfirmDialog
        open={!!businessAction}
        title={
          businessAction?.type === 'deactivate'
            ? t('settings.business_toggle.deactivate_title')
            : t('settings.business_toggle.activate_title')
        }
        message={
          businessAction?.type === 'deactivate'
            ? t('settings.business_toggle.deactivate_message', { name: businessAction?.business?.name })
            : t('settings.business_toggle.activate_message', { name: businessAction?.business?.name })
        }
        confirmLabel={
          businessAction?.type === 'deactivate'
            ? t('settings.business_toggle.deactivate_button')
            : t('settings.business_toggle.activate_button')
        }
        cancelLabel={t('common.cancel')}
        variant={businessAction?.type === 'deactivate' ? 'danger' : 'primary'}
        onConfirm={handleBusinessToggleConfirm}
        onCancel={() => setBusinessAction(null)}
      />

      <ConfirmDialog
        open={!!branchAction}
        title={
          branchAction?.type === 'deactivate'
            ? t('settings.branch_toggle.deactivate_title')
            : t('settings.branch_toggle.activate_title')
        }
        message={
          branchAction?.type === 'deactivate'
            ? t('settings.branch_toggle.deactivate_message', { name: branchAction?.branch?.name })
            : t('settings.branch_toggle.activate_message', { name: branchAction?.branch?.name })
        }
        confirmLabel={
          branchAction?.type === 'deactivate'
            ? t('settings.branch_toggle.deactivate_button')
            : t('settings.branch_toggle.activate_button')
        }
        cancelLabel={t('common.cancel')}
        variant={branchAction?.type === 'deactivate' ? 'danger' : 'primary'}
        onConfirm={handleBranchToggleConfirm}
        onCancel={() => setBranchAction(null)}
      />

      {forceDelete && (
        <div className="modal-overlay" onClick={() => setForceDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: 0, color: 'var(--danger)' }}>
              {forceDelete.kind === 'business'
                ? t('settings.force_delete.title_business')
                : t('settings.force_delete.title_branch')}
            </h2>

            <p style={{ color: 'var(--gray)', fontSize: '13.5px', marginTop: '8px' }}>
              {t('settings.force_delete.warning', { name: forceDelete.name })}
            </p>

            <div style={{
              background: 'var(--danger-soft)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              margin: '16px 0',
              fontSize: '13px'
            }}>
              <strong style={{ color: '#991b1b' }}>
                {t('settings.force_delete.rows_header')}
              </strong>
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
              <label>
                {t('settings.force_delete.type_name_label', { name: forceDelete.name })}
              </label>
              <input
                type="text"
                value={forceDelete.confirmName}
                onChange={(e) => setForceDelete({ ...forceDelete, confirmName: e.target.value })}
                placeholder={forceDelete.name}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>{t('settings.force_delete.type_word_label')}</label>
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
                <FiTrash2 size={16} /> {t('settings.force_delete.permanent_button')}
              </button>
              <button onClick={() => setForceDelete(null)} className="btn btn-secondary">
                {t('settings.force_delete.cancel_button')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubscribe && (
        <SubscribeModal
          onClose={() => setShowSubscribe(false)}
          onSuccess={handleSubscribeSuccess}
        />
      )}
    </div>
  );
};

const notice = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '14px 18px',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  left: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    flex: 1,
    minWidth: '240px'
  },
  icon: {
    color: '#b45309',
    flexShrink: 0,
    marginTop: '2px'
  },
  title: {
    fontWeight: 700,
    color: '#92400e',
    fontSize: '13.5px'
  },
  body: {
    color: '#78350f',
    fontSize: '12.5px',
    marginTop: '2px',
    lineHeight: 1.5
  }
};

export default Settings;