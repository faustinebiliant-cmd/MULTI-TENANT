// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Branch Scope Resolver
// Single source of truth for "which branch does this request target?"
// ============================================================

const supabase = require('../config/supabase');

const resolveBranchId = async (req) => {
    if (req.scope?.branch_id) return req.scope.branch_id;

    if (req.user?.is_boss && req.scope?.business_id) {
        const { data: branches } = await supabase
            .from('branches')
            .select('id')
            .eq('business_id', req.scope.business_id)
            .eq('is_active', true)
            .limit(2);

        if (branches && branches.length === 1) {
            return branches[0].id;
        }
    }

    return null;
};

const requireBranchId = async (req, res) => {
    const branchId = await resolveBranchId(req);
    if (!branchId) {
        res.status(400).json({
            success: false,
            error: 'No active branch selected'
        });
        return null;
    }
    return branchId;
};

module.exports = { resolveBranchId, requireBranchId };