// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Customers Controller
// Branch-scoped
// ============================================================

const supabase = require('../config/supabase');
const { requireBranchId } = require('../utils/branchScope');
const {
    isValidName,
    isValidPhone,
    isValidEmail,
    isValidUUID,
    isValidLength,
    isSafeText,
    sanitize
} = require('../utils/validators');

const getAllCustomers = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        let { page = 1, limit = 50, search } = req.query;

        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, error: 'Page must be a positive number' });
        }

        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
            return res.status(400).json({ success: false, error: 'Limit must be between 1 and 200' });
        }

        const cleanSearch = search && search.trim()
            ? search.trim().replace(/[%_,()'"]/g, '')
            : null;

        let dataQuery = supabase
            .from('customers')
            .select('*')
            .eq('branch_id', branchId);

        if (cleanSearch) {
            dataQuery = dataQuery.or(
                `name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`
            );
        }

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery.order('name').range(from, to);

        const { data, error } = await dataQuery;
        if (error) throw error;

        let countQuery = supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', branchId);

        if (cleanSearch) {
            countQuery = countQuery.or(
                `name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`
            );
        }

        const { count: totalCount, error: countError } = await countQuery;
        if (countError) throw countError;

        const total = totalCount || 0;
        const pages = Math.ceil(total / limitNum);

        return res.status(200).json({
            success: true,
            data,
            pagination: { total, page: pageNum, limit: limitNum, pages }
        });

    } catch (error) {
        console.error('Get customers error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch customers' });
    }
};

const getCustomerById = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid customer ID' });
        }

        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Customer not found' });
            }
            throw error;
        }

        return res.status(200).json({ success: true, data });

    } catch (error) {
        console.error('Get customer error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch customer' });
    }
};

const createCustomer = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { name, phone, email, address, notes } = req.body;

        if (!isValidName(name) || !isSafeText(name)) {
            return res.status(400).json({ success: false, error: 'Customer name must be 2-20 characters and contain no HTML or scripts' });
        }

        if (!isValidPhone(phone) || !isSafeText(phone)) {
            return res.status(400).json({ success: false, error: 'Invalid phone number format' });
        }

        if (email && (!isValidEmail(email) || !isSafeText(email))) {
            return res.status(400).json({ success: false, error: 'Invalid email format' });
        }

        let cleanAddress = '';
        if (address) {
            if (!isValidLength(address, 0, 500) || !isSafeText(address)) {
                return res.status(400).json({ success: false, error: 'Address must be under 500 characters and contain no HTML or scripts' });
            }
            cleanAddress = sanitize(address);
        }

        let cleanNotes = '';
        if (notes) {
            if (!isValidLength(notes, 0, 500) || !isSafeText(notes)) {
                return res.status(400).json({ success: false, error: 'Notes must be under 500 characters and contain no HTML or scripts' });
            }
            cleanNotes = sanitize(notes);
        }

        const { data, error } = await supabase
            .from('customers')
            .insert({
                branch_id: branchId,
                name: sanitize(name.trim()),
                phone: sanitize(phone.trim()),
                email: email ? sanitize(email.toLowerCase().trim()) : '',
                address: cleanAddress,
                notes: cleanNotes
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ success: false, error: 'Customer with this phone already exists in this branch' });
            }
            throw error;
        }

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: branchId,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Customer Created',
                details: { customer_id: data.id, name: data.name }
            });

        return res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            data
        });

    } catch (error) {
        console.error('Create customer error:', error);
        return res.status(500).json({ success: false, error: 'Failed to create customer' });
    }
};

const updateCustomer = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;
        const updates = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid customer ID' });
        }

        if (updates.name) {
            if (!isValidName(updates.name) || !isSafeText(updates.name)) {
                return res.status(400).json({ success: false, error: 'Customer name must be 2-20 characters and contain no HTML or scripts' });
            }
            updates.name = sanitize(updates.name);
        }

        if (updates.phone) {
            if (!isValidPhone(updates.phone) || !isSafeText(updates.phone)) {
                return res.status(400).json({ success: false, error: 'Invalid phone number format' });
            }
            updates.phone = sanitize(updates.phone);
        }

        if (updates.email) {
            if (!isValidEmail(updates.email) || !isSafeText(updates.email)) {
                return res.status(400).json({ success: false, error: 'Invalid email format' });
            }
            updates.email = sanitize(updates.email.toLowerCase());
        }

        if (updates.address) {
            if (!isValidLength(updates.address, 0, 500) || !isSafeText(updates.address)) {
                return res.status(400).json({ success: false, error: 'Address must be under 500 characters and contain no HTML or scripts' });
            }
            updates.address = sanitize(updates.address);
        }

        if (updates.notes) {
            if (!isValidLength(updates.notes, 0, 500) || !isSafeText(updates.notes)) {
                return res.status(400).json({ success: false, error: 'Notes must be under 500 characters and contain no HTML or scripts' });
            }
            updates.notes = sanitize(updates.notes);
        }

        const { data, error } = await supabase
            .from('customers')
            .update({ ...updates, updated_at: new Date() })
            .eq('id', id)
            .eq('branch_id', branchId)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Customer not found' });
            }
            if (error.code === '23505') {
                return res.status(400).json({ success: false, error: 'Another customer with this phone exists in this branch' });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: 'Customer updated successfully',
            data
        });

    } catch (error) {
        console.error('Update customer error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update customer' });
    }
};

const deleteCustomer = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid customer ID' });
        }

        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id)
            .eq('branch_id', branchId);

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Customer not found' });
            }
            if (error.code === '23503') {
                return res.status(400).json({ success: false, error: 'Customer has orders and cannot be deleted' });
            }
            throw error;
        }

        return res.status(200).json({ success: true, message: 'Customer deleted successfully' });

    } catch (error) {
        console.error('Delete customer error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete customer' });
    }
};

module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
};