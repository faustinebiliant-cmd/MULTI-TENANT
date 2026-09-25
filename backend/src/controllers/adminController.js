// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Admin Controller
// Super-admin endpoints. Every action is audit-logged.
// ============================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const {
    isValidEmail,
    isValidPassword,
    isValidUUID,
    isValidLength,
    isSafeText,
    sanitize
} = require('../utils/validators');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

// ============================================================
// Audit logger — every admin mutation calls this
// ============================================================
const logAdminAction = async ({
    admin,
    action,
    targetType = null,
    targetId = null,
    targetLabel = null,
    reason = null,
    details = null,
    req
}) => {
    try {
        await supabase
            .from('admin_audit_logs')
            .insert({
                admin_id: admin.id,
                admin_email: admin.email,
                action,
                target_type: targetType,
                target_id: targetId,
                target_label: targetLabel,
                reason,
                details,
                ip_address: req.ip || req.connection?.remoteAddress || 'unknown',
                user_agent: req.headers['user-agent'] || ''
            });
    } catch (err) {
        console.error('Failed to write admin audit log:', err);
        // Never block the request just because logging failed
    }
};

// ============================================================
// Subscription info helper
// Computes days_total, days_used, days_remaining for a business.
// Used by the businesses list, business detail, and customer detail.
// ============================================================
const buildSubscriptionInfo = (business, hasPending = false) => {
    const status = business.subscription_status || 'trial';
    const endsAt = business.trial_ends_at;
    const startedAt = business.subscription_started_at;

    let daysTotal = 0;
    let daysUsed = 0;
    let daysRemaining = 0;

    if (endsAt) {
        const end = new Date(endsAt + 'T23:59:59.999Z');
        const now = new Date();
        const start = startedAt ? new Date(startedAt + 'T00:00:00.000Z') : null;

        if (start) {
            daysTotal = Math.round((end - start) / (1000 * 60 * 60 * 24));
        }

        const diffRemaining = end - now;
        daysRemaining = Math.max(0, Math.ceil(diffRemaining / (1000 * 60 * 60 * 24)));
        daysUsed = Math.max(0, daysTotal - daysRemaining);
    }

    return {
        status,
        started_at: startedAt,
        ends_at: endsAt,
        days_total: daysTotal,
        days_used: daysUsed,
        days_remaining: daysRemaining,
        is_expired: daysRemaining <= 0 && status !== 'active' && status !== 'suspended',
        has_pending_submission: hasPending
    };
};

// ============================================================
// POST /api/admin/login
// Public. Exchanges email + password for an admin JWT.
// ============================================================
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        const cleanEmail = sanitize(email.toLowerCase().trim());

        const { data: admin } = await supabase
            .from('platform_admins')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        if (!admin.is_active) {
            return res.status(403).json({
                success: false,
                error: 'Admin account is deactivated'
            });
        }

        const passwordMatch = await bcrypt.compare(password, admin.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const token = jwt.sign(
            {
                id: admin.id,
                email: admin.email,
                full_name: admin.full_name,
                type: 'admin'
            },
            ADMIN_JWT_SECRET,
            { expiresIn: '10m' }
        );

        await supabase
            .from('platform_admins')
            .update({
                last_login_at: new Date(),
                last_login_ip: req.ip || req.connection?.remoteAddress || 'unknown'
            })
            .eq('id', admin.id);

        await logAdminAction({
            admin,
            action: 'Admin Login',
            req
        });

        return res.status(200).json({
            success: true,
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                full_name: admin.full_name
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
};

// ============================================================
// GET /api/admin/me
// Returns the current admin's profile.
// ============================================================
const getAdminMe = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            admin: req.admin
        });
    } catch (error) {
        console.error('Get admin me error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch admin'
        });
    }
};

// ============================================================
// GET /api/admin/metrics
// Top-level platform metrics.
// ============================================================
const getMetrics = async (req, res) => {
    try {
        // Today in EAT, as YYYY-MM-DD strings for date comparisons
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const [
            businessesCount,
            activeBusinessesCount,
            usersCount,
            bossesCount,
            staffCount,
            ordersCount,
            recentBusinessesResult,
            recentSignupsResult,
            trialsEndingResult,
            activeExpiringResult,
            expiredResult
        ] = await Promise.all([
            supabase.from('businesses').select('id', { count: 'exact', head: true }),

            supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('is_active', true),

            supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_deleted', false),

            supabase.from('users').select('id', { count: 'exact', head: true })
                .eq('role', 'boss').eq('is_deleted', false),

            supabase.from('users').select('id', { count: 'exact', head: true })
                .neq('role', 'boss').eq('is_deleted', false),

            supabase.from('orders').select('id', { count: 'exact', head: true }),

            supabase
                .from('businesses')
                .select(`
                    id, name, business_code, created_at, is_active,
                    owner:owner_id (id, email, full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(10),

            supabase
                .from('businesses')
                .select('id, created_at')
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

            // Businesses whose trial ends in the next 7 days (or already past today)
            supabase
                .from('businesses')
                .select('id', { count: 'exact', head: true })
                .eq('subscription_status', 'trial')
                .gte('trial_ends_at', todayStr)
                .lte('trial_ends_at', in7Days),

            // Active subscriptions ending in the next 30 days
            supabase
                .from('businesses')
                .select('id', { count: 'exact', head: true })
                .eq('subscription_status', 'active')
                .gte('trial_ends_at', todayStr)
                .lte('trial_ends_at', in30Days),

            // Expired businesses
            supabase
                .from('businesses')
                .select('id', { count: 'exact', head: true })
                .eq('subscription_status', 'expired')
        ]);

        const signupsByDay = {};
        (recentSignupsResult.data || []).forEach(b => {
            const day = new Date(b.created_at).toISOString().slice(0, 10);
            signupsByDay[day] = (signupsByDay[day] || 0) + 1;
        });

        const signupsSeries = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            signupsSeries.push({ date: key, count: signupsByDay[key] || 0 });
        }

        return res.status(200).json({
            success: true,
            data: {
                businessesTotal: businessesCount.count || 0,
                businessesActive: activeBusinessesCount.count || 0,
                usersTotal: usersCount.count || 0,
                bossesTotal: bossesCount.count || 0,
                staffTotal: staffCount.count || 0,
                ordersTotal: ordersCount.count || 0,
                trialsEndingSoon: trialsEndingResult.count || 0,
                activeExpiringSoon: activeExpiringResult.count || 0,
                expiredTotal: expiredResult.count || 0,
                recentBusinesses: recentBusinessesResult.data || [],
                signupsSeries
            }
        });

    } catch (error) {
        console.error('Get admin metrics error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch metrics'
        });
    }
};

// ============================================================
// GET /api/admin/businesses
// List all businesses with summary stats.
// Supports subscription_filter: all | trial | active | expired |
// suspended | payment_pending
// ============================================================
const listAllBusinesses = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 50,
            search = '',
            status = 'all',
            subscription_filter = 'all'
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, error: 'Invalid page' });
        }
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
            return res.status(400).json({ success: false, error: 'Invalid limit' });
        }

        const VALID_SUB_FILTERS = ['all', 'trial', 'active', 'expired', 'suspended', 'payment_pending'];
        if (!VALID_SUB_FILTERS.includes(subscription_filter)) {
            return res.status(400).json({ success: false, error: 'Invalid subscription filter' });
        }

        // For the payment_pending filter, first fetch the business IDs
        // that have a pending submission, then filter by those.
        let pendingBusinessIds = null;
        if (subscription_filter === 'payment_pending') {
            const { data: pendingRows } = await supabase
                .from('payment_submissions')
                .select('business_id')
                .eq('status', 'pending');

            pendingBusinessIds = [...new Set((pendingRows || []).map(r => r.business_id))];

            if (pendingBusinessIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: [],
                    pagination: { total: 0, page: pageNum, limit: limitNum, pages: 0 }
                });
            }
        }

        let query = supabase
            .from('businesses')
            .select(`
                id, name, shop_name, business_code, location, phone, email,
                is_active, created_at, owner_id,
                subscription_status, trial_ends_at, subscription_started_at,
                owner:owner_id (id, email, full_name, account_code, is_active)
            `, { count: 'exact' });

        if (status === 'active') query = query.eq('is_active', true);
        if (status === 'suspended') query = query.eq('is_active', false);

        if (subscription_filter === 'trial') query = query.eq('subscription_status', 'trial');
        if (subscription_filter === 'active') query = query.eq('subscription_status', 'active');
        if (subscription_filter === 'expired') query = query.eq('subscription_status', 'expired');
        if (subscription_filter === 'suspended') query = query.eq('subscription_status', 'suspended');
        if (subscription_filter === 'payment_pending' && pendingBusinessIds) {
            query = query.in('id', pendingBusinessIds);
        }

        if (search && search.trim()) {
            const term = search.trim().replace(/[%_,()'"]/g, '');
            if (term) {
                query = query.or(`name.ilike.%${term}%,business_code.ilike.%${term}%,email.ilike.%${term}%`);
            }
        }

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        const { data: businesses, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Which of these businesses have pending submissions?
        let pendingSet = new Set();
        if ((businesses || []).length > 0) {
            const ids = businesses.map(b => b.id);
            const { data: pendingRows } = await supabase
                .from('payment_submissions')
                .select('business_id')
                .eq('status', 'pending')
                .in('business_id', ids);

            pendingSet = new Set((pendingRows || []).map(r => r.business_id));
        }

        const enriched = await Promise.all((businesses || []).map(async (b) => {
            const [branches, staff] = await Promise.all([
                supabase.from('branches').select('id', { count: 'exact', head: true }).eq('business_id', b.id),
                supabase.from('users').select('id', { count: 'exact', head: true }).eq('business_id', b.id).eq('is_deleted', false)
            ]);

            // Orders are attached to branches, not to businesses.
            // Fetch this business's branch IDs, then count orders
            // across those branches.
            const { data: branchRows } = await supabase
                .from('branches')
                .select('id')
                .eq('business_id', b.id);

            const branchIds = (branchRows || []).map(r => r.id);

            let orderCount = 0;
            if (branchIds.length > 0) {
                const { count: orders } = await supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .in('branch_id', branchIds);
                orderCount = orders || 0;
            }

            return {
                ...b,
                branch_count: branches.count || 0,
                staff_count: staff.count || 0,
                order_count: orderCount,
                subscription: buildSubscriptionInfo(b, pendingSet.has(b.id))
            };
        }));

        return res.status(200).json({
            success: true,
            data: enriched,
            pagination: {
                total: count || 0,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil((count || 0) / limitNum)
            }
        });

    } catch (error) {
        console.error('List businesses error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to list businesses'
        });
    }
};
// ============================================================
// GET /api/admin/businesses/:id
// Full detail view of one business.
// ============================================================
const getBusinessDetail = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid business ID' });
        }

        const { data: business, error } = await supabase
            .from('businesses')
            .select(`
                *,
                owner:owner_id (id, email, full_name, account_code, is_active, is_deleted, created_at)
            `)
            .eq('id', id)
            .single();

        if (error || !business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }

        const branchRows = (await supabase.from('branches').select('id').eq('business_id', id)).data || [];
        const branchIds = branchRows.map(b => b.id);

        const [branches, staff, productCount, customerCount, orderCount, pendingCountResult] = await Promise.all([
            supabase.from('branches').select('id, name, is_active, created_at').eq('business_id', id).order('name'),
            supabase.from('users').select('id, full_name, email, role, branch_id, is_active, is_deleted, created_at').eq('business_id', id).order('full_name'),
            branchIds.length > 0
                ? supabase.from('products').select('id', { count: 'exact', head: true }).in('branch_id', branchIds)
                : Promise.resolve({ count: 0 }),
            branchIds.length > 0
                ? supabase.from('customers').select('id', { count: 'exact', head: true }).in('branch_id', branchIds)
                : Promise.resolve({ count: 0 }),
            branchIds.length > 0
                ? supabase.from('orders').select('id', { count: 'exact', head: true }).in('branch_id', branchIds)
                : Promise.resolve({ count: 0 }),
            supabase.from('payment_submissions').select('id', { count: 'exact', head: true })
                .eq('business_id', id).eq('status', 'pending')
        ]);

        const { data: recentActions } = await supabase
            .from('admin_audit_logs')
            .select('id, admin_email, action, reason, created_at')
            .eq('target_type', 'business')
            .eq('target_id', id)
            .order('created_at', { ascending: false })
            .limit(20);

        const hasPendingSubmission = (pendingCountResult.count || 0) > 0;

        return res.status(200).json({
            success: true,
            data: {
                business,
                subscription: buildSubscriptionInfo(business, hasPendingSubmission),
                branches: branches.data || [],
                staff: staff.data || [],
                counts: {
                    products: productCount.count || 0,
                    customers: customerCount.count || 0,
                    orders: orderCount.count || 0
                },
                recentAdminActions: recentActions || []
            }
        });

    } catch (error) {
        console.error('Get business detail error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch business'
        });
    }
};

// ============================================================
// PATCH /api/admin/businesses/:id/suspend
// Body: { reason: string }
// ============================================================
const suspendBusiness = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid business ID' });
        }

        if (!reason || !isValidLength(reason, 5, 500) || !isSafeText(reason)) {
            return res.status(400).json({
                success: false,
                error: 'A reason (5-500 characters) is required'
            });
        }

        const cleanReason = sanitize(reason.trim());

        const { data: business } = await supabase
            .from('businesses')
            .select('id, name, is_active')
            .eq('id', id)
            .single();

        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }

        if (!business.is_active) {
            return res.status(400).json({ success: false, error: 'Business is already suspended' });
        }

        const { error } = await supabase
            .from('businesses')
            .update({ is_active: false, updated_at: new Date() })
            .eq('id', id);

        if (error) throw error;

        await logAdminAction({
            admin: req.admin,
            action: 'Business Suspended',
            targetType: 'business',
            targetId: id,
            targetLabel: business.name,
            reason: cleanReason,
            req
        });

        return res.status(200).json({
            success: true,
            message: 'Business suspended'
        });

    } catch (error) {
        console.error('Suspend business error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to suspend business'
        });
    }
};

// ============================================================
// PATCH /api/admin/businesses/:id/unsuspend
// Body: { reason: string }
// ============================================================
const unsuspendBusiness = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid business ID' });
        }

        if (!reason || !isValidLength(reason, 5, 500) || !isSafeText(reason)) {
            return res.status(400).json({
                success: false,
                error: 'A reason (5-500 characters) is required'
            });
        }

        const cleanReason = sanitize(reason.trim());

        const { data: business } = await supabase
            .from('businesses')
            .select('id, name, is_active')
            .eq('id', id)
            .single();

        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }

        if (business.is_active) {
            return res.status(400).json({ success: false, error: 'Business is not suspended' });
        }

        const { error } = await supabase
            .from('businesses')
            .update({ is_active: true, updated_at: new Date() })
            .eq('id', id);

        if (error) throw error;

        await logAdminAction({
            admin: req.admin,
            action: 'Business Unsuspended',
            targetType: 'business',
            targetId: id,
            targetLabel: business.name,
            reason: cleanReason,
            req
        });

        return res.status(200).json({
            success: true,
            message: 'Business unsuspended'
        });

    } catch (error) {
        console.error('Unsuspend business error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to unsuspend business'
        });
    }
};

// ============================================================
// PATCH /api/admin/users/:id/reset-password
// Body: { new_password, reason }
// ============================================================
const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password, reason } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }

        if (!new_password || !isValidPassword(new_password)) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters with at least 1 number'
            });
        }

        if (!reason || !isValidLength(reason, 5, 500) || !isSafeText(reason)) {
            return res.status(400).json({
                success: false,
                error: 'A reason (5-500 characters) is required'
            });
        }

        const { data: user } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('id', id)
            .single();

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 12);

        const { error } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                is_first_login: true,
                updated_at: new Date()
            })
            .eq('id', id);

        if (error) throw error;

        await logAdminAction({
            admin: req.admin,
            action: 'User Password Reset',
            targetType: 'user',
            targetId: id,
            targetLabel: `${user.full_name} (${user.email})`,
            reason: sanitize(reason.trim()),
            req
        });

        return res.status(200).json({
            success: true,
            message: 'Password reset. User will be asked to change it on next login.'
        });

    } catch (error) {
        console.error('Reset user password error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to reset password'
        });
    }
};

// ============================================================
// POST /api/admin/impersonate
// Body: { boss_user_id, business_id, reason }
// ============================================================
const startImpersonation = async (req, res) => {
    try {
        const { boss_user_id, business_id, reason } = req.body;

        if (!isValidUUID(boss_user_id) || !isValidUUID(business_id)) {
            return res.status(400).json({ success: false, error: 'Invalid IDs' });
        }

        if (!reason || !isValidLength(reason, 10, 500) || !isSafeText(reason)) {
            return res.status(400).json({
                success: false,
                error: 'A detailed reason (10-500 characters) is required'
            });
        }

        const cleanReason = sanitize(reason.trim());

        const { data: boss } = await supabase
            .from('users')
            .select('id, full_name, email, role, is_active, is_deleted, account_code')
            .eq('id', boss_user_id)
            .single();

        if (!boss || boss.role !== 'boss' || boss.is_deleted || !boss.is_active) {
            return res.status(400).json({ success: false, error: 'Boss not found or inactive' });
        }

        const { data: business } = await supabase
            .from('businesses')
            .select('id, name, owner_id')
            .eq('id', business_id)
            .single();

        if (!business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }

        if (business.owner_id !== boss.id) {
            return res.status(400).json({
                success: false,
                error: 'This business does not belong to that Boss'
            });
        }

        const tokenId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        const { data: session, error: insertErr } = await supabase
            .from('impersonation_sessions')
            .insert({
                admin_id: req.admin.id,
                admin_email: req.admin.email,
                boss_user_id: boss.id,
                boss_email: boss.email,
                boss_full_name: boss.full_name,
                business_id: business.id,
                business_name: business.name,
                reason: cleanReason,
                token_id: tokenId,
                expires_at: expiresAt.toISOString(),
                ip_address: req.ip || req.connection?.remoteAddress || 'unknown'
            })
            .select()
            .single();

        if (insertErr) throw insertErr;

        const impersonationToken = jwt.sign(
            {
                id: boss.id,
                email: boss.email,
                full_name: boss.full_name,
                role: boss.role,
                is_boss: true,
                is_first_login: false,
                account_code: boss.account_code,
                impersonation_token_id: tokenId,
                impersonated_by_admin: req.admin.id
            },
            process.env.JWT_SECRET,
            { expiresIn: '60m' }
        );

        await logAdminAction({
            admin: req.admin,
            action: 'Impersonation Started',
            targetType: 'business',
            targetId: business.id,
            targetLabel: business.name,
            reason: cleanReason,
            details: { boss_user_id: boss.id, boss_email: boss.email, session_id: session.id },
            req
        });

        return res.status(200).json({
            success: true,
            message: 'Impersonation started',
            impersonation: {
                session_id: session.id,
                business_id: business.id,
                business_name: business.name,
                boss_email: boss.email,
                expires_at: session.expires_at,
                reason: cleanReason
            },
            token: impersonationToken
        });

    } catch (error) {
        console.error('Start impersonation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to start impersonation'
        });
    }
};

// ============================================================
// POST /api/admin/impersonate/end
// Ends the current impersonation session (uses admin token).
// ============================================================
const endImpersonation = async (req, res) => {
    try {
        const { session_id } = req.body;

        if (!isValidUUID(session_id)) {
            return res.status(400).json({ success: false, error: 'Invalid session ID' });
        }

        const { data: session } = await supabase
            .from('impersonation_sessions')
            .select('*')
            .eq('id', session_id)
            .is('ended_at', null)
            .single();

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        if (session.admin_id !== req.admin.id) {
            return res.status(403).json({ success: false, error: 'Not your session' });
        }

        await supabase
            .from('impersonation_sessions')
            .update({ ended_at: new Date(), ended_by: 'admin' })
            .eq('id', session_id);

        await logAdminAction({
            admin: req.admin,
            action: 'Impersonation Ended',
            targetType: 'business',
            targetId: session.business_id,
            targetLabel: session.business_name,
            reason: session.reason,
            details: { session_id },
            req
        });

        return res.status(200).json({
            success: true,
            message: 'Impersonation ended'
        });

    } catch (error) {
        console.error('End impersonation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to end impersonation'
        });
    }
};

// ============================================================
// GET /api/admin/audit-logs
// Paginated admin action log.
// ============================================================
const listAuditLogs = async (req, res) => {
    try {
        let { page = 1, limit = 50, action } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        let query = supabase
            .from('admin_audit_logs')
            .select('*', { count: 'exact' });

        if (action) query = query.eq('action', action);

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        return res.status(200).json({
            success: true,
            data: data || [],
            pagination: {
                total: count || 0,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil((count || 0) / limitNum)
            }
        });

    } catch (error) {
        console.error('List audit logs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch audit logs'
        });
    }
};

// ============================================================
// GET /api/admin/customers
// List all Bosses with aggregate stats across their businesses.
// Includes a subscription summary per Boss.
// ============================================================
const listAllCustomers = async (req, res) => {
    try {
        let { page = 1, limit = 50, search = '' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, error: 'Invalid page' });
        }
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
            return res.status(400).json({ success: false, error: 'Invalid limit' });
        }

        let query = supabase
            .from('users')
            .select(
                'id, full_name, email, phone, account_code, is_active, is_deleted, created_at',
                { count: 'exact' }
            )
            .eq('role', 'boss')
            .eq('is_deleted', false);

        if (search && search.trim()) {
            const term = search.trim().replace(/[%_,()'"]/g, '');
            if (term) {
                query = query.or(
                    `full_name.ilike.%${term}%,email.ilike.%${term}%,account_code.ilike.%${term}%`
                );
            }
        }

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        const { data: bosses, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const enriched = await Promise.all((bosses || []).map(async (boss) => {
            const { data: bizRows } = await supabase
                .from('businesses')
                .select('id, is_active, subscription_status')
                .eq('owner_id', boss.id);

            const businessIds = (bizRows || []).map(b => b.id);
            const activeCount = (bizRows || []).filter(b => b.is_active).length;

            const subscriptionSummary = {
                trial: (bizRows || []).filter(b => b.subscription_status === 'trial').length,
                active: (bizRows || []).filter(b => b.subscription_status === 'active').length,
                expired: (bizRows || []).filter(b => b.subscription_status === 'expired').length,
                suspended: (bizRows || []).filter(b => b.subscription_status === 'suspended').length
            };

            let branchCount = 0;
            let staffCount = 0;

            if (businessIds.length > 0) {
                const { data: branchRows } = await supabase
                    .from('branches')
                    .select('id')
                    .in('business_id', businessIds);

                branchCount = (branchRows || []).length;

                const { count: staff } = await supabase
                    .from('users')
                    .select('id', { count: 'exact', head: true })
                    .neq('role', 'boss')
                    .in('business_id', businessIds)
                    .eq('is_deleted', false);

                staffCount = staff || 0;
            }

            return {
                id: boss.id,
                full_name: boss.full_name,
                email: boss.email,
                phone: boss.phone,
                account_code: boss.account_code,
                is_active: boss.is_active,
                created_at: boss.created_at,
                business_count: businessIds.length,
                active_business_count: activeCount,
                branch_count: branchCount,
                staff_count: staffCount,
                subscriptions: subscriptionSummary
            };
        }));

        return res.status(200).json({
            success: true,
            data: enriched,
            pagination: {
                total: count || 0,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil((count || 0) / limitNum)
            }
        });

    } catch (error) {
        console.error('List customers error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to list customers'
        });
    }
};

// ============================================================
// GET /api/admin/customers/:id
// One Boss with full detail: all businesses, staff, aggregates.
// Each business now carries its own subscription object.
// ============================================================
const getCustomerDetail = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid customer ID' });
        }

        const { data: boss, error } = await supabase
            .from('users')
            .select(
                'id, full_name, email, phone, account_code, is_active, is_deleted, created_at'
            )
            .eq('id', id)
            .eq('role', 'boss')
            .single();

        if (error || !boss) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const { data: businesses } = await supabase
            .from('businesses')
            .select(`
                id, name, shop_name, business_code, location, phone, email,
                is_active, created_at,
                subscription_status, trial_ends_at, subscription_started_at,
                branches (id, name, is_active)
            `)
            .eq('owner_id', boss.id)
            .order('created_at', { ascending: false });

        const businessIds = (businesses || []).map(b => b.id);

        let staff = [];
        let orderCount = 0;
        let customerCount = 0;

        if (businessIds.length > 0) {
            const { data: staffRows } = await supabase
                .from('users')
                .select('id, full_name, email, role, business_id, branch_id, is_active, is_deleted, created_at')
                .neq('role', 'boss')
                .in('business_id', businessIds)
                .order('created_at', { ascending: false });

            staff = staffRows || [];

            const allBranchIds = (businesses || []).flatMap(b =>
                (b.branches || []).map(br => br.id)
            );

            if (allBranchIds.length > 0) {
                const { count: orders } = await supabase
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .in('branch_id', allBranchIds);
                orderCount = orders || 0;

                const { count: customers } = await supabase
                    .from('customers')
                    .select('id', { count: 'exact', head: true })
                    .in('branch_id', allBranchIds);
                customerCount = customers || 0;
            }
        }

        // Which businesses have a pending submission?
        let pendingSet = new Set();
        if (businessIds.length > 0) {
            const { data: pendingRows } = await supabase
                .from('payment_submissions')
                .select('business_id')
                .eq('status', 'pending')
                .in('business_id', businessIds);

            pendingSet = new Set((pendingRows || []).map(r => r.business_id));
        }

        const businessesWithSub = (businesses || []).map(b => ({
            ...b,
            subscription: buildSubscriptionInfo(b, pendingSet.has(b.id))
        }));

        const { data: recentActions } = await supabase
            .from('admin_audit_logs')
            .select('id, admin_email, action, reason, created_at')
            .eq('target_type', 'user')
            .eq('target_id', boss.id)
            .order('created_at', { ascending: false })
            .limit(20);

        return res.status(200).json({
            success: true,
            data: {
                boss,
                businesses: businessesWithSub,
                staff: staff.filter(s => !s.is_deleted),
                counts: {
                    business_count: businessIds.length,
                    active_business_count: (businesses || []).filter(b => b.is_active).length,
                    branch_count: (businesses || []).reduce(
                        (sum, b) => sum + ((b.branches || []).length),
                        0
                    ),
                    staff_count: staff.filter(s => !s.is_deleted).length,
                    orders: orderCount,
                    customers: customerCount
                },
                recentAdminActions: recentActions || []
            }
        });

    } catch (error) {
        console.error('Get customer detail error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch customer'
        });
    }
};

// ============================================================
// GET /api/admin/payment-submissions
// Paginated list of submissions. Filter by status.
// ============================================================
const listPaymentSubmissions = async (req, res) => {
    try {
        let { page = 1, limit = 50, status = 'pending' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, error: 'Invalid page' });
        }
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
            return res.status(400).json({ success: false, error: 'Invalid limit' });
        }

        const VALID_STATUSES = ['pending', 'approved', 'rejected', 'all'];
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status filter' });
        }

        let query = supabase
            .from('payment_submissions')
            .select(`
                id, business_id, submitted_by, submitted_by_name,
                method, amount, duration_months, transaction_id,
                status, rejection_reason, reviewed_by_email, reviewed_at,
                created_at,
                business:business_id (id, name, business_code, subscription_status, trial_ends_at),
                submitted_by_user:submitted_by (id, full_name, email, account_code)
            `, { count: 'exact' });

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        return res.status(200).json({
            success: true,
            data: data || [],
            pagination: {
                total: count || 0,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil((count || 0) / limitNum)
            }
        });

    } catch (error) {
        console.error('List payment submissions error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to list payment submissions'
        });
    }
};

// ============================================================
// POST /api/admin/payment-submissions/:id/approve
// Body: { extend_months }
// Marks submission approved, sets business to active, extends
// trial_ends_at by extend_months from whichever is later:
// today, or the current trial_ends_at.
// Also sets subscription_started_at to the start of the new period.
// ============================================================
const approvePaymentSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { extend_months } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid submission ID' });
        }

        const months = parseInt(extend_months, 10);
        if (isNaN(months) || months < 1 || months > 24) {
            return res.status(400).json({
                success: false,
                error: 'Extend months must be between 1 and 24'
            });
        }

        const { data: submission, error: subError } = await supabase
            .from('payment_submissions')
            .select('*')
            .eq('id', id)
            .single();

        if (subError || !submission) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }

        if (submission.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Submission is already ${submission.status}`
            });
        }

        const { data: business, error: bizError } = await supabase
            .from('businesses')
            .select('id, name, trial_ends_at, subscription_status')
            .eq('id', submission.business_id)
            .single();

        if (bizError || !business) {
            return res.status(404).json({ success: false, error: 'Business not found' });
        }

        const baseDate = business.trial_ends_at
            ? new Date(business.trial_ends_at + 'T23:59:59.999Z')
            : new Date();
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const startFrom = baseDate > todayStart ? baseDate : todayStart;

        const newEnd = new Date(startFrom);
        newEnd.setUTCMonth(newEnd.getUTCMonth() + months);

        const newTrialEndsAt = newEnd.toISOString().slice(0, 10);
        const newStartedAt = startFrom.toISOString().slice(0, 10);

        const { error: bizUpdateError } = await supabase
            .from('businesses')
            .update({
                subscription_status: 'active',
                trial_ends_at: newTrialEndsAt,
                subscription_started_at: newStartedAt,
                updated_at: new Date()
            })
            .eq('id', business.id);

        if (bizUpdateError) throw bizUpdateError;

        const { error: subUpdateError } = await supabase
            .from('payment_submissions')
            .update({
                status: 'approved',
                reviewed_by: req.admin.id,
                reviewed_by_email: req.admin.email,
                reviewed_at: new Date()
            })
            .eq('id', id);

        if (subUpdateError) throw subUpdateError;

        await logAdminAction({
            admin: req.admin,
            action: 'Payment Submission Approved',
            targetType: 'business',
            targetId: business.id,
            targetLabel: business.name,
            reason: `Extended by ${months} month(s)`,
            details: {
                submission_id: id,
                amount: submission.amount,
                duration_months: submission.duration_months,
                transaction_id: submission.transaction_id,
                new_trial_ends_at: newTrialEndsAt,
                new_subscription_started_at: newStartedAt,
                extend_months: months
            },
            req
        });

        return res.status(200).json({
            success: true,
            message: 'Submission approved. Business is now active.',
            data: {
                business_id: business.id,
                subscription_status: 'active',
                trial_ends_at: newTrialEndsAt,
                subscription_started_at: newStartedAt
            }
        });

    } catch (error) {
        console.error('Approve payment submission error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to approve submission'
        });
    }
};

// ============================================================
// POST /api/admin/payment-submissions/:id/reject
// Body: { reason }
// ============================================================
const rejectPaymentSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid submission ID' });
        }

        if (!reason || !isValidLength(reason, 5, 500) || !isSafeText(reason)) {
            return res.status(400).json({
                success: false,
                error: 'A reason (5-500 characters) is required'
            });
        }

        const cleanReason = sanitize(reason.trim());

        const { data: submission, error: subError } = await supabase
            .from('payment_submissions')
            .select('*')
            .eq('id', id)
            .single();

        if (subError || !submission) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }

        if (submission.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Submission is already ${submission.status}`
            });
        }

        const { error: updateError } = await supabase
            .from('payment_submissions')
            .update({
                status: 'rejected',
                rejection_reason: cleanReason,
                reviewed_by: req.admin.id,
                reviewed_by_email: req.admin.email,
                reviewed_at: new Date()
            })
            .eq('id', id);

        if (updateError) throw updateError;

        await logAdminAction({
            admin: req.admin,
            action: 'Payment Submission Rejected',
            targetType: 'business',
            targetId: submission.business_id,
            targetLabel: submission.submitted_by_name,
            reason: cleanReason,
            details: {
                submission_id: id,
                amount: submission.amount,
                transaction_id: submission.transaction_id
            },
            req
        });

        return res.status(200).json({
            success: true,
            message: 'Submission rejected'
        });

    } catch (error) {
        console.error('Reject payment submission error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to reject submission'
        });
    }
};

module.exports = {
    adminLogin,
    getAdminMe,
    getMetrics,
    listAllBusinesses,
    getBusinessDetail,
    suspendBusiness,
    unsuspendBusiness,
    resetUserPassword,
    startImpersonation,
    endImpersonation,
    listAuditLogs,
    listAllCustomers,
    getCustomerDetail,
    listPaymentSubmissions,
    approvePaymentSubmission,
    rejectPaymentSubmission
};