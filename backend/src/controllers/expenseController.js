// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Expenses Controller (UPDATED)
// ============================================================

const supabase = require('../config/supabase');
const {
    isValidAmount,
    isValidLength,
    isSafeText,
    sanitize
} = require('../utils/validators');

// ============================================================
// GET ALL EXPENSES  (paginated + server-side filters)
// ============================================================
//
// Query params:
//   page=1                    (default 1)
//   limit=50                  (default 50, max 200)
//   search=<text>             matches description (ILIKE)
//   category=<name>           exact category match
//   startDate=YYYY-MM-DD
//   endDate=YYYY-MM-DD
//   all=true                  legacy mode — returns everything
//
// Response:
//   { success, data: [...], pagination: { total, page, limit, pages } }
//   When all=true is passed, pagination is null.

const getAllExpenses = async (req, res) => {
    try {
        let { page = 1, limit = 50, all, search, category, startDate, endDate } = req.query;

        // ─── Legacy mode: ?all=true ───────────────────────────
        if (all === 'true') {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('expense_date', { ascending: false });

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
        let dataQuery = supabase.from('expenses').select('*');

        if (search && search.trim()) {
            const term = search.trim().replace(/[%_,()'"]/g, '');
            if (term) dataQuery = dataQuery.ilike('description', `%${term}%`);
        }
        if (category) {
            dataQuery = dataQuery.eq('category', category);
        }
        if (startDate) {
            dataQuery = dataQuery.gte('expense_date', startDate);
        }
        if (endDate) {
            dataQuery = dataQuery.lte('expense_date', endDate);
        }

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery
            .order('expense_date', { ascending: false })
            .range(from, to);

        const { data, error } = await dataQuery;
        if (error) throw error;

        // ─── Count query (same filters) ───────────────────────
        let countQuery = supabase
            .from('expenses')
            .select('id', { count: 'exact', head: true });

        if (search && search.trim()) {
            const term = search.trim().replace(/[%_,()'"]/g, '');
            if (term) countQuery = countQuery.ilike('description', `%${term}%`);
        }
        if (category) countQuery = countQuery.eq('category', category);
        if (startDate) countQuery = countQuery.gte('expense_date', startDate);
        if (endDate) countQuery = countQuery.lte('expense_date', endDate);

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
        console.error('Get expenses error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch expenses'
        });
    }
};

// ============================================================
// GET EXPENSE BY ID
// ============================================================

const getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Expense not found'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Get expense error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch expense'
        });
    }
};

// ============================================================
// CREATE EXPENSE - WITH IMPROVED VALIDATION
// ============================================================

const createExpense = async (req, res) => {
    try {
        const { description, amount, category, expense_date, payment_method, notes } = req.body;

        if (!description || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Description and amount are required'
            });
        }

        // ✅ IMPROVED: VALIDATE DESCRIPTION
        if (!isValidLength(description, 3, 500)) {
            return res.status(400).json({
                success: false,
                error: 'Description must be between 3 and 500 characters'
            });
        }

        if (!isSafeText(description)) {
            return res.status(400).json({
                success: false,
                error: 'Description contains invalid content'
            });
        }

        // ✅ VALIDATE AMOUNT
        if (!isValidAmount(amount)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount'
            });
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

        // ✅ SANITIZE DESCRIPTION
        const cleanDescription = sanitize(description.trim());

        // ✅ Get a valid user ID from the database
        let validUserId = null;
        let validUserName = 'System';

        if (req.user && req.user.id) {
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, full_name')
                .eq('id', req.user.id)
                .single();

            if (userError || !user) {
                console.log('⚠️ User not found, using boss as fallback');
                const { data: boss } = await supabase
                    .from('users')
                    .select('id, full_name')
                    .eq('email', 'faustinebiliant@gmail.com')
                    .single();
                
                if (boss) {
                    validUserId = boss.id;
                    validUserName = boss.full_name;
                }
            } else {
                validUserId = user.id;
                validUserName = user.full_name;
            }
        }

        console.log('👤 Creating expense by:', validUserName);

        const { data, error } = await supabase
            .from('expenses')
            .insert({
                description: cleanDescription,
                amount: parseFloat(amount),
                category: category || 'Other',
                expense_date: expense_date || new Date().toISOString().split('T')[0],
                payment_method: payment_method || '',
                notes: cleanNotes,
                created_by: validUserId,
                created_by_name: validUserName
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Create expense error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create expense: ' + error.message
            });
        }

        // Log activity
        await supabase
            .from('activity_logs')
            .insert({
                user_id: validUserId,
                user_name: validUserName,
                action: 'Expense Created',
                details: { expense_id: data.id, description, amount }
            });

        return res.status(201).json({
            success: true,
            message: 'Expense created successfully',
            data
        });

    } catch (error) {
        console.error('❌ Create expense error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create expense: ' + error.message
        });
    }
};

// ============================================================
// UPDATE EXPENSE - WITH IMPROVED VALIDATION
// ============================================================

const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { description, amount, category, expense_date, payment_method, notes } = req.body;

        // Check if expense exists
        const { data: existing, error: checkError } = await supabase
            .from('expenses')
            .select('id')
            .eq('id', id)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({
                success: false,
                error: 'Expense not found'
            });
        }

        const updateData = {};

        // ✅ IMPROVED: VALIDATE DESCRIPTION
        if (description !== undefined) {
            if (description && !isValidLength(description, 3, 500)) {
                return res.status(400).json({
                    success: false,
                    error: 'Description must be between 3 and 500 characters'
                });
            }
            if (description && !isSafeText(description)) {
                return res.status(400).json({
                    success: false,
                    error: 'Description contains invalid content'
                });
            }
            updateData.description = description ? sanitize(description) : '';
        }

        // ✅ VALIDATE AMOUNT
        if (amount !== undefined) {
            if (!isValidAmount(amount)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid amount'
                });
            }
            updateData.amount = parseFloat(amount);
        }

        // ✅ VALIDATE CATEGORY
        if (category !== undefined) {
            updateData.category = category || 'Other';
        }

        // ✅ IMPROVED: VALIDATE NOTES
        if (notes !== undefined) {
            if (notes && !isValidLength(notes, 0, 500)) {
                return res.status(400).json({
                    success: false,
                    error: 'Notes must be less than 500 characters'
                });
            }
            if (notes && !isSafeText(notes)) {
                return res.status(400).json({
                    success: false,
                    error: 'Notes contain invalid content'
                });
            }
            updateData.notes = notes ? sanitize(notes) : '';
        }

        // Other fields
        if (expense_date !== undefined) updateData.expense_date = expense_date;
        if (payment_method !== undefined) updateData.payment_method = payment_method;

        const { data, error } = await supabase
            .from('expenses')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ Update expense error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update expense: ' + error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Expense updated successfully',
            data
        });

    } catch (error) {
        console.error('❌ Update expense error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update expense: ' + error.message
        });
    }
};

// ============================================================
// DELETE EXPENSE
// ============================================================

const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Expense not found'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: 'Expense deleted successfully'
        });

    } catch (error) {
        console.error('Delete expense error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete expense'
        });
    }
};

module.exports = {
    getAllExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense
};