// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Payments Controller
// ============================================================

const supabase = require('../config/supabase');
const {
    isValidUUID,
    isValidAmount,
    isValidPaymentMethod,
    isValidLength,
    isSafeText,
    sanitize
} = require('../utils/validators');

// ============================================================
// GET ALL PAYMENTS (paginated + filters)
// ============================================================

const getAllPayments = async (req, res) => {
    try {
        let { page = 1, limit = 50, all, search, method, startDate, endDate } = req.query;

        // Legacy: return everything
        if (all === 'true') {
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    orders:order_id (
                        order_number,
                        customer_id,
                        payment_status,
                        total_amount,
                        paid_amount,
                        customers:customer_id (name)
                    )
                `)
                .order('payment_date', { ascending: false });

            if (error) throw error;

            const formatted = data.map(payment => ({
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
                pagination: null
            });
        }

        // Validate
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
            return res.status(400).json({
                success: false,
                error: 'Invalid method filter. Valid: ' + VALID_METHODS.join(', ')
            });
        }

        // Resolve order IDs from search (order_number OR customer name)
        let matchingOrderIds = null;
        if (search && search.trim()) {
            const term = search.trim().replace(/[%_,()'"]/g, '');
            if (term) {
                const { data: byNumber, error: errA } = await supabase
                    .from('orders')
                    .select('id')
                    .ilike('order_number', `%${term}%`);

                if (errA) throw errA;

                const { data: byCustomer, error: errB } = await supabase
                    .from('orders')
                    .select('id, customers:customer_id!inner (name)')
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

        // Data query
        let dataQuery = supabase
            .from('payments')
            .select(`
                *,
                orders:order_id (
                    order_number,
                    customer_id,
                    payment_status,
                    total_amount,
                    paid_amount,
                    customers:customer_id (name)
                )
            `);

        if (method) dataQuery = dataQuery.eq('method', method);
        if (startDate) dataQuery = dataQuery.gte('payment_date', new Date(startDate).toISOString());
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dataQuery = dataQuery.lte('payment_date', end.toISOString());
        }
        if (matchingOrderIds !== null) {
            dataQuery = dataQuery.in('order_id', matchingOrderIds);
        }

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery
            .order('payment_date', { ascending: false })
            .range(from, to);

        const { data, error } = await dataQuery;
        if (error) throw error;

        // Count
        let countQuery = supabase
            .from('payments')
            .select('id', { count: 'exact', head: true });

        if (method) countQuery = countQuery.eq('method', method);
        if (startDate) countQuery = countQuery.gte('payment_date', new Date(startDate).toISOString());
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            countQuery = countQuery.lte('payment_date', end.toISOString());
        }
        if (matchingOrderIds !== null) {
            countQuery = countQuery.in('order_id', matchingOrderIds);
        }

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
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch payments'
        });
    }
};

// ============================================================
// GET SINGLE PAYMENT
// ============================================================

const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment ID'
            });
        }

        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Payment not found'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error('Get payment error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch payment'
        });
    }
};

// ============================================================
// CREATE PAYMENT (standalone)
// ============================================================

const createPayment = async (req, res) => {
    try {
        const { order_id, amount, method, reference_number, notes } = req.body;

        if (!order_id || !isValidUUID(order_id)) {
            return res.status(400).json({
                success: false,
                error: 'Valid order ID is required'
            });
        }

        if (!isValidAmount(amount)) {
            return res.status(400).json({
                success: false,
                error: 'Valid payment amount is required'
            });
        }

        if (!method || !isValidPaymentMethod(method)) {
            return res.status(400).json({
                success: false,
                error: 'Valid payment method is required (cash, mpesa, tigo_pesa)'
            });
        }

        // Reference number
        let cleanReference = null;
        if (reference_number) {
            if (!isValidLength(reference_number, 3, 50)) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference number must be between 3 and 50 characters'
                });
            }
            if (!isSafeText(reference_number)) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference number contains invalid content'
                });
            }
            cleanReference = sanitize(reference_number.trim());
        }

        // Notes
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

        // Order must exist
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, total_amount, paid_amount')
            .eq('id', order_id)
            .single();

        if (orderError || !order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const remaining = (parseFloat(order.total_amount) || 0) - (parseFloat(order.paid_amount) || 0);
        if (parseFloat(amount) > remaining + 0.01) {
            return res.status(400).json({
                success: false,
                error: 'Payment amount exceeds remaining balance'
            });
        }

        // Resolve actor
        let validUserId = null;
        let validUserName = 'System';

        if (req.user && req.user.id) {
            const { data: user } = await supabase
                .from('users')
                .select('id, full_name')
                .eq('id', req.user.id)
                .single();

            if (user) {
                validUserId = user.id;
                validUserName = user.full_name;
            }
        }

        const { data, error } = await supabase
            .from('payments')
            .insert({
                order_id,
                amount: parseFloat(amount),
                method,
                reference_number: cleanReference,
                notes: cleanNotes,
                recorded_by: validUserId,
                recorded_by_name: validUserName,
                payment_date: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Update order paid amount + status
        const newPaidAmount = (parseFloat(order.paid_amount) || 0) + parseFloat(amount);
        const orderTotal = parseFloat(order.total_amount) || 0;
        const paymentStatus = newPaidAmount >= orderTotal ? 'paid' : 'partial';

        await supabase
            .from('orders')
            .update({
                paid_amount: newPaidAmount,
                payment_status: paymentStatus,
                updated_at: new Date()
            })
            .eq('id', order_id);

        await supabase
            .from('activity_logs')
            .insert({
                user_id: validUserId,
                user_name: validUserName,
                action: 'Payment Created',
                details: {
                    payment_id: data.id,
                    order_id,
                    amount: parseFloat(amount),
                    method,
                    payment_status: paymentStatus
                }
            });

        return res.status(201).json({
            success: true,
            message: 'Payment created successfully',
            data
        });

    } catch (error) {
        console.error('Create payment error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create payment: ' + error.message
        });
    }
};

module.exports = {
    getAllPayments,
    getPaymentById,
    createPayment
};