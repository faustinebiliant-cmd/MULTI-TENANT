// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Supplier Detail
// ============================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../../api/client';
import Loader from '../common/Loader';
import toast from 'react-hot-toast';

const SupplierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSupplier();
  }, [id]);

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const data = await api.getSupplier(id);
      setSupplier(data);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      toast.error('Supplier not found');
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${supplier?.name}"?`)) return;

    setDeleting(true);
    try {
      await api.deleteSupplier(id);
      toast.success(`"${supplier.name}" deleted successfully!`);
      navigate('/suppliers');
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error(error.response?.data?.error || 'Failed to delete supplier');
      setDeleting(false);
    }
  };

  if (loading) return <Loader message="Loading supplier..." />;

  if (!supplier) {
    return (
      <div className="empty-state">
        <h3>Supplier not found</h3>
        <button onClick={() => navigate('/suppliers')} className="btn btn-primary">
          Back to Suppliers
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <button onClick={() => navigate('/suppliers')} className="btn btn-sm btn-secondary">
            <FiArrowLeft size={16} /> Back
          </button>
          <h1>{supplier.name}</h1>
          <p>Supplier details</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Supplier Information</h3>
          <div className="detail-row">
            <span className="detail-label">Name</span>
            <span className="detail-value">{supplier.name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Contact Person</span>
            <span className="detail-value">{supplier.contact_person || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Phone</span>
            <span className="detail-value">{supplier.phone}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Email</span>
            <span className="detail-value">{supplier.email || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Address</span>
            <span className="detail-value">{supplier.address || '-'}</span>
          </div>
        </div>

        <div className="card">
          <h3>Additional Information</h3>
          <div className="detail-row">
            <span className="detail-label">Notes</span>
            <span className="detail-value">{supplier.notes || 'No notes'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Created At</span>
            <span className="detail-value">{new Date(supplier.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="flex" style={{ gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to={`/suppliers/${id}/edit`} className="btn btn-primary">
            <FiEdit2 size={18} /> Edit Supplier
          </Link>
          <button onClick={handleDelete} className="btn btn-danger" disabled={deleting}>
            <FiTrash2 size={18} /> {deleting ? 'Deleting...' : 'Delete Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetail;