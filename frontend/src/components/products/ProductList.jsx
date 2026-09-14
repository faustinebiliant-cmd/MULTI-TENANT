// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Product List (Paginated + SQL Totals)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiPlus, FiSearch, FiPackage, FiDollarSign, FiTrendingUp,
  FiX, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import api from '../../api/client';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const PAGE_SIZE = 50;

const useDebouncedValue = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [totals, setTotals] = useState({ inventoryValue: 0, costValue: 0, profitPotential: 0, productCount: 0 });
  const [categories, setCategories] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [categoryId, setCategoryId] = useState('');

  // Role check
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role || '';
  const canSeeFinancialData = userRole === 'boss' || userRole === 'manager';

  // ─── Load categories once ────────────────────────────────
  useEffect(() => {
    api.getCategories()
      .then(list => setCategories(list || []))
      .catch(err => console.error('Error loading categories:', err));
  }, []);

  // ─── Fetch page ──────────────────────────────────────────
  const fetchProducts = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };

      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryId) params.category_id = categoryId;

      const queryString = new URLSearchParams(params).toString();
      const response = await api.getProductsPage(queryString);

      setProducts(response.data || []);
      setPagination(response.pagination || { total: 0, page: 1, pages: 1 });

      // ✅ Totals come from the backend (SQL) — cover the WHOLE filtered set,
      //    not just the current page
      setTotals(response.totals || {
        inventoryValue: 0,
        costValue: 0,
        profitPotential: 0,
        productCount: 0
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryId]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const goToPage = (p) => {
    if (p < 1 || p > pagination.pages) return;
    fetchProducts(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = search || categoryId;

  // ✅ Totals read directly from SQL result — shop-wide (matching current filters)
  const totalInventoryValue = canSeeFinancialData ? (totals.inventoryValue || 0) : 0;
  const totalCostValue = canSeeFinancialData ? (totals.costValue || 0) : 0;
  const totalProfitPotential = canSeeFinancialData ? (totals.profitPotential || 0) : 0;

  if (loading && products.length === 0) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage your electrical equipment inventory</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          <FiPlus size={18} /> Add Product
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="flex" style={{ gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
            <FiSearch size={18} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search products by name, SKU, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '14px' }}
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="form-control"
            style={{ width: '200px', fontSize: '13px' }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setCategoryId(''); }}
              className="btn btn-sm btn-secondary"
              style={{ color: '#ef4444' }}
            >
              <FiX size={14} /> Clear
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
            Showing <strong>{products.length}</strong> of <strong>{pagination.total}</strong>
          </div>
        </div>
      </div>

      {/* Financial summary (boss/manager only) — SHOP-WIDE totals from SQL */}
      {canSeeFinancialData && totals.productCount > 0 && (
        <div className="stats-grid" style={{ marginBottom: '16px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <FiPackage size={20} />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(totalInventoryValue)}</h3>
              <p>
                {hasActiveFilters ? 'Filtered' : 'Total'} Inventory Value (Selling)
              </p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              <FiDollarSign size={20} />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(totalCostValue)}</h3>
              <p>
                {hasActiveFilters ? 'Filtered' : 'Total'} Cost Value
              </p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
              <FiTrendingUp size={20} />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(totalProfitPotential)}</h3>
              <p>
                {hasActiveFilters ? 'Filtered' : 'Total'} Potential Profit
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              {canSeeFinancialData && <th>Cost Price</th>}
              <th>Selling Price</th>
              <th>Stock</th>
              {canSeeFinancialData && <th>Total Value</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={canSeeFinancialData ? 7 : 5} className="text-center" style={{ padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                  <h3 style={{ color: '#1e293b', marginBottom: '4px' }}>No products found</h3>
                  <p style={{ fontSize: '14px' }}>
                    {hasActiveFilters
                      ? 'Try adjusting or clearing your filters.'
                      : 'Add your first product!'}
                  </p>
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const totalValue = (product.selling_price || 0) * (product.stock_quantity || 0);
                const isLowStock = product.stock_quantity <= product.low_stock_threshold;

                return (
                  <tr key={product.id}>
                    <td>
                      <Link to={`/products/${product.id}`} className="product-link">
                        {product.name}
                      </Link>
                    </td>
                    <td>{product.category_name || '-'}</td>
                    {canSeeFinancialData && <td>{formatCurrency(product.cost_price)}</td>}
                    <td>{formatCurrency(product.selling_price)}</td>
                    <td>
                      <span className={isLowStock ? 'badge badge-danger' : 'badge badge-success'}>
                        {product.stock_quantity}
                      </span>
                    </td>
                    {canSeeFinancialData && (
                      <td>
                        <span style={{
                          fontWeight: '600',
                          color: totalValue > 0 ? '#059669' : '#6b7280'
                        }}>
                          {formatCurrency(totalValue)}
                        </span>
                      </td>
                    )}
                    <td>
                      <Link to={`/products/${product.id}`} className="btn btn-sm btn-secondary">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="audit-pagination" style={{ marginTop: '16px' }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
          >
            <FiChevronLeft size={16} />
            Previous
          </button>
          <span className="pagination-status">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages || loading}
          >
            Next
            <FiChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductList;