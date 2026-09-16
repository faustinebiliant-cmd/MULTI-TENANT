// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Suppliers Controller
// Branch-scoped
// ============================================================

const supabase = require('../config/supabase');
const { requireBranchId } = require('../utils/branchScope');
const {
    isValidName,
    isValidPhone,
    isValidEmail,
    isValidLength,
    isSafeText,
    sanitize
} = require('../utils/validators');

const getAllSuppliers = async (req, res) => {
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
            .from('suppliers')
            .select('*')
            .eq('branch_id', branchId);

        if (cleanSearch) {
            dataQuery = dataQuery.or(
                `name.ilike.%${cleanSearch}%,contact_person.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`
            );
        }

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery.order('name').range(from, to);

        const { data, error } = await dataQuery;
        if (error) throw error;

        let countQuery = supabase
            .from('suppliers')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', branchId);

        if (cleanSearch) {
            countQuery = countQuery.or(
                `name.ilike.%${cleanSearch}%,contact_person.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`
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
        console.error('Get suppliers error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch suppliers'
        });
    }
};

const getSupplierById = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;

        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Supplier not found' });
            }
            throw error;
        }

        return res.status(200).json({ success: true, data });

    } catch (error) {
        console.error('Get supplier error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch supplier' });
    }
};

const createSupplier = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { name, contact_person, phone, email, address, notes } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ success: false, error: 'Name and phone are required' });
        }

        if (!isValidName(name) || !isSafeText(name)) {
            return res.status(400).json({ success: false, error: 'Supplier name must be 2-20 characters and contain no HTML or scripts' });
        }

        let cleanContactPerson = '';
        if (contact_person) {
            if (!isValidName(contact_person) || !isSafeText(contact_person)) {
                return res.status(400).json({ success: false, error: 'Contact person must be 2-20 characters and contain no HTML or scripts' });
            }
            cleanContactPerson = sanitize(contact_person.trim());
        }

        if (!isValidPhone(phone) || !isSafeText(phone)) {
            return res.status(400).json({ success: false, error: 'Invalid phone number format' });
        }

        if (email && (!isValidEmail(email) || !isSafeText(email))) {
            return res.status(400).json({ success: false, error: 'Invalid email format' });
        }

        let cleanAddress = '';
        if (address) {
            if (!isValidLength(address, 0, 200) || !isSafeText(address)) {
                return res.status(400).json({ success: false, error: 'Address must be less than 200 characters and contain no HTML or scripts' });
            }
            cleanAddress = sanitize(address);
        }

        let cleanNotes = '';
        if (notes) {
            if (!isValidLength(notes, 0, 500) || !isSafeText(notes)) {
                return res.status(400).json({ success: false, error: 'Notes must be less than 500 characters and contain no HTML or scripts' });
            }
            cleanNotes = sanitize(notes);
        }

        const { data, error } = await supabase
            .from('suppliers')
            .insert({
                branch_id: branchId,
                name: sanitize(name.trim()),
                contact_person: cleanContactPerson,
                phone: sanitize(phone.trim()),
                email: email ? sanitize(email.toLowerCase().trim()) : '',
                address: cleanAddress,
                notes: cleanNotes
            })
            .select()
            .single();

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: branchId,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Supplier Created',
                details: { supplier_id: data.id, name: data.name }
            });

        return res.status(201).json({
            success: true,
            message: 'Supplier created successfully',
            data
        });

    } catch (error) {
        console.error('Create supplier error:', error);
        return res.status(500).json({ success: false, error: 'Failed to create supplier' });
    }
};

const updateSupplier = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;
        const { name, contact_person, phone, email, address, notes } = req.body;

        const { data: existing, error: checkError } = await supabase
            .from('suppliers')
            .select('id')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }

        const updateData = {};

        if (name !== undefined) {
            if (!isValidName(name) || !isSafeText(name)) {
                return res.status(400).json({ success: false, error: 'Supplier name must be 2-20 characters and contain no HTML or scripts' });
            }
            updateData.name = sanitize(name);
        }

        if (contact_person !== undefined) {
            if (contact_person) {
                if (!isValidName(contact_person) || !isSafeText(contact_person)) {
                    return res.status(400).json({ success: false, error: 'Contact person must be 2-20 characters and contain no HTML or scripts' });
                }
                updateData.contact_person = sanitize(contact_person);
            } else {
                updateData.contact_person = '';
            }
        }

        if (phone !== undefined) {
            if (!isValidPhone(phone) || !isSafeText(phone)) {
                return res.status(400).json({ success: false, error: 'Invalid phone number format' });
            }
            updateData.phone = sanitize(phone);
        }

        if (email !== undefined) {
            if (email && (!isValidEmail(email) || !isSafeText(email))) {
                return res.status(400).json({ success: false, error: 'Invalid email format' });
            }
            updateData.email = email ? sanitize(email.toLowerCase()) : '';
        }

        if (address !== undefined) {
            if (address) {
                if (!isValidLength(address, 0, 200) || !isSafeText(address)) {
                    return res.status(400).json({ success: false, error: 'Address must be less than 200 characters and contain no HTML or scripts' });
                }
                updateData.address = sanitize(address);
            } else {
                updateData.address = '';
            }
        }

        if (notes !== undefined) {
            if (notes) {
                if (!isValidLength(notes, 0, 500) || !isSafeText(notes)) {
                    return res.status(400).json({ success: false, error: 'Notes must be less than 500 characters and contain no HTML or scripts' });
                }
                updateData.notes = sanitize(notes);
            } else {
                updateData.notes = '';
            }
        }

        updateData.updated_at = new Date();

        const { data, error } = await supabase
            .from('suppliers')
            .update(updateData)
            .eq('id', id)
            .eq('branch_id', branchId)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: 'Supplier updated successfully',
            data
        });

    } catch (error) {
        console.error('Update supplier error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update supplier: ' + error.message });
    }
};

const deleteSupplier = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;

        const { data: supplier, error: checkError } = await supabase
            .from('suppliers')
            .select('id, name')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (checkError || !supplier) {
            return res.status(404).json({ success: false, error: 'Supplier not found' });
        }

        const { count: activeCount, error: activeErr } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('supplier_id', id)
            .eq('branch_id', branchId)
            .eq('is_active', true);

        if (activeErr) throw activeErr;

        if ((activeCount || 0) > 0) {
            return res.status(400).json({ success: false, error: 'Supplier is in use by products' });
        }

        await supabase
            .from('products')
            .update({ supplier_id: null })
            .eq('supplier_id', id)
            .eq('branch_id', branchId)
            .eq('is_active', false);

        const { error: poDetachError } = await supabase
            .from('purchase_orders')
            .update({ supplier_id: null })
            .eq('supplier_id', id)
            .eq('branch_id', branchId);

        if (poDetachError) {
            return res.status(400).json({ success: false, error: 'Supplier has purchase orders and cannot be deleted' });
        }

        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id)
            .eq('branch_id', branchId);

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Supplier deleted successfully' });

    } catch (error) {
        console.error('Delete supplier error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete supplier' });
    }
};

module.exports = {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
};