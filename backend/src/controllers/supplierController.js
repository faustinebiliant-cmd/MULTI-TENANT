// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Suppliers Controller (UPDATED)
// ============================================================

const supabase = require('../config/supabase');
const { 
    isValidName, 
    isValidPhone, 
    isValidEmail,
    isValidLength,
    isSafeText,
    sanitize 
} = require('../utils/validators');

// ============================================================
// GET ALL SUPPLIERS  (paginated + server-side search)
// ============================================================
//
// Query params:
//   page=1                    (default 1)
//   limit=50                  (default 50, max 200)
//   search=<text>             matches name OR contact_person OR phone OR email
//   all=true                  legacy mode — returns everything
//
// Response:
//   { success, data: [...], pagination: { total, page, limit, pages } }

const getAllSuppliers = async (req, res) => {
    try {
        let { page = 1, limit = 50, all, search } = req.query;

        // ─── Legacy mode ──────────────────────────────────────
        if (all === 'true') {
            const { data, error } = await supabase
                .from('suppliers')
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

        const cleanSearch = search && search.trim()
            ? search.trim().replace(/[%_,()'"]/g, '')
            : null;

        // ─── Build data query ─────────────────────────────────
        let dataQuery = supabase.from('suppliers').select('*');

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

        // ─── Count query (same filters) ───────────────────────
        let countQuery = supabase
            .from('suppliers')
            .select('id', { count: 'exact', head: true });

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

// ============================================================
// GET SUPPLIER BY ID
// ============================================================

const getSupplierById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Supplier not found'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Get supplier error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch supplier'
        });
    }
};

// ============================================================
// CREATE SUPPLIER - WITH IMPROVED VALIDATION
// ============================================================

const createSupplier = async (req, res) => {
    try {
        const { name, contact_person, phone, email, address, notes } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Name and phone are required'
            });
        }

        // ✅ VALIDATE NAME
        if (!isValidName(name)) {
            return res.status(400).json({
                success: false,
                error: 'Supplier name must be at least 2 characters'
            });
        }

        // ✅ VALIDATE CONTACT PERSON (if provided)
        let cleanContactPerson = '';
        if (contact_person) {
            if (!isValidName(contact_person)) {
                return res.status(400).json({
                    success: false,
                    error: 'Contact person name must be at least 2 characters'
                });
            }
            cleanContactPerson = sanitize(contact_person.trim());
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
            .from('suppliers')
            .insert({
                name: cleanName,
                contact_person: cleanContactPerson,
                phone: cleanPhone,
                email: cleanEmail,
                address: cleanAddress,
                notes: cleanNotes
            })
            .select()
            .single();

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
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
        return res.status(500).json({
            success: false,
            error: 'Failed to create supplier'
        });
    }
};

// ============================================================
// UPDATE SUPPLIER - WITH IMPROVED VALIDATION
// ============================================================

const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contact_person, phone, email, address, notes } = req.body;

        const { data: existing, error: checkError } = await supabase
            .from('suppliers')
            .select('id')
            .eq('id', id)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
            });
        }

        const updateData = {};

        // ✅ VALIDATE AND SANITIZE NAME
        if (name !== undefined) {
            if (!isValidName(name)) {
                return res.status(400).json({
                    success: false,
                    error: 'Supplier name must be at least 2 characters'
                });
            }
            updateData.name = sanitize(name);
        }

        // ✅ VALIDATE AND SANITIZE CONTACT PERSON
        if (contact_person !== undefined) {
            if (contact_person && !isValidName(contact_person)) {
                return res.status(400).json({
                    success: false,
                    error: 'Contact person name must be at least 2 characters'
                });
            }
            updateData.contact_person = contact_person ? sanitize(contact_person) : '';
        }

        // ✅ VALIDATE PHONE
        if (phone !== undefined) {
            if (!isValidPhone(phone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid phone number format'
                });
            }
            updateData.phone = sanitize(phone);
        }

        // ✅ VALIDATE EMAIL
        if (email !== undefined) {
            if (email && !isValidEmail(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }
            updateData.email = email ? sanitize(email) : '';
        }

        // ✅ IMPROVED: VALIDATE ADDRESS
        if (address !== undefined) {
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
                updateData.address = sanitize(address);
            } else {
                updateData.address = '';
            }
        }

        // ✅ IMPROVED: VALIDATE NOTES
        if (notes !== undefined) {
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
                updateData.notes = sanitize(notes);
            } else {
                updateData.notes = '';
            }
        }

        const { data, error } = await supabase
            .from('suppliers')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ Update supplier error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update supplier: ' + error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Supplier updated successfully',
            data
        });

    } catch (error) {
        console.error('❌ Update supplier error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update supplier: ' + error.message
        });
    }
};

// ============================================================
// DELETE SUPPLIER
// ============================================================

const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id);

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Supplier not found'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: 'Supplier deleted successfully'
        });

    } catch (error) {
        console.error('Delete supplier error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete supplier'
        });
    }
};

module.exports = {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
};