// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Expenses Controller
// Branch-scoped
// ============================================================

const supabase = require('../config/supabase');
const { requireBranchId } = require('../utils/branchScope');
const {
    isValidAmount,
    isValidLength,
    isSafeText,
    sanitize
} = require('../utils/validators');

const getAllExpenses = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        let { page = 1, limit = 50, search, category, startDate, endDate } = req.query;

        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, error: 'Page must be a positive number' });
        }

        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
            return res.status(400).json({ success: false, error: 'Limit must be between 1 and 200' });
        }

        let dataQuery = supabase
            .from('expenses')
            .select('*')
            .eq('branch_id', branchId);

        if (search && search.trim()) {
            const term = search.trim().replace(/[%_,()'"]/g, '');
            if (term) dataQuery = dataQuery.ilike('description', `%${term}%`);
        }
        if (category) dataQuery = dataQuery.eq('category', category);
        if (startDate) dataQuery = dataQuery.gte('expense_date', startDate);
        if (endDate) dataQuery = dataQuery.lte('expense_date', endDate);

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery.order('expense_date', { ascending: false }).range(from, to);

        const { data, error } = await dataQuery;
        if (error) throw error;

        let countQuery = supabase
            .from('expenses')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', branchId);

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
        return res.status(500).json({ success: false, error: 'Failed to fetch expenses' });
    }
};

const getExpenseById = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;

        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Expense not found' });
            }
            throw error;
        }

        return res.status(200).json({ success: true, data });

    } catch (error) {
        console.error('Get expense error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch expense' });
    }
};

const createExpense = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { description, amount, category, expense_date, payment_method, notes } = req.body;

        if (!description || !amount) {
            return res.status(400).json({ success: false, error: 'Description and amount are required' });
        }

        if (!isValidLength(description, 3, 500) || !isSafeText(description)) {
            return res.status(400).json({ success: false, error: 'Description must be 3-500 characters and contain no HTML or scripts' });
        }

        if (!isValidAmount(amount)) {
            return res.status(400).json({ success: false, error: 'Invalid amount' });
        }

        let cleanNotes = '';
        if (notes) {
            if (!isValidLength(notes, 0, 500) || !isSafeText(notes)) {
                return res.status(400).json({ success: false, error: 'Notes must be under 500 characters and contain no HTML or scripts' });
            }
            cleanNotes = sanitize(notes);
        }

        const { data, error } = await supabase
            .from('expenses')
            .insert({
                branch_id: branchId,
                description: sanitize(description.trim()),
                amount: parseFloat(amount),
                category: category || 'Other',
                expense_date: expense_date || new Date().toISOString().split('T')[0],
                payment_method: payment_method || '',
                notes: cleanNotes,
                created_by: req.user.id,
                created_by_name: req.user.full_name
            })
            .select()
            .single();

        if (error) {
            console.error('Create expense error:', error);
            return res.status(500).json({ success: false, error: 'Failed to create expense: ' + error.message });
        }

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: branchId,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Expense Created',
                details: { expense_id: data.id, description, amount }
            });

        return res.status(201).json({
            success: true,
            message: 'Expense created successfully',
            data
        });

    } catch (error) {
        console.error('Create expense error:', error);
        return res.status(500).json({ success: false, error: 'Failed to create expense: ' + error.message });
    }
};

const updateExpense = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;
        const { description, amount, category, expense_date, payment_method, notes } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid expense ID' });
        }

        const { data: existing } = await supabase
            .from('expenses')
            .select('id')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (!existing) {
            return res.status(404).json({ success: false, error: 'Expense not found' });
        }

        const updateData = {};

        if (description !== undefined) {
            if (!description || !isValidLength(description, 3, 500) || !isSafeText(description)) {
                return res.status(400).json({ success: false, error: 'Description must be 3-500 characters and contain no HTML or scripts' });
            }
            updateData.description = sanitize(description);
        }

        if (amount !== undefined) {
            if (!isValidAmount(amount)) {
                return res.status(400).json({ success: false, error: 'Invalid amount' });
            }
            updateData.amount = parseFloat(amount);
        }

        if (category !== undefined) {
            if (category && (!isValidLength(category, 1, 100) || !isSafeText(category))) {
                return res.status(400).json({ success: false, error: 'Category must be 1-100 characters and contain no HTML or scripts' });
            }
            updateData.category = category ? sanitize(category) : 'Other';
        }

        if (notes !== undefined) {
            if (notes && (!isValidLength(notes, 0, 500) || !isSafeText(notes))) {
                return res.status(400).json({ success: false, error: 'Notes must be under 500 characters and contain no HTML or scripts' });
            }
            updateData.notes = notes ? sanitize(notes) : '';
        }

        if (expense_date !== undefined) {
            const d = new Date(expense_date);
            if (isNaN(d.getTime())) {
                return res.status(400).json({ success: false, error: 'Invalid expense date' });
            }
            updateData.expense_date = expense_date;
        }

        if (payment_method !== undefined) {
            if (payment_method && (!isValidLength(payment_method, 0, 50) || !isSafeText(payment_method))) {
                return res.status(400).json({ success: false, error: 'Payment method must be under 50 characters and contain no HTML or scripts' });
            }
            updateData.payment_method = payment_method ? sanitize(payment_method) : '';
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, error: 'Nothing to update' });
        }

        updateData.updated_at = new Date();

        const { data, error } = await supabase
            .from('expenses')
            .update(updateData)
            .eq('id', id)
            .eq('branch_id', branchId)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({
            success: true,
            message: 'Expense updated successfully',
            data
        });

    } catch (error) {
        console.error('Update expense error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update expense: ' + error.message });
    }
};

const deleteExpense = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;

        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id)
            .eq('branch_id', branchId);

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Expense not found' });
            }
            throw error;
        }

        return res.status(200).json({ success: true, message: 'Expense deleted successfully' });

    } catch (error) {
        console.error('Delete expense error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete expense' });
    }
};

module.exports = {
    getAllExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense
};