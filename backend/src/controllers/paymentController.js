// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Payments Controller
// Branch-scoped
// ============================================================

const supabase = require('../config/supabase');
const { requireBranchId } = require('../utils/branchScope');
const {
    isValidUUID,
    isValidAmount,
    isValidPaymentMethod,
    isValidLength,
    isSafeText,
    sanitize
} = require('../utils/validators');

const getAllPayments = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        let { page = 1, limit = 50, search, method, status, startDate, endDate } = req.query;

        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, error: 'Page must be a positive number' });
        }

        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
            return res.status(400).json({ success: false, error: 'Limit must be between 1 and 200' });
        }

        const VALID_METHODS = ['cash', 'mpesa', 'tigo_pesa'];
        if (method && !VALID_METHODS.includes(method)) {
            return res.status(400).json({ success: false, error: 'Invalid method filter' });
        }

        const VALID_STATUSES = ['completed', 'voided'];
        if (status && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status filter' });
        }

        const startISO = startDate ? new Date(startDate).toISOString() : null;
        const endISO = endDate
            ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d.toISOString(); })()
            : null;

        const cleanSearch = search && search.trim()
            ? search.trim().replace(/[%_,()'"]/g, '')
            : null;

        const offset = (pageNum - 1) * limitNum;

        // Case A: search present. Use the RPC to avoid URL-length limits.
        if (cleanSearch) {
            const { data: idRows, error: rpcError } = await supabase.rpc('search_payments', {
                p_branch_id: branchId,
                p_term: cleanSearch,
                p_method: method || null,
                p_status: status || null,
                p_start_date: startISO,
                p_end_date: endISO,
                p_limit: limitNum,
                p_offset: offset
            });

            if (rpcError) throw rpcError;

            const rows = idRows || [];
            if (rows.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: [],
                    pagination: { total: 0, page: pageNum, limit: limitNum, pages: 0 }
                });
            }

            const ids = rows.map(r => r.id);
            const totalCount = Number(rows[0].total_count) || 0;

            const { data: payments, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    orders:order_id (
                        order_number, customer_id, payment_status, total_amount, paid_amount,
                        customers:customer_id (name)
                    )
                `)
                .in('id', ids)
                .order('payment_date', { ascending: false });

            if (error) throw error;

            const formatted = (payments || []).map(payment => ({
                ...payment,
                order_number: payment.orders?.order_number || null,
                customer_name: payment.orders?.customers?.name || null,
                order_payment_status: payment.orders?.payment_status || 'unpaid',
                order_total: payment.orders?.total_amount || 0,
                order_paid: payment.orders?.paid_amount || 0
            }));

            return res.status(200).json({
                success: true,
                data: formatted,
                pagination: {
                    total: totalCount,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(totalCount / limitNum)
                }
            });
        }

        // Case B: no search. Standard paginated list.
        let dataQuery = supabase
            .from('payments')
            .select(`
                *,
                orders:order_id (
                    order_number, customer_id, payment_status, total_amount, paid_amount,
                    customers:customer_id (name)
                )
            `)
            .eq('branch_id', branchId);

        if (method) dataQuery = dataQuery.eq('method', method);
        if (status === 'voided') dataQuery = dataQuery.eq('status', 'voided');
        if (status === 'completed') dataQuery = dataQuery.neq('status', 'voided');
        if (startISO) dataQuery = dataQuery.gte('payment_date', startISO);
        if (endISO) dataQuery = dataQuery.lte('payment_date', endISO);

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery.order('payment_date', { ascending: false }).range(from, to);

        const { data: payments, error } = await dataQuery;
        if (error) throw error;

        let countQuery = supabase
            .from('payments')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', branchId);

        if (method) countQuery = countQuery.eq('method', method);
        if (status === 'voided') countQuery = countQuery.eq('status', 'voided');
        if (status === 'completed') countQuery = countQuery.neq('status', 'voided');
        if (startISO) countQuery = countQuery.gte('payment_date', startISO);
        if (endISO) countQuery = countQuery.lte('payment_date', endISO);

        const { count: totalCount, error: countError } = await countQuery;
        if (countError) throw countError;

        const formatted = (payments || []).map(payment => ({
            ...payment,
            order_number: payment.orders?.order_number || null,
            customer_name: payment.orders?.customers?.name || null,
            order_payment_status: payment.orders?.payment_status || 'unpaid',
            order_total: payment.orders?.total_amount || 0,
            order_paid: payment.orders?.paid_amount || 0
        }));

        const total = totalCount || 0;

        return res.status(200).json({
            success: true,
            data: formatted,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });

    } catch (error) {
        console.error('Get payments error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch payments' });
    }
};

const getPaymentById = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid payment ID' });
        }

        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Payment not found' });
            }
            throw error;
        }

        return res.status(200).json({ success: true, data });

    } catch (error) {
        console.error('Get payment error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch payment' });
    }
};

const createPayment = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { order_id, amount, method, reference_number, notes } = req.body;

        if (!order_id || !isValidUUID(order_id)) {
            return res.status(400).json({ success: false, error: 'Valid order ID is required' });
        }
        if (!isValidAmount(amount)) {
            return res.status(400).json({ success: false, error: 'Valid payment amount is required' });
        }
        if (!method || !isValidPaymentMethod(method)) {
            return res.status(400).json({ success: false, error: 'Valid payment method is required' });
        }

        let cleanReference = null;
        if (reference_number) {
            if (!isValidLength(reference_number, 3, 50) || !isSafeText(reference_number)) {
                return res.status(400).json({ success: false, error: 'Reference number must be 3-50 characters and contain no HTML or scripts' });
            }
            cleanReference = sanitize(reference_number.trim());
        }

        let cleanNotes = '';
        if (notes) {
            if (!isValidLength(notes, 0, 500) || !isSafeText(notes)) {
                return res.status(400).json({ success: false, error: 'Notes must be under 500 characters and contain no HTML or scripts' });
            }
            cleanNotes = sanitize(notes);
        }

        // Same atomic RPC used by the orders endpoint. Prevents payment
        // and order from getting out of sync if any step fails.
        const { data: updatedOrder, error: rpcError } = await supabase.rpc('record_payment_atomic', {
            p_order_id: order_id,
            p_branch_id: branchId,
            p_amount: parseFloat(amount),
            p_method: method,
            p_reference_number: cleanReference,
            p_user_id: req.user.id,
            p_user_name: req.user.full_name
        });

        if (rpcError) {
            console.error('Create payment RPC error:', rpcError);
            return res.status(500).json({
                success: false,
                error: rpcError.message || 'Failed to create payment'
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Payment created successfully',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Create payment error:', error);
        return res.status(500).json({ success: false, error: 'Failed to create payment: ' + error.message });
    }
};

module.exports = {
    getAllPayments,
    getPaymentById,
    createPayment
};