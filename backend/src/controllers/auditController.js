// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Audit Controller (UPDATED)
// ============================================================

const supabase = require('../config/supabase');
const {
    isValidUUID,
    isValidLength,
    isSafeText,
    sanitize
} = require('../utils/validators');

// ============================================================
// GET ALL ACTIVITY LOGS - WITH QUERY PARAMETER VALIDATION
// ============================================================

const getActivityLogs = async (req, res) => {
    try {
        let { action, user_id, startDate, endDate, limit = 100, page = 1 } = req.query;

        // ✅ VALIDATE AND SANITIZE INPUTS
        if (action && action !== 'all') {
            if (!isValidLength(action, 1, 100) || !isSafeText(action)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid action parameter'
                });
            }
            action = sanitize(action);
        }

        if (user_id && user_id !== 'all') {
            if (!isValidUUID(user_id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid user ID'
                });
            }
        }

        // ✅ VALIDATE DATES
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

        // ✅ VALIDATE PAGINATION
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

        // Build query
        let query = supabase
            .from('activity_logs')
            .select(`
                *,
                users:user_id (full_name, email, role)
            `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (action && action !== 'all') {
            query = query.eq('action', action);
        }

        if (user_id && user_id !== 'all') {
            query = query.eq('user_id', user_id);
        }

        if (startDate) {
            query = query.gte('created_at', new Date(startDate).toISOString());
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query = query.lte('created_at', end.toISOString());
        }

        // Pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data: logs, error, count } = await query;

        if (error) throw error;

        // Get total count for pagination
        const { count: totalCount, error: countError } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // Format logs
        const formattedLogs = logs.map(log => ({
            ...log,
            user_name: log.users?.full_name || log.user_name || 'System',
            user_email: log.users?.email || null,
            user_role: log.users?.role || null
        }));

        // Get unique actions for filter
        const { data: actions, error: actionsError } = await supabase
            .from('activity_logs')
            .select('action')
            .order('action');

        if (actionsError) throw actionsError;

        const uniqueActions = [...new Set(actions.map(a => a.action))];

        // Get unique users for filter
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, full_name, email')
            .order('full_name');

        if (usersError) throw usersError;

        // Activity summary
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);

        const { data: todayLogs, error: todayError } = await supabase
            .from('activity_logs')
            .select('*')
            .gte('created_at', startOfDay.toISOString());

        if (todayError) throw todayError;

        const uniqueUsers = [...new Set(todayLogs.map(log => log.user_id))];

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
                    actions: uniqueActions,
                    users: users
                },
                summary: {
                    totalToday: todayLogs.length,
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
        // No user input to validate here - it's a fixed report
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Today's activity
        const { data: todayLogs, error: todayError } = await supabase
            .from('activity_logs')
            .select('*')
            .gte('created_at', startOfDay.toISOString());

        if (todayError) throw todayError;

        // This week's activity
        const { data: weekLogs, error: weekError } = await supabase
            .from('activity_logs')
            .select('*')
            .gte('created_at', startOfWeek.toISOString());

        if (weekError) throw weekError;

        // This month's activity
        const { data: monthLogs, error: monthError } = await supabase
            .from('activity_logs')
            .select('*')
            .gte('created_at', startOfMonth.toISOString());

        if (monthError) throw monthError;

        // Action breakdown
        const actionCount = {};
        monthLogs.forEach(log => {
            if (!actionCount[log.action]) {
                actionCount[log.action] = 0;
            }
            actionCount[log.action]++;
        });

        const topActions = Object.entries(actionCount)
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return res.status(200).json({
            success: true,
            data: {
                today: todayLogs.length,
                week: weekLogs.length,
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