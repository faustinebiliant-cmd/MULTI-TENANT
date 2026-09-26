// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Category Manager
// ============================================================

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch } from 'react-icons/fi';
import api from '../../api/client';
import ConfirmDialog from '../common/ConfirmDialog';
import toast from 'react-hot-toast';

const CategoryManager = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await api.getCategories();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error(t('categories.messages.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const getCategoryColor = (category) => {
    const colors = {
      'Cables & Wires': '#3b82f6',
      'Switches': '#f59e0b',
      'Sockets': '#10b981',
      'Lighting': '#8b5cf6',
      'Circuit Protection': '#ef4444',
      'Distribution': '#06b6d4',
      'Tools': '#f97316',
      'Solar': '#22d3ee',
      'Generators': '#f472b6',
      'Fans': '#34d399',
      'Other': '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error(t('categories.messages.name_required'));
      return;
    }

    try {
      await api.createCategory({ name: newCategory.trim() });
      toast.success(t('categories.messages.added'));
      setNewCategory('');
      setIsAdding(false);
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error(error.response?.data?.error || t('categories.messages.add_failed'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteCategory(deleteTarget.id);
      toast.success(t('categories.messages.deleted'));
      setDeleteTarget(null);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.error || t('categories.messages.delete_failed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) {
      toast.error(t('categories.messages.name_empty'));
      return;
    }

    try {
      await api.updateCategory(editingId, { name: editValue.trim() });
      toast.success(t('categories.messages.updated'));
      setEditingId(null);
      setEditValue('');
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(error.response?.data?.error || t('categories.messages.update_failed'));
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalProducts = categories.reduce((sum, c) => sum + (c.product_count || 0), 0);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p className="loader-text">{t('categories.loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('categories.title')}</h1>
          <p>{t('categories.subtitle')}</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn btn-primary">
          <FiPlus size={18} /> {t('categories.add_button')}
        </button>
      </div>

      {isAdding && (
        <div className="card" style={{ marginBottom: '20px', border: '1.5px solid var(--primary)' }}>
          <div className="flex" style={{ gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder={t('categories.new_placeholder')}
              className="form-control"
              style={{ flex: 1 }}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              autoFocus
            />
            <button onClick={handleAddCategory} className="btn btn-success">
              <FiPlus size={18} /> {t('categories.add_submit')}
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewCategory(''); }}
              className="btn btn-secondary"
            >
              <FiX size={18} /> {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="search-bar" style={{ maxWidth: '360px' }}>
            <FiSearch size={18} />
            <input
              type="text"
              placeholder={t('categories.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40%' }}>{t('categories.columns.category')}</th>
              <th>{t('categories.columns.products')}</th>
              <th style={{ textAlign: 'right' }}>{t('categories.columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan="3">
                  <div className="empty-state">
                    <h3>{t('categories.no_categories_title')}</h3>
                    <p>{t('categories.no_categories_hint')}</p>
                    <button
                      onClick={() => setIsAdding(true)}
                      className="btn btn-primary"
                      style={{ marginTop: '12px' }}
                    >
                      <FiPlus size={18} /> {t('categories.add_button')}
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredCategories.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center" style={{ padding: '32px', color: 'var(--gray)' }}>
                  {t('categories.no_match', { search })}
                </td>
              </tr>
            ) : (
              filteredCategories.map((category) => {
                const color = getCategoryColor(category.name);
                const isEditing = editingId === category.id;

                return (
                  <tr key={category.id}>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="form-control"
                          autoFocus
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                          style={{ maxWidth: '280px' }}
                        />
                      ) : (
                        <div className="flex" style={{ alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: color,
                            flexShrink: 0
                          }} />
                          <span style={{ fontWeight: 600, color: 'var(--dark)' }}>
                            {category.name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--gray)' }}>
                      {t('categories.product_count', { count: category.product_count || 0 })}
                    </td>
                    <td>
                      <div className="flex" style={{ gap: '6px', justifyContent: 'flex-end' }}>
                        {isEditing ? (
                          <>
                            <button onClick={handleSaveEdit} className="btn btn-sm btn-success">
                              <FiSave size={14} /> {t('common.save')}
                            </button>
                            <button onClick={handleCancelEdit} className="btn btn-sm btn-secondary">
                              <FiX size={14} /> {t('common.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(category.id);
                                setEditValue(category.name);
                              }}
                              className="btn btn-sm btn-secondary"
                              title={t('categories.tooltips.edit')}
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: category.id, name: category.name })}
                              className="btn btn-sm btn-danger"
                              title={t('categories.tooltips.delete')}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {categories.length > 0 && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div className="flex-between">
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--dark)' }}>
                {t('categories.footer.count_label', { count: categories.length })}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray)' }}>
                {t('categories.footer.products_organized', { count: totalProducts })}
              </div>
            </div>
            <span className="badge badge-info">{t('categories.footer.synced_badge')}</span>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('categories.delete_dialog.title')}
        message={
          deleteTarget
            ? t('categories.delete_dialog.message', { name: deleteTarget.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default CategoryManager;