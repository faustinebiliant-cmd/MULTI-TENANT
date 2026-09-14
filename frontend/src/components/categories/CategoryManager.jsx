// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Category Manager
// ============================================================

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch } from 'react-icons/fi';
import api from '../../api/client';
import toast from 'react-hot-toast';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await api.getCategories();
      console.log('Categories loaded:', data);

      // Remove duplicates
      const seen = new Set();
      const unique = data.filter(cat => {
        const key = cat.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setCategories(unique);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
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
      toast.error('Please enter a category name');
      return;
    }

    try {
      await api.createCategory({ name: newCategory.trim() });
      toast.success('Category added successfully!');
      setNewCategory('');
      setIsAdding(false);
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error(error.response?.data?.error || 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;

    try {
      await api.deleteCategory(id);
      toast.success(`"${name}" deleted successfully`);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.error || 'Failed to delete category');
    }
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    try {
      await api.updateCategory(editingId, { name: editValue.trim() });
      toast.success('Category updated successfully!');
      setEditingId(null);
      setEditValue('');
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(error.response?.data?.error || 'Failed to update category');
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
        <p className="loader-text">Loading categories...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Categories</h1>
          <p>Manage your product categories</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="btn btn-primary">
          <FiPlus size={18} /> Add Category
        </button>
      </div>

      {isAdding && (
        <div className="card" style={{ marginBottom: '20px', border: '1.5px solid var(--primary)' }}>
          <div className="flex" style={{ gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter new category name..."
              className="form-control"
              style={{ flex: 1 }}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              autoFocus
            />
            <button onClick={handleAddCategory} className="btn btn-success">
              <FiPlus size={18} /> Add
            </button>
            <button onClick={() => { setIsAdding(false); setNewCategory(''); }} className="btn btn-secondary">
              <FiX size={18} /> Cancel
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
              placeholder="Search categories..."
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
              <th style={{ width: '40%' }}>Category</th>
              <th>Products</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan="3">
                  <div className="empty-state">
                    <h3>No Categories</h3>
                    <p>Add your first category to organize your products</p>
                    <button onClick={() => setIsAdding(true)} className="btn btn-primary" style={{ marginTop: '12px' }}>
                      <FiPlus size={18} /> Add Category
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredCategories.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center" style={{ padding: '32px', color: 'var(--gray)' }}>
                  No categories match "{search}"
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
                          <span
                            style={{
                              width: '10px', height: '10px', borderRadius: '50%',
                              backgroundColor: color, flexShrink: 0
                            }}
                          />
                          <span style={{ fontWeight: 600, color: 'var(--dark)' }}>{category.name}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--gray)' }}>
                      {category.product_count || 0} product{category.product_count === 1 ? '' : 's'}
                    </td>
                    <td>
                      <div className="flex" style={{ gap: '6px', justifyContent: 'flex-end' }}>
                        {isEditing ? (
                          <>
                            <button onClick={handleSaveEdit} className="btn btn-sm btn-success">
                              <FiSave size={14} /> Save
                            </button>
                            <button onClick={handleCancelEdit} className="btn btn-sm btn-secondary">
                              <FiX size={14} /> Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditingId(category.id); setEditValue(category.name); }}
                              className="btn btn-sm btn-secondary"
                              title="Edit category"
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                              className="btn btn-sm btn-danger"
                              title="Delete category"
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
                {categories.length} {categories.length === 1 ? 'Category' : 'Categories'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray)' }}>
                {totalProducts} products organized in total
              </div>
            </div>
            <span className="badge badge-info">All synced</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;