// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Business Controller
// Manages businesses and branches. Replaces the old
// settings-based shop identity model.
// ============================================================

const supabase = require('../config/supabase');
const {
    isValidUUID,
    isValidLength,
    isSafeText,
    isValidPhone,
    isValidEmail,
    isValidName,
    sanitize
} = require('../utils/validators');

// ============================================================
// Helpers
// ============================================================

const parseExpenseCategories = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [];
};

const validateExpenseCategories = (value) => {
    if (value === undefined) return { ok: true, value: undefined };
    if (!Array.isArray(value)) {
        return { ok: false, error: 'expense_categories must be an array' };
    }
    if (value.length > 50) {
        return { ok: false, error: 'Cannot have more than 50 expense categories' };
    }
    for (const c of value) {
        if (typeof c !== 'string') {
            return { ok: false, error: 'Each expense category must be a string' };
        }
        if (c.length === 0 || c.length > 50) {
            return { ok: false, error: 'Each expense category must be 1-50 characters' };
        }
        if (!isSafeText(c)) {
            return { ok: false, error: 'Expense category contains invalid content' };
        }
    }
    return { ok: true, value: value.map(c => sanitize(c)) };
};

const validateBusinessPayload = (body) => {
    const updates = {};

    if (body.name !== undefined) {
        if (!isValidName(body.name) || !isSafeText(body.name)) {
            return { ok: false, error: 'Business name must be 2-20 characters and contain no HTML or scripts' };
        }
        updates.name = sanitize(body.name.trim());
    }

    if (body.shop_name !== undefined) {
        if (!isValidLength(body.shop_name, 0, 100) || !isSafeText(body.shop_name)) {
            return { ok: false, error: 'Shop name must be less than 100 characters and contain no HTML or scripts' };
        }
        updates.shop_name = body.shop_name ? sanitize(body.shop_name.trim()) : '';
    }

    if (body.location !== undefined) {
        if (!isValidLength(body.location, 0, 200) || !isSafeText(body.location)) {
            return { ok: false, error: 'Location must be less than 200 characters and contain no HTML or scripts' };
        }
        updates.location = body.location ? sanitize(body.location.trim()) : '';
    }

    if (body.phone !== undefined) {
        if (body.phone && (!isValidPhone(body.phone) || !isSafeText(body.phone))) {
            return { ok: false, error: 'Invalid phone number format' };
        }
        updates.phone = body.phone ? sanitize(body.phone.trim()) : '';
    }

    if (body.email !== undefined) {
        if (body.email && (!isValidEmail(body.email) || !isSafeText(body.email))) {
            return { ok: false, error: 'Invalid email format' };
        }
        updates.email = body.email ? sanitize(body.email.toLowerCase().trim()) : '';
    }

    if (body.currency !== undefined) {
        if (!['TZS', 'USD', 'EUR'].includes(body.currency)) {
            return { ok: false, error: 'Currency must be TZS, USD, or EUR' };
        }
        updates.currency = body.currency;
    }

    if (body.tin !== undefined) {
        if (!isValidLength(body.tin, 0, 50) || !isSafeText(body.tin)) {
            return { ok: false, error: 'TIN must be less than 50 characters' };
        }
        updates.tin = body.tin ? sanitize(body.tin.trim()) : '';
    }

    if (body.vrn !== undefined) {
        if (!isValidLength(body.vrn, 0, 50) || !isSafeText(body.vrn)) {
            return { ok: false, error: 'VRN must be less than 50 characters' };
        }
        updates.vrn = body.vrn ? sanitize(body.vrn.trim()) : '';
    }

    if (body.vat_enabled !== undefined) {
        if (typeof body.vat_enabled !== 'boolean') {
            return { ok: false, error: 'vat_enabled must be a boolean' };
        }
        updates.vat_enabled = body.vat_enabled;
    }

    if (body.vat_rate !== undefined) {
        const rate = parseFloat(body.vat_rate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
            return { ok: false, error: 'VAT rate must be between 0 and 100' };
        }
        updates.vat_rate = rate;
    }

    if (body.expense_categories !== undefined) {
        const catResult = validateExpenseCategories(body.expense_categories);
        if (!catResult.ok) return catResult;
        updates.expense_categories = catResult.value;
    }

    if (body.quick_sale_enabled !== undefined) {
        if (typeof body.quick_sale_enabled !== 'boolean') {
            return { ok: false, error: 'quick_sale_enabled must be a boolean' };
        }
        updates.quick_sale_enabled = body.quick_sale_enabled;
    }

    return { ok: true, value: updates };
};

const validateBranchPayload = (body) => {
    const updates = {};

    if (body.name !== undefined) {
        if (!isValidName(body.name) || !isSafeText(body.name)) {
            return { ok: false, error: 'Branch name must be 2-20 characters and contain no HTML or scripts' };
        }
        updates.name = sanitize(body.name.trim());
    }

    if (body.location !== undefined) {
        if (!isValidLength(body.location, 0, 200) || !isSafeText(body.location)) {
            return { ok: false, error: 'Location must be less than 200 characters and contain no HTML or scripts' };
        }
        updates.location = body.location ? sanitize(body.location.trim()) : '';
    }

    if (body.phone !== undefined) {
        if (body.phone && (!isValidPhone(body.phone) || !isSafeText(body.phone))) {
            return { ok: false, error: 'Invalid phone number format' };
        }
        updates.phone = body.phone ? sanitize(body.phone.trim()) : '';
    }

    if (body.email !== undefined) {
        if (body.email && (!isValidEmail(body.email) || !isSafeText(body.email))) {
            return { ok: false, error: 'Invalid email format' };
        }
        updates.email = body.email ? sanitize(body.email.toLowerCase().trim()) : '';
    }

    return { ok: true, value: updates };
};

const shapeBusiness = (business) => ({
    id: business.id,
    name: business.name,
    shopName: business.shop_name,
    location: business.location,
    phone: business.phone,
    email: business.email,
    currency: business.currency,
    tin: business.tin,
    vrn: business.vrn,
    vat_enabled: business.vat_enabled,
    vat_rate: business.vat_rate,
    quick_sale_enabled: business.quick_sale_enabled === true,
    expense_categories: parseExpenseCategories(business.expense_categories),
    is_active: business.is_active,
    branches: (business.branches || []).map(b => ({
        id: b.id,
        name: b.name,
        location: b.location,
        phone: b.phone,
        email: b.email,
        is_active: b.is_active
    }))
});

// ============================================================
// GET /api/business/current  (and alias GET /api/settings)
// ============================================================
const getCurrent = async (req, res) => {
    try {
        let businessId = req.scope?.business_id;

        if (!businessId && req.user.is_boss) {
            const { data: firstBiz, error: firstErr } = await supabase
                .from('businesses')
                .select('id')
                .eq('owner_id', req.user.id)
                .eq('is_active', true)
                .order('created_at')
                .limit(1)
                .single();

            if (firstErr || !firstBiz) {
                return res.status(200).json({
                    success: true,
                    data: {},
                    note: 'No business yet. Create one to get started.'
                });
            }
            businessId = firstBiz.id;
        }

        if (!businessId) {
            return res.status(403).json({
                success: false,
                error: 'No active business in scope'
            });
        }

        const { data: business, error } = await supabase
            .from('businesses')
            .select(`
                id, name, shop_name, location, phone, email,
                currency, tin, vrn, vat_enabled, vat_rate,
                quick_sale_enabled,
                expense_categories, is_active,
                branches (id, name, location, phone, email, is_active)
            `)
            .eq('id', businessId)
            .single();

        if (error || !business) {
            return res.status(404).json({
                success: false,
                error: 'Business not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: shapeBusiness(business)
        });

    } catch (error) {
        console.error('Get current business error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch business'
        });
    }
};

// ============================================================
// GET /api/business/list  (Boss only)
// ============================================================
const listBusinesses = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({
                success: false,
                error: 'Only the Boss can list businesses'
            });
        }

        const { data: businesses, error } = await supabase
            .from('businesses')
            .select(`
                id, name, shop_name, location, phone, email,
                currency, tin, vrn, vat_enabled, vat_rate,
                quick_sale_enabled,
                expense_categories, is_active,
                branches (id, name, location, phone, email, is_active)
            `)
            .eq('owner_id', req.user.id)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        return res.status(200).json({
            success: true,
            data: (businesses || []).map(shapeBusiness)
        });

    } catch (error) {
        console.error('List businesses error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch businesses'
        });
    }
};

// ============================================================
// PUT /api/business/current  (and alias PUT /api/settings)
// ============================================================
const updateCurrent = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({
                success: false,
                error: 'Only the Boss can update business settings'
            });
        }

        const businessId = req.scope?.business_id;
        if (!businessId) {
            return res.status(400).json({
                success: false,
                error: 'No active business selected'
            });
        }

        const result = validateBusinessPayload(req.body);
        if (!result.ok) {
            return res.status(400).json({ success: false, error: result.error });
        }

        if (Object.keys(result.value).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nothing to update'
            });
        }

        result.value.updated_at = new Date();

        const { data: business, error } = await supabase
            .from('businesses')
            .update(result.value)
            .eq('id', businessId)
            .eq('owner_id', req.user.id)
            .select(`
                id, name, shop_name, location, phone, email,
                currency, tin, vrn, vat_enabled, vat_rate,
                quick_sale_enabled,
                expense_categories, is_active,
                branches (id, name, location, phone, email, is_active)
            `)
            .single();

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: req.scope?.branch_id || null,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Business Updated',
                details: { business_id: businessId, changes: result.value }
            });

        return res.status(200).json({
            success: true,
            message: 'Business updated successfully',
            data: shapeBusiness(business)
        });

    } catch (error) {
        console.error('Update business error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update business: ' + error.message
        });
    }
};

// ============================================================
// POST /api/business  (Boss only)
// ============================================================
const createBusiness = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({
                success: false,
                error: 'Only the Boss can create businesses'
            });
        }

        const { name, branch_name, location, phone, email } = req.body;

        if (!name || !isValidName(name) || !isSafeText(name)) {
            return res.status(400).json({
                success: false,
                error: 'Business name must be 2-20 characters and contain no HTML or scripts'
            });
        }

        if (!branch_name || !isValidName(branch_name) || !isSafeText(branch_name)) {
            return res.status(400).json({
                success: false,
                error: 'First branch name must be 2-20 characters and contain no HTML or scripts'
            });
        }

        const cleanName = sanitize(name.trim());
        const cleanBranch = sanitize(branch_name.trim());

        const { data: business, error: bizErr } = await supabase
            .from('businesses')
            .insert({
                owner_id: req.user.id,
                name: cleanName,
                shop_name: cleanName,
                location: location ? sanitize(location.trim()) : '',
                phone: phone ? sanitize(phone.trim()) : '',
                email: email ? sanitize(email.toLowerCase().trim()) : '',
                currency: 'TZS',
                vat_enabled: false,
                vat_rate: 18,
                expense_categories: ['Rent', 'Salaries', 'Utilities', 'Transport', 'Supplies', 'Other']
            })
            .select()
            .single();

        if (bizErr) throw bizErr;

        const { error: branchErr } = await supabase
            .from('branches')
            .insert({
                business_id: business.id,
                name: cleanBranch,
                location: business.location,
                phone: business.phone,
                email: business.email
            });

        if (branchErr) {
            await supabase.from('businesses').delete().eq('id', business.id);
            throw branchErr;
        }

        await supabase
            .from('activity_logs')
            .insert({
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Business Created',
                details: { business_id: business.id, branch_name: cleanBranch }
            });

        return res.status(201).json({
            success: true,
            message: 'Business created successfully',
            data: business
        });

    } catch (error) {
        console.error('Create business error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create business: ' + error.message
        });
    }
};

// ============================================================
// GET /api/business/branches
// ============================================================
const listBranches = async (req, res) => {
    try {
        const businessId = req.scope?.business_id;
        if (!businessId) {
            return res.status(400).json({
                success: false,
                error: 'No active business selected'
            });
        }

        const { data: branches, error } = await supabase
            .from('branches')
            .select('id, name, location, phone, email, is_active, created_at')
            .eq('business_id', businessId)
            .order('name');

        if (error) throw error;

        return res.status(200).json({
            success: true,
            data: branches || []
        });

    } catch (error) {
        console.error('List branches error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch branches'
        });
    }
};

// ============================================================
// POST /api/business/branches  (Boss only)
// ============================================================
const createBranch = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({
                success: false,
                error: 'Only the Boss can create branches'
            });
        }

        const businessId = req.scope?.business_id;
        if (!businessId) {
            return res.status(400).json({
                success: false,
                error: 'No active business selected'
            });
        }

        const result = validateBranchPayload(req.body);
        if (!result.ok) {
            return res.status(400).json({ success: false, error: result.error });
        }

        if (!result.value.name) {
            return res.status(400).json({
                success: false,
                error: 'Branch name is required'
            });
        }

        const { data: branch, error } = await supabase
            .from('branches')
            .insert({
                business_id: businessId,
                name: result.value.name,
                location: result.value.location || '',
                phone: result.value.phone || '',
                email: result.value.email || ''
            })
            .select()
            .single();

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: branch.id,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Branch Created',
                details: { branch_id: branch.id, name: branch.name }
            });

        return res.status(201).json({
            success: true,
            message: 'Branch created successfully',
            data: branch
        });

    } catch (error) {
        console.error('Create branch error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create branch: ' + error.message
        });
    }
};

// ============================================================
// PUT /api/business/branches/:id  (Boss only)
// ============================================================
const updateBranch = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({
                success: false,
                error: 'Only the Boss can update branches'
            });
        }

        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid branch ID'
            });
        }

        const businessId = req.scope?.business_id;
        if (!businessId) {
            return res.status(400).json({
                success: false,
                error: 'No active business selected'
            });
        }

        const { data: existing } = await supabase
            .from('branches')
            .select('id, business_id')
            .eq('id', id)
            .single();

        if (!existing || existing.business_id !== businessId) {
            return res.status(404).json({
                success: false,
                error: 'Branch not found in the active business'
            });
        }

        const result = validateBranchPayload(req.body);
        if (!result.ok) {
            return res.status(400).json({ success: false, error: result.error });
        }

        if (Object.keys(result.value).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nothing to update'
            });
        }

        result.value.updated_at = new Date();

        const { data: branch, error } = await supabase
            .from('branches')
            .update(result.value)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: branch.id,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Branch Updated',
                details: { branch_id: id, changes: result.value }
            });

        return res.status(200).json({
            success: true,
            message: 'Branch updated successfully',
            data: branch
        });

    } catch (error) {
        console.error('Update branch error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update branch: ' + error.message
        });
    }
};

// ============================================================
// PATCH /api/business/branches/:id/deactivate  (Boss only)
// Flips is_active = false. Preserves all data.
// Refuses if it's the last active branch of the business
// or if active staff are still assigned to it.
// ============================================================
const deactivateBranch = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({
                success: false,
                error: 'Only the Boss can deactivate branches'
            });
        }

        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid branch ID'
            });
        }

        const businessId = req.scope?.business_id;
        if (!businessId) {
            return res.status(400).json({
                success: false,
                error: 'No active business selected'
            });
        }

        const { data: branch } = await supabase
            .from('branches')
            .select('id, business_id, is_active')
            .eq('id', id)
            .single();

        if (!branch || branch.business_id !== businessId) {
            return res.status(404).json({
                success: false,
                error: 'Branch not found in the active business'
            });
        }

        if (!branch.is_active) {
            return res.status(400).json({
                success: false,
                error: 'Branch is already inactive'
            });
        }

        const { count, error: countError } = await supabase
            .from('branches')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .eq('is_active', true);

        if (countError) throw countError;

        if ((count || 0) <= 1) {
            return res.status(400).json({
                success: false,
                error: 'Cannot deactivate the last active branch. Create another branch first.'
            });
        }

        const { count: staffCount } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', id)
            .eq('is_active', true)
            .eq('is_deleted', false);

        if ((staffCount || 0) > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot deactivate — ${staffCount} active staff member(s) are assigned to this branch. Reassign or deactivate them first.`
            });
        }

        const { data: updated, error } = await supabase
            .from('branches')
            .update({ is_active: false, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: null,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Branch Deactivated',
                details: { branch_id: id, name: updated.name }
            });

        return res.status(200).json({
            success: true,
            message: 'Branch deactivated. Its data is preserved.',
            data: updated
        });

    } catch (error) {
        console.error('Deactivate branch error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to deactivate branch: ' + error.message
        });
    }
};

// ============================================================
// PATCH /api/business/branches/:id/activate  (Boss only)
// ============================================================
const activateBranch = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({
                success: false,
                error: 'Only the Boss can activate branches'
            });
        }

        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid branch ID'
            });
        }

        const businessId = req.scope?.business_id;
        if (!businessId) {
            return res.status(400).json({
                success: false,
                error: 'No active business selected'
            });
        }

        const { data: branch } = await supabase
            .from('branches')
            .select('id, business_id, is_active')
            .eq('id', id)
            .single();

        if (!branch || branch.business_id !== businessId) {
            return res.status(404).json({
                success: false,
                error: 'Branch not found in the active business'
            });
        }

        if (branch.is_active) {
            return res.status(400).json({
                success: false,
                error: 'Branch is already active'
            });
        }

        const { data: updated, error } = await supabase
            .from('branches')
            .update({ is_active: true, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: id,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Branch Activated',
                details: { branch_id: id, name: updated.name }
            });

        return res.status(200).json({
            success: true,
            message: 'Branch activated',
            data: updated
        });

    } catch (error) {
        console.error('Activate branch error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to activate branch: ' + error.message
        });
    }
};

// ============================================================
// DELETE BRANCH (permanent, Boss only)
// Body: { force: boolean }
// ============================================================
const deleteBranch = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({
                success: false,
                error: 'Only the Boss can delete branches'
            });
        }

        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid branch ID'
            });
        }

        const businessId = req.scope?.business_id;
        if (!businessId) {
            return res.status(400).json({
                success: false,
                error: 'No active business selected'
            });
        }

        const force = req.body?.force === true;

        const { data: branch } = await supabase
            .from('branches')
            .select('id, name, business_id, is_active')
            .eq('id', id)
            .single();

        if (!branch || branch.business_id !== businessId) {
            return res.status(404).json({
                success: false,
                error: 'Branch not found in the active business'
            });
        }

        const { count: activeCount } = await supabase
            .from('branches')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .eq('is_active', true);

        if (branch.is_active && (activeCount || 0) <= 1) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete the last active branch. Deactivate the business instead.'
            });
        }

        const checks = await Promise.all([
            supabase.from('products').select('id', { count: 'exact', head: true }).eq('branch_id', id),
            supabase.from('customers').select('id', { count: 'exact', head: true }).eq('branch_id', id),
            supabase.from('orders').select('id', { count: 'exact', head: true }).eq('branch_id', id),
            supabase.from('payments').select('id', { count: 'exact', head: true }).eq('branch_id', id),
            supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('branch_id', id),
            supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('branch_id', id),
            supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('branch_id', id),
            supabase.from('stock_movements').select('id', { count: 'exact', head: true }).eq('branch_id', id),
            supabase.from('categories').select('id', { count: 'exact', head: true }).eq('branch_id', id),
            supabase.from('users').select('id', { count: 'exact', head: true }).eq('branch_id', id).eq('is_deleted', false)
        ]);

        const counts = {
            products: checks[0].count || 0,
            customers: checks[1].count || 0,
            orders: checks[2].count || 0,
            payments: checks[3].count || 0,
            expenses: checks[4].count || 0,
            suppliers: checks[5].count || 0,
            purchase_orders: checks[6].count || 0,
            stock_movements: checks[7].count || 0,
            categories: checks[8].count || 0,
            users: checks[9].count || 0
        };

        const hasData = Object.values(counts).some(n => n > 0);

        if (hasData && !force) {
            return res.status(400).json({
                success: false,
                error: 'Branch has data. Use force delete to wipe it, or deactivate it instead.',
                details: counts,
                requires_force: true
            });
        }

        await supabase
            .from('users')
            .update({ branch_id: null })
            .eq('branch_id', id);

        const { error } = await supabase
            .from('branches')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: null,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: force ? 'Branch Force Deleted' : 'Branch Deleted',
                details: { branch_id: id, name: branch.name, force, counts }
            });

        return res.status(200).json({
            success: true,
            message: force
                ? 'Branch and all its data permanently deleted.'
                : 'Branch permanently deleted.',
            counts
        });

    } catch (error) {
        console.error('Delete branch error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete branch: ' + error.message
        });
    }
};

// ============================================================
// DEACTIVATE BUSINESS (Boss only)
// Hides the business and all its branches. Data preserved.
// ============================================================
const deactivateBusiness = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({
                success: false,
                error: 'Only the Boss can deactivate businesses'
            });
        }

        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid business ID'
            });
        }

        const { data: business } = await supabase
            .from('businesses')
            .select('id, name, owner_id, is_active')
            .eq('id', id)
            .single();

        if (!business || business.owner_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                error: 'Business not found or access denied'
            });
        }

        if (!business.is_active) {
            return res.status(400).json({
                success: false,
                error: 'Business is already inactive'
            });
        }

        // Boss must keep at least one active business
        const { count: activeCount } = await supabase
            .from('businesses')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', req.user.id)
            .eq('is_active', true);

        if ((activeCount || 0) <= 1) {
            return res.status(400).json({
                success: false,
                error: 'Cannot deactivate the last active business. Create another one first.'
            });
        }

        const { error: bizErr } = await supabase
            .from('businesses')
            .update({ is_active: false, updated_at: new Date() })
            .eq('id', id);

        if (bizErr) throw bizErr;

        await supabase
            .from('branches')
            .update({ is_active: false, updated_at: new Date() })
            .eq('business_id', id);

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: null,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Business Deactivated',
                details: { business_id: id, name: business.name }
            });

        return res.status(200).json({
            success: true,
            message: 'Business deactivated. Its data is preserved.'
        });

    } catch (error) {
        console.error('Deactivate business error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to deactivate business: ' + error.message
        });
    }
};

// ============================================================
// ACTIVATE BUSINESS (Boss only)
// Brings the business back. Branches remain individually inactive
// until the Boss activates them one by one.
// ============================================================
const activateBusiness = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({
                success: false,
                error: 'Only the Boss can activate businesses'
            });
        }

        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid business ID'
            });
        }

        const { data: business } = await supabase
            .from('businesses')
            .select('id, name, owner_id, is_active')
            .eq('id', id)
            .single();

        if (!business || business.owner_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                error: 'Business not found or access denied'
            });
        }

        if (business.is_active) {
            return res.status(400).json({
                success: false,
                error: 'Business is already active'
            });
        }

        const { error } = await supabase
            .from('businesses')
            .update({ is_active: true, updated_at: new Date() })
            .eq('id', id);

        if (error) throw error;

        // Auto-reactivate all its branches so the business is usable
        await supabase
            .from('branches')
            .update({ is_active: true, updated_at: new Date() })
            .eq('business_id', id);

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: null,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Business Activated',
                details: { business_id: id, name: business.name }
            });

        return res.status(200).json({
            success: true,
            message: 'Business activated. Its branches are active again.'
        });

    } catch (error) {
        console.error('Activate business error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to activate business: ' + error.message
        });
    }
};

// ============================================================
// DELETE BUSINESS (permanent, Boss only)
// Body: { force: boolean }
//   force = false (default): refuses if the business has ANY data
//   force = true:             deletes everything via cascade
// ============================================================
const deleteBusiness = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({
                success: false,
                error: 'Only the Boss can delete businesses'
            });
        }

        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid business ID'
            });
        }

        const force = req.body?.force === true;

        const { data: business } = await supabase
            .from('businesses')
            .select('id, name, owner_id')
            .eq('id', id)
            .single();

        if (!business || business.owner_id !== req.user.id) {
            return res.status(404).json({
                success: false,
                error: 'Business not found or access denied'
            });
        }

        const { count: totalCount } = await supabase
            .from('businesses')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', req.user.id);

        if ((totalCount || 0) <= 1) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your last business.'
            });
        }

        const { data: branchRows } = await supabase
            .from('branches')
            .select('id')
            .eq('business_id', id);

        const branchIds = (branchRows || []).map(b => b.id);

        // Count everything under this business
        let counts = {
            branches: branchIds.length,
            products: 0,
            customers: 0,
            orders: 0,
            payments: 0,
            expenses: 0,
            suppliers: 0,
            purchase_orders: 0,
            stock_movements: 0,
            categories: 0,
            users: 0
        };

        if (branchIds.length > 0) {
            const checks = await Promise.all([
                supabase.from('products').select('id', { count: 'exact', head: true }).in('branch_id', branchIds),
                supabase.from('customers').select('id', { count: 'exact', head: true }).in('branch_id', branchIds),
                supabase.from('orders').select('id', { count: 'exact', head: true }).in('branch_id', branchIds),
                supabase.from('payments').select('id', { count: 'exact', head: true }).in('branch_id', branchIds),
                supabase.from('expenses').select('id', { count: 'exact', head: true }).in('branch_id', branchIds),
                supabase.from('suppliers').select('id', { count: 'exact', head: true }).in('branch_id', branchIds),
                supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).in('branch_id', branchIds),
                supabase.from('stock_movements').select('id', { count: 'exact', head: true }).in('branch_id', branchIds),
                supabase.from('categories').select('id', { count: 'exact', head: true }).in('branch_id', branchIds),
                supabase.from('users').select('id', { count: 'exact', head: true }).in('branch_id', branchIds).eq('is_deleted', false)
            ]);

            counts.products = checks[0].count || 0;
            counts.customers = checks[1].count || 0;
            counts.orders = checks[2].count || 0;
            counts.payments = checks[3].count || 0;
            counts.expenses = checks[4].count || 0;
            counts.suppliers = checks[5].count || 0;
            counts.purchase_orders = checks[6].count || 0;
            counts.stock_movements = checks[7].count || 0;
            counts.categories = checks[8].count || 0;
            counts.users = checks[9].count || 0;
        }

        const hasData = Object.entries(counts)
            .filter(([k]) => k !== 'branches')
            .some(([, n]) => n > 0);

        if (hasData && !force) {
            return res.status(400).json({
                success: false,
                error: 'Business has data. Use force delete to wipe it, or deactivate it instead.',
                details: counts,
                requires_force: true
            });
        }

        // Detach users first (both active and soft-deleted) so FK doesn't block
        if (branchIds.length > 0) {
            await supabase
                .from('users')
                .update({ branch_id: null, business_id: null })
                .in('branch_id', branchIds);
        }

        // Delete business — cascades to branches, and branches cascade
        // to their products/orders/customers/etc. via ON DELETE CASCADE
        const { error } = await supabase
            .from('businesses')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: null,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: force ? 'Business Force Deleted' : 'Business Deleted',
                details: {
                    business_id: id,
                    name: business.name,
                    force,
                    counts
                }
            });

        return res.status(200).json({
            success: true,
            message: force
                ? 'Business and all its data permanently deleted.'
                : 'Business permanently deleted.',
            counts
        });

    } catch (error) {
        console.error('Delete business error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete business: ' + error.message
        });
    }
};

module.exports = {
    getCurrent,
    listBusinesses,
    updateCurrent,
    createBusiness,
    listBranches,
    createBranch,
    updateBranch,
    deactivateBranch,
    activateBranch,
    deleteBranch,
    deactivateBusiness,
    activateBusiness,
    deleteBusiness
};