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

        let matchingOrderIds = null;
        if (search && search.trim()) {
            const term = search.trim().replace(/[%_,()'"]/g, '');
            if (term) {
                const { data: byNumber, error: errA } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('branch_id', branchId)
                    .ilike('order_number', `%${term}%`);

                if (errA) throw errA;

                const { data: byCustomer, error: errB } = await supabase
                    .from('orders')
                    .select('id, customers:customer_id!inner (name)')
                    .eq('branch_id', branchId)
                    .ilike('customers.name', `%${term}%`);

                if (errB) throw errB;

                const ids = new Set();
                (byNumber || []).forEach(r => ids.add(r.id));
                (byCustomer || []).forEach(r => ids.add(r.id));
                matchingOrderIds = Array.from(ids);

                if (matchingOrderIds.length === 0) {
                    return res.status(200).json({
                        success: true,
                        data: [],
                        pagination: { total: 0, page: pageNum, limit: limitNum, pages: 0 }
                    });
                }
            }
        }

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
        if (startDate) dataQuery = dataQuery.gte('payment_date', new Date(startDate).toISOString());
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dataQuery = dataQuery.lte('payment_date', end.toISOString());
        }
        if (matchingOrderIds !== null) dataQuery = dataQuery.in('order_id', matchingOrderIds);

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery.order('payment_date', { ascending: false }).range(from, to);

        const { data, error } = await dataQuery;
        if (error) throw error;

        let countQuery = supabase
            .from('payments')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', branchId);

        if (method) countQuery = countQuery.eq('method', method);
        if (status === 'voided') countQuery = countQuery.eq('status', 'voided');
        if (status === 'completed') countQuery = countQuery.neq('status', 'voided');
        if (startDate) countQuery = countQuery.gte('payment_date', new Date(startDate).toISOString());
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            countQuery = countQuery.lte('payment_date', end.toISOString());
        }
        if (matchingOrderIds !== null) countQuery = countQuery.in('order_id', matchingOrderIds);

        const { count: totalCount, error: countError } = await countQuery;
        if (countError) throw countError;

        const formatted = data.map(payment => ({
            ...payment,
            order_number: payment.orders?.order_number || null,
            customer_name: payment.orders?.customers?.name || null,
            order_payment_status: payment.orders?.payment_status || 'unpaid',
            order_total: payment.orders?.total_amount || 0,
            order_paid: payment.orders?.paid_amount || 0
        }));

        const total = totalCount || 0;
        const pages = Math.ceil(total / limitNum);

        return res.status(200).json({
            success: true,
            data: formatted,
            pagination: { total, page: pageNum, limit: limitNum, pages }
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

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, total_amount, paid_amount')
            .eq('id', order_id)
            .eq('branch_id', branchId)
            .single();

        if (orderError || !order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        const remaining = (parseFloat(order.total_amount) || 0) - (parseFloat(order.paid_amount) || 0);
        if (parseFloat(amount) > remaining + 0.01) {
            return res.status(400).json({ success: false, error: 'Payment amount exceeds remaining balance' });
        }

        const { data, error } = await supabase
            .from('payments')
            .insert({
                branch_id: branchId,
                order_id,
                amount: parseFloat(amount),
                method,
                reference_number: cleanReference,
                notes: cleanNotes,
                status: 'completed',
                recorded_by: req.user.id,
                recorded_by_name: req.user.full_name,
                payment_date: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        const newPaidAmount = (parseFloat(order.paid_amount) || 0) + parseFloat(amount);
        const orderTotal = parseFloat(order.total_amount) || 0;
        const paymentStatus = newPaidAmount >= orderTotal ? 'paid' : 'partial';

        await supabase
            .from('orders')
            .update({ paid_amount: newPaidAmount, payment_status: paymentStatus, updated_at: new Date() })
            .eq('id', order_id)
            .eq('branch_id', branchId);

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: branchId,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Payment Created',
                details: { payment_id: data.id, order_id, amount: parseFloat(amount), method, payment_status: paymentStatus }
            });

        return res.status(201).json({
            success: true,
            message: 'Payment created successfully',
            data
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