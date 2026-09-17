// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Inactive Branch Notice
// Shown when the active branch (or business) is deactivated.
// Blocks the whole app area so no API calls fire.
// ============================================================

import React, { useState } from 'react';
import { FiPower, FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';
import { useBranch } from '../../contexts/BranchContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import toast from 'react-hot-toast';

const InactiveBranchNotice = () => {
  const { user } = useAuth();
  const {
    activeBusiness,
    activeBranchId,
    businesses,
    switchBranch,
    switchBusiness,
    refresh
  } = useBranch();

  const [working, setWorking] = useState(false);

  const isBoss = user?.is_boss === true;
  const branches = activeBusiness?.branches || [];
  const activeBranch = branches.find(b => b.id === activeBranchId);
  const activeBranches = branches.filter(b => b.is_active !== false);
  const otherBusinesses = businesses.filter(b => b.id !== activeBusiness?.id);

  const handleReactivate = async () => {
    if (!activeBranch) return;
    setWorking(true);
    try {
      await api.activateBranch(activeBranch.id);
      await refresh();
      toast.success('Branch reactivated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reactivate branch');
    } finally {
      setWorking(false);
    }
  };

  const handleSwitchBranch = (branchId) => {
    switchBranch(branchId);
  };

  const handleSwitchBusiness = (businessId) => {
    switchBusiness(businessId);
  };

  return (
    <div className="inactive-branch-wrap">
      <div className="inactive-branch-card">
        <div className="inactive-branch-icon">
          <FiAlertTriangle size={28} />
        </div>

        <h2 className="inactive-branch-title">
          This branch is deactivated
        </h2>

        <p className="inactive-branch-text">
          <strong>{activeBranch?.name || 'The selected branch'}</strong> is not active.
          No data can be read or written for it until it is reactivated.
        </p>

        {isBoss ? (
          <div className="inactive-branch-actions">
            <button
              type="button"
              onClick={handleReactivate}
              disabled={working}
              className="btn btn-success"
            >
              <FiPower size={16} />
              {working ? 'Reactivating...' : 'Reactivate this branch'}
            </button>

            {activeBranches.length > 0 && (
              <div className="inactive-branch-switch">
                <span>Or switch to:</span>
                <div className="inactive-branch-switch-list">
                  {activeBranches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSwitchBranch(b.id)}
                      className="btn btn-sm btn-secondary"
                    >
                      <FiArrowLeft size={14} /> {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {otherBusinesses.length > 0 && (
              <div className="inactive-branch-switch">
                <span>Or switch business:</span>
                <div className="inactive-branch-switch-list">
                  {otherBusinesses.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSwitchBusiness(b.id)}
                      className="btn btn-sm btn-secondary"
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="inactive-branch-hint">
              Manage all branches from <strong>Settings → Branches</strong>.
            </p>
          </div>
        ) : (
          <p className="inactive-branch-hint">
            Your branch has been deactivated. Please contact your shop owner.
          </p>
        )}
      </div>
    </div>
  );
};

export default InactiveBranchNotice;