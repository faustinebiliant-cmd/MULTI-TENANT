// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Audit Controller
// ============================================================

const supabase = require('../config/supabase');
const {
    isValidUUID,
    isValidLength,
    isSafeText,
    sanitize
} = require('../utils/validators');

// Known action types. Kept here instead of querying the table,
// because fetching every distinct action from a large activity_logs
// table is slow and unnecessary — the set of actions is fixed
// and known ahead of time.
const KNOWN_ACTIONS = [
    'Login',
    'Logout',
    'Account Signed Up',
    'Profile Updated',
    'Password Changed',

    'Quick Sale',
    'Order Status Updated',
    'Payment Recorded',
    'Order Confirmed',
    'Order Cancelled',

    'Product Created',
    'Product Updated',
    'Product Deleted',
    'Stock Adjusted',

    'Customer Created',
    'Customer Updated',
    'Customer Deleted',

    'Supplier Created',
    'Supplier Updated',
    'Supplier Deleted',

    'Purchase Order Created',
    'Purchase Order Received',
    'Purchase Order Updated',
    'Purchase Order Deleted',

    'Expense Created',
    'Expense Updated',
    'Expense Deleted',

    'Business Updated',
    'Business Created',
    'Business Activated',
    'Business Deactivated',
    'Business Deleted',
    'Business Force Deleted',

    'Branch Created',
    'Branch Updated',
    'Branch Activated',
    'Branch Deactivated',
    'Branch Deleted',
    'Branch Force Deleted',

    'Staff Created',
    'Staff Updated',
    'Staff Deleted',
    'Staff Password Reset',

    'Impersonation Ended'
];

// ============================================================
// GET ACTIVITY LOGS (paginated + filters)
// ============================================================
const getActivityLogs = async (req, res) => {
    try {
        let { action, user_id, branch_id, startDate, endDate, search, limit = 100, page = 1 } = req.query;

        // Scope guard: staff are locked to their own branch from JWT.
        // Boss can filter by branch via ?branch_id=... but only within
        // the active business. Headers already validated in auth middleware.
        const isBoss = req.user.is_boss === true;
        const scopeBusinessId = req.scope?.business_id || null;
        const scopeBranchId = req.scope?.branch_id || null;

        // Which branches is this user allowed to see?
        // Boss: all active branches under their business.
        // Staff: only their own branch.
        let allowedBranchIds = [];
        if (isBoss && scopeBusinessId) {
            const { data: brs } = await supabase
                .from('branches')
                .select('id')
                .eq('business_id', scopeBusinessId);
            allowedBranchIds = (brs || []).map(b => b.id);
        } else if (scopeBranchId) {
            allowedBranchIds = [scopeBranchId];
        }

        if (allowedBranchIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    logs: [],
                    pagination: { total: 0, page: 1, limit: 100, pages: 0 },
                    filters: { actions: KNOWN_ACTIONS, users: [], branches: [] },
                    summary: { totalToday: 0, uniqueUsersToday: 0 }
                }
            });
        }

        // Validate action
        if (action && action !== 'all') {
            if (!isValidLength(action, 1, 100) || !isSafeText(action)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid action parameter'
                });
            }
            action = sanitize(action);
        }

        // Validate user_id
        if (user_id && user_id !== 'all') {
            if (!isValidUUID(user_id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid user ID'
                });
            }
        }

        // Validate branch_id filter
        let filterBranchId = null;
        if (branch_id && branch_id !== 'all') {
            if (!isValidUUID(branch_id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid branch ID'
                });
            }
            if (!allowedBranchIds.includes(branch_id)) {
                return res.status(403).json({
                    success: false,
                    error: 'You do not have access to this branch'
                });
            }
            filterBranchId = branch_id;
        }

        // Validate dates
        if (startDate) {
            const date = new Date(startDate);
            if (isNaN(date.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid startDate format'
                });
            }
        }

        if (endDate) {
            const date = new Date(endDate);
            if (isNaN(date.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid endDate format'
                });
            }
        }

        // Sanitize the search term
        const cleanSearch = search && search.trim()
            ? search.trim().replace(/[%_,()'"]/g, '')
            : null;

        // Validate pagination
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
            return res.status(400).json({
                success: false,
                error: 'Limit must be between 1 and 200'
            });
        }
        limit = limitNum;

        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({
                success: false,
                error: 'Page must be a positive number'
            });
        }
        page = pageNum;

        // Base query. Branch scope is applied before anything else so
        // Postgres uses activity_logs_branch_created_idx (branch_id, created_at DESC).
        let query = supabase
            .from('activity_logs')
            .select(`
                id,
                branch_id,
                user_id,
                user_name,
                action,
                order_id,
                order_number,
                details,
                ip_address,
                created_at,
                branches:branch_id (name),
                users:user_id (full_name, email, role)
            `)
            .in('branch_id', allowedBranchIds)
            .order('created_at', { ascending: false });

        // Branch filter overrides the "all allowed branches" scope
        if (filterBranchId) {
            query = query.eq('branch_id', filterBranchId);
        }

        // Search: user name, action, or order number
        if (cleanSearch) {
            query = query.or(`user_name.ilike.%${cleanSearch}%,action.ilike.%${cleanSearch}%,order_number.ilike.%${cleanSearch}%`);
        }

        // Additional filters
        if (action && action !== 'all') query = query.eq('action', action);
        if (user_id && user_id !== 'all') query = query.eq('user_id', user_id);
        if (startDate) query = query.gte('created_at', new Date(startDate).toISOString());
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query = query.lte('created_at', end.toISOString());
        }

        // Pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data: logs, error } = await query;
        if (error) throw error;

        // Count with the same filters so the total is accurate
        let countQuery = supabase
            .from('activity_logs')
            .select('id', { count: 'exact', head: true })
            .in('branch_id', allowedBranchIds);

        if (filterBranchId) countQuery = countQuery.eq('branch_id', filterBranchId);
        if (cleanSearch) {
            countQuery = countQuery.or(`user_name.ilike.%${cleanSearch}%,action.ilike.%${cleanSearch}%,order_number.ilike.%${cleanSearch}%`);
        }
        if (action && action !== 'all') countQuery = countQuery.eq('action', action);
        if (user_id && user_id !== 'all') countQuery = countQuery.eq('user_id', user_id);
        if (startDate) countQuery = countQuery.gte('created_at', new Date(startDate).toISOString());
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            countQuery = countQuery.lte('created_at', end.toISOString());
        }

        const { count: totalCount, error: countError } = await countQuery;
        if (countError) throw countError;

        // Format logs
        const formattedLogs = (logs || []).map(log => ({
            ...log,
            branch_name: log.branches?.name || null,
            user_name: log.users?.full_name || log.user_name || 'System',
            user_email: log.users?.email || null,
            user_role: log.users?.role || null
        }));

        // Branch list for filter dropdown — scoped to what user can see
        const { data: branchList } = await supabase
            .from('branches')
            .select('id, name')
            .in('id', allowedBranchIds)
            .order('name');

        // Users for filter dropdown — scoped to visible branches
        const { data: users } = await supabase
            .from('users')
            .select('id, full_name, email, branch_id')
            .in('branch_id', allowedBranchIds)
            .eq('is_deleted', false)
            .order('full_name');

        // Today's summary — counts only, no row fetching
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);

        const { count: totalToday } = await supabase
            .from('activity_logs')
            .select('id', { count: 'exact', head: true })
            .in('branch_id', allowedBranchIds)
            .gte('created_at', startOfDay.toISOString());

        // Only user_ids, not full rows with JSONB payloads
        const { data: todayUsers } = await supabase
            .from('activity_logs')
            .select('user_id')
            .in('branch_id', allowedBranchIds)
            .gte('created_at', startOfDay.toISOString());

        const uniqueUsers = [...new Set((todayUsers || []).map(log => log.user_id).filter(Boolean))];

        return res.status(200).json({
            success: true,
            data: {
                logs: formattedLogs,
                pagination: {
                    total: totalCount || 0,
                    page: page,
                    limit: limit,
                    pages: Math.ceil((totalCount || 0) / limit)
                },
                filters: {
                    actions: KNOWN_ACTIONS,
                    users: users || [],
                    branches: branchList || []
                },
                summary: {
                    totalToday: totalToday || 0,
                    uniqueUsersToday: uniqueUsers.length
                }
            }
        });

    } catch (error) {
        console.error('Get activity logs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch activity logs'
        });
    }
};

// ============================================================
// GET ACTIVITY SUMMARY
// ============================================================
const getActivitySummary = async (req, res) => {
    try {
        const isBoss = req.user.is_boss === true;
        const scopeBusinessId = req.scope?.business_id || null;
        const scopeBranchId = req.scope?.branch_id || null;

        let allowedBranchIds = [];
        if (isBoss && scopeBusinessId) {
            const { data: brs } = await supabase
                .from('branches')
                .select('id')
                .eq('business_id', scopeBusinessId);
            allowedBranchIds = (brs || []).map(b => b.id);
        } else if (scopeBranchId) {
            allowedBranchIds = [scopeBranchId];
        }

        if (allowedBranchIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: { today: 0, week: 0, month: 0, topActions: [] }
            });
        }

        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [todayRes, weekRes, monthRes] = await Promise.all([
            supabase
                .from('activity_logs')
                .select('id', { count: 'exact', head: true })
                .in('branch_id', allowedBranchIds)
                .gte('created_at', startOfDay.toISOString()),
            supabase
                .from('activity_logs')
                .select('id', { count: 'exact', head: true })
                .in('branch_id', allowedBranchIds)
                .gte('created_at', startOfWeek.toISOString()),
            supabase
                .from('activity_logs')
                .select('action')
                .in('branch_id', allowedBranchIds)
                .gte('created_at', startOfMonth.toISOString())
        ]);

        if (todayRes.error) throw todayRes.error;
        if (weekRes.error) throw weekRes.error;
        if (monthRes.error) throw monthRes.error;

        const monthLogs = monthRes.data || [];

        const actionCount = {};
        monthLogs.forEach(log => {
            actionCount[log.action] = (actionCount[log.action] || 0) + 1;
        });

        const topActions = Object.entries(actionCount)
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return res.status(200).json({
            success: true,
            data: {
                today: todayRes.count || 0,
                week: weekRes.count || 0,
                month: monthLogs.length,
                topActions
            }
        });

    } catch (error) {
        console.error('Get activity summary error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch activity summary'
        });
    }
};

module.exports = {
    getActivityLogs,
    getActivitySummary
};