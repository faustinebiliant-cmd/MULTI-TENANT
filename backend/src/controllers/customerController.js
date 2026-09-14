// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Customers Controller (UPDATED)
// ============================================================

const supabase = require('../config/supabase');
const { 
    isValidName, 
    isValidPhone, 
    isValidEmail, 
    isValidUUID,
    isValidLength,
    isSafeText,
    sanitize 
} = require('../utils/validators');

// ============================================================
// GET ALL CUSTOMERS  (paginated + server-side search)
// ============================================================
//
// Query params:
//   page=1                    (default 1)
//   limit=50                  (default 50, max 200)
//   search=<text>             matches name OR phone OR email
//   all=true                  legacy mode — returns everything
//
// Response:
//   { success, data: [...], pagination: { total, page, limit, pages } }
//   When all=true is passed, pagination is null.

const getAllCustomers = async (req, res) => {
    try {
        let { page = 1, limit = 50, all, search } = req.query;

        // ─── Legacy mode: ?all=true ───────────────────────────
        if (all === 'true') {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name');

            if (error) throw error;

            return res.status(200).json({
                success: true,
                data,
                pagination: null
            });
        }

        // ─── Validate params ──────────────────────────────────
        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, error: 'Page must be a positive number' });
        }

        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
            return res.status(400).json({ success: false, error: 'Limit must be between 1 and 200' });
        }

        // ─── Build data query ─────────────────────────────────
        let dataQuery = supabase.from('customers').select('*');

        if (search && search.trim()) {
            const term = search.trim().replace(/[%_,()'"]/g, '');
            if (term) {
                dataQuery = dataQuery.or(
                    `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`
                );
            }
        }

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery
            .order('name')
            .range(from, to);

        const { data, error } = await dataQuery;
        if (error) throw error;

        // ─── Count query (same filters) ───────────────────────
        let countQuery = supabase
            .from('customers')
            .select('id', { count: 'exact', head: true });

        if (search && search.trim()) {
            const term = search.trim().replace(/[%_,()'"]/g, '');
            if (term) {
                countQuery = countQuery.or(
                    `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`
                );
            }
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
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch customers'
        });
    }
};

// ============================================================
// GET CUSTOMER BY ID
// ============================================================

const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid customer ID'
            });
        }

        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Customer not found'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Get customer error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch customer'
        });
    }
};

// ============================================================
// CREATE CUSTOMER - WITH IMPROVED VALIDATION
// ============================================================

const createCustomer = async (req, res) => {
    try {
        const { name, phone, email, address, notes } = req.body;

        // ✅ VALIDATE NAME
        if (!isValidName(name)) {
            return res.status(400).json({
                success: false,
                error: 'Customer name must be at least 2 characters'
            });
        }

        // ✅ VALIDATE PHONE
        if (!isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format'
            });
        }

        // ✅ VALIDATE EMAIL (if provided)
        if (email && !isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // ✅ IMPROVED: VALIDATE ADDRESS
        let cleanAddress = '';
        if (address) {
            if (!isValidLength(address, 0, 500)) {
                return res.status(400).json({
                    success: false,
                    error: 'Address must be less than 500 characters'
                });
            }
            if (!isSafeText(address)) {
                return res.status(400).json({
                    success: false,
                    error: 'Address contains invalid content'
                });
            }
            cleanAddress = sanitize(address);
        }

        // ✅ IMPROVED: VALIDATE NOTES
        let cleanNotes = '';
        if (notes) {
            if (!isValidLength(notes, 0, 500)) {
                return res.status(400).json({
                    success: false,
                    error: 'Notes must be less than 500 characters'
                });
            }
            if (!isSafeText(notes)) {
                return res.status(400).json({
                    success: false,
                    error: 'Notes contain invalid content'
                });
            }
            cleanNotes = sanitize(notes);
        }

        // ✅ SANITIZE INPUTS
        const cleanName = sanitize(name.trim());
        const cleanPhone = sanitize(phone.trim());
        const cleanEmail = email ? sanitize(email.trim()) : '';

        const { data, error } = await supabase
            .from('customers')
            .insert({
                name: cleanName,
                phone: cleanPhone,
                email: cleanEmail,
                address: cleanAddress,
                notes: cleanNotes
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    error: 'Customer with this phone already exists'
                });
            }
            throw error;
        }

        await supabase
            .from('activity_logs')
            .insert({
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
        return res.status(500).json({
            success: false,
            error: 'Failed to create customer'
        });
    }
};

// ============================================================
// UPDATE CUSTOMER - WITH IMPROVED VALIDATION
// ============================================================

const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid customer ID'
            });
        }

        // ✅ VALIDATE & SANITIZE NAME
        if (updates.name) {
            if (!isValidName(updates.name)) {
                return res.status(400).json({
                    success: false,
                    error: 'Customer name must be at least 2 characters'
                });
            }
            updates.name = sanitize(updates.name);
        }

        // ✅ VALIDATE & SANITIZE PHONE
        if (updates.phone) {
            if (!isValidPhone(updates.phone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid phone number format'
                });
            }
            updates.phone = sanitize(updates.phone);
        }

        // ✅ VALIDATE EMAIL
        if (updates.email) {
            if (!isValidEmail(updates.email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }
            updates.email = sanitize(updates.email);
        }

        // ✅ IMPROVED: VALIDATE ADDRESS
        if (updates.address) {
            if (!isValidLength(updates.address, 0, 500)) {
                return res.status(400).json({
                    success: false,
                    error: 'Address must be less than 500 characters'
                });
            }
            if (!isSafeText(updates.address)) {
                return res.status(400).json({
                    success: false,
                    error: 'Address contains invalid content'
                });
            }
            updates.address = sanitize(updates.address);
        }

        // ✅ IMPROVED: VALIDATE NOTES
        if (updates.notes) {
            if (!isValidLength(updates.notes, 0, 500)) {
                return res.status(400).json({
                    success: false,
                    error: 'Notes must be less than 500 characters'
                });
            }
            if (!isSafeText(updates.notes)) {
                return res.status(400).json({
                    success: false,
                    error: 'Notes contain invalid content'
                });
            }
            updates.notes = sanitize(updates.notes);
        }

        const { data, error } = await supabase
            .from('customers')
            .update({
                ...updates,
                updated_at: new Date()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Customer not found'
                });
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
        return res.status(500).json({
            success: false,
            error: 'Failed to update customer'
        });
    }
};

// ============================================================
// DELETE CUSTOMER
// ============================================================

const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid customer ID'
            });
        }

        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Customer not found'
                });
            }
            if (error.code === '23503') {
                return res.status(400).json({
                    success: false,
                    error: 'Customer has orders and cannot be deleted'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: 'Customer deleted successfully'
        });

    } catch (error) {
        console.error('Delete customer error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete customer'
        });
    }
};

module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
};