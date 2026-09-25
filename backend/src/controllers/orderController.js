// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Orders Controller
// ============================================================

const supabase = require('../config/supabase');
const { requireBranchId } = require('../utils/branchScope');
const {
    isValidUUID,
    isValidAmount,
    isValidQuantity,
    isValidOrderStatus,
    isValidPaymentMethod,
    isValidLength,
    isSafeText,
    isValidArrayLength,
    isValidName,
    isValidPhone,
    isValidEmail,
    sanitize
} = require('../utils/validators');

const getAllOrders = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        let { page = 1, limit = 50, search, status, payment_status, startDate, endDate } = req.query;

        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, error: 'Page must be a positive number' });
        }

        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
            return res.status(400).json({ success: false, error: 'Limit must be between 1 and 200' });
        }

        const VALID_STATUSES = ['pending', 'confirmed', 'delivered', 'cancelled'];
        if (status && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status filter' });
        }

        const VALID_PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'cancelled'];
        if (payment_status && !VALID_PAYMENT_STATUSES.includes(payment_status)) {
            return res.status(400).json({ success: false, error: 'Invalid payment status filter' });
        }

        const startISO = startDate ? new Date(startDate).toISOString() : null;
        const endISO = endDate ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d.toISOString(); })() : null;

        const cleanSearch = search && search.trim()
            ? search.trim().replace(/[%_,()'"]/g, '')
            : null;

        const offset = (pageNum - 1) * limitNum;

        // Case A: search present. Use the RPC to avoid URL-length limits.
        if (cleanSearch) {
            const { data: idRows, error: rpcError } = await supabase.rpc('search_orders', {
                p_branch_id: branchId,
                p_term: cleanSearch,
                p_status: status || null,
                p_payment_status: payment_status || null,
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

            const { data: orders, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    customers:customer_id (name, phone),
                    created_by_user:created_by (full_name),
                    payment_recorded_by_user:payment_recorded_by (full_name),
                    confirmed_by_user:confirmed_by (full_name)
                `)
                .in('id', ids)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedOrders = (orders || []).map(order => ({
                ...order,
                customer_name: order.customers?.name || null,
                created_by_name: order.created_by_user?.full_name || order.created_by_name || null,
                payment_recorded_by_name: order.payment_recorded_by_user?.full_name || order.payment_recorded_by_name || null,
                confirmed_by_name: order.confirmed_by_user?.full_name || order.confirmed_by_name || null
            }));

            return res.status(200).json({
                success: true,
                data: formattedOrders,
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
            .from('orders')
            .select(`
                *,
                customers:customer_id (name, phone),
                created_by_user:created_by (full_name),
                payment_recorded_by_user:payment_recorded_by (full_name),
                confirmed_by_user:confirmed_by (full_name)
            `)
            .eq('branch_id', branchId);

        if (status) dataQuery = dataQuery.eq('order_status', status);
        if (payment_status) dataQuery = dataQuery.eq('payment_status', payment_status);
        if (startISO) dataQuery = dataQuery.gte('created_at', startISO);
        if (endISO) dataQuery = dataQuery.lte('created_at', endISO);

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery.order('created_at', { ascending: false }).range(from, to);

        const { data: orders, error } = await dataQuery;
        if (error) throw error;

        let countQuery = supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', branchId);

        if (status) countQuery = countQuery.eq('order_status', status);
        if (payment_status) countQuery = countQuery.eq('payment_status', payment_status);
        if (startISO) countQuery = countQuery.gte('created_at', startISO);
        if (endISO) countQuery = countQuery.lte('created_at', endISO);

        const { count: totalCount, error: countError } = await countQuery;
        if (countError) throw countError;

        const formattedOrders = orders.map(order => ({
            ...order,
            customer_name: order.customers?.name || null,
            created_by_name: order.created_by_user?.full_name || order.created_by_name || null,
            payment_recorded_by_name: order.payment_recorded_by_user?.full_name || order.payment_recorded_by_name || null,
            confirmed_by_name: order.confirmed_by_user?.full_name || order.confirmed_by_name || null
        }));

        const total = totalCount || 0;

        return res.status(200).json({
            success: true,
            data: formattedOrders,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });

    } catch (error) {
        console.error('Get orders error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch orders' });
    }
};

const getOrderById = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid order ID' });
        }

        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                customers:customer_id (id, name, phone, email, address),
                created_by_user:created_by (id, full_name),
                payment_recorded_by_user:payment_recorded_by (id, full_name),
                confirmed_by_user:confirmed_by (id, full_name),
                order_items (*)
            `)
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            throw error;
        }

        return res.status(200).json({ success: true, data: order });

    } catch (error) {
        console.error('Get order error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch order' });
    }
};

const createOrder = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { customer_id, items, notes } = req.body;

        if (!customer_id || !isValidUUID(customer_id)) {
            return res.status(400).json({ success: false, error: 'Invalid customer ID' });
        }
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one item is required' });
        }
        if (!isValidArrayLength(items, 100)) {
            return res.status(400).json({ success: false, error: 'Cannot have more than 100 items' });
        }

        for (const item of items) {
            if (!item.product_id || !isValidUUID(item.product_id)) {
                return res.status(400).json({ success: false, error: 'Invalid product ID' });
            }
            if (!isValidQuantity(item.quantity)) {
                return res.status(400).json({ success: false, error: 'Invalid quantity' });
            }
            if (!isValidAmount(item.unit_price)) {
                return res.status(400).json({ success: false, error: 'Invalid unit price' });
            }
        }

        let cleanNotes = '';
        if (notes) {
            if (!isValidLength(notes, 0, 500) || !isSafeText(notes)) {
                return res.status(400).json({ success: false, error: 'Notes must be under 500 characters and contain no HTML or scripts' });
            }
            cleanNotes = sanitize(notes);
        }

        const { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('id', customer_id)
            .eq('branch_id', branchId)
            .single();

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found in this branch' });
        }

        const { data: business } = await supabase
            .from('businesses')
            .select('vat_enabled, vat_rate')
            .eq('id', req.scope.business_id)
            .single();

        const vatEnabled = business?.vat_enabled === true;
        const vatRate = parseFloat(business?.vat_rate) || 18;

        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const itemTotal = item.unit_price * item.quantity;
            subtotal += itemTotal;

            // Look up name AND cost_price from the products table.
            // The client is never trusted for cost_price.
            const { data: product } = await supabase
                .from('products')
                .select('id, name, cost_price')
                .eq('id', item.product_id)
                .eq('branch_id', branchId)
                .single();

            if (!product) {
                return res.status(404).json({ success: false, error: `Product ${item.name || 'not found'} not found in this branch` });
            }

            orderItems.push({
                product_id: item.product_id,
                product_name: product.name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                cost_price: parseFloat(product.cost_price) || 0,
                subtotal: itemTotal
            });
        }

        const tax_amount = vatEnabled ? subtotal * (vatRate / 100) : 0;
        const total_amount = subtotal + tax_amount;

        const payload = {
            branch_id: branchId,
            customer_id,
            subtotal,
            tax_amount,
            total_amount,
            created_by: req.user.id,
            created_by_name: req.user.full_name,
            notes: cleanNotes || '',
            items: orderItems,
            vat_enabled: vatEnabled
        };

        const { data: order, error: rpcError } = await supabase.rpc('create_order_atomic', { payload });

        if (rpcError) {
            console.error('Create order RPC error:', rpcError);
            return res.status(500).json({ success: false, error: 'Failed to create order: ' + rpcError.message });
        }

        return res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: order
        });

    } catch (error) {
        console.error('Create order error:', error);
        return res.status(500).json({ success: false, error: 'Failed to create order: ' + error.message });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;
        const { status } = req.body;

        if (!isValidOrderStatus(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        if (status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'Use the Cancel Order endpoint instead' });
        }

        const { data: order, error } = await supabase
            .from('orders')
            .update({ order_status: status, updated_at: new Date() })
            .eq('id', id)
            .eq('branch_id', branchId)
            .select(`
                *,
                customers:customer_id (id, name, phone, email, address),
                created_by_user:created_by (id, full_name),
                payment_recorded_by_user:payment_recorded_by (id, full_name),
                confirmed_by_user:confirmed_by (id, full_name),
                order_items (*)
            `)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Order not found' });
            }
            throw error;
        }

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: branchId,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Order Status Updated',
                order_id: order.id,
                order_number: order.order_number,
                details: { new_status: status }
            });

        return res.status(200).json({
            success: true,
            message: 'Order status updated',
            data: order
        });

    } catch (error) {
        console.error('Update order status error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
};

const recordPayment = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;
        const { amount, method, reference_number } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid order ID' });
        }

        if (!isValidAmount(amount)) {
            return res.status(400).json({ success: false, error: 'Valid amount is required' });
        }
        if (!isValidPaymentMethod(method)) {
            return res.status(400).json({ success: false, error: 'Invalid payment method' });
        }

        let cleanReference = null;
        if (reference_number) {
            if (!isValidLength(reference_number, 3, 50) || !isSafeText(reference_number)) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference number must be 3-50 characters and contain no HTML or scripts'
                });
            }
            cleanReference = sanitize(reference_number.trim());
        }

        // All the writes (order update, payment insert, activity log) happen
        // inside one atomic RPC. The RPC also re-checks the remaining balance
        // while holding a row lock, which prevents two cashiers from
        // double-charging the same order.
        const { data: updatedOrder, error: rpcError } = await supabase.rpc('record_payment_atomic', {
            p_order_id: id,
            p_branch_id: branchId,
            p_amount: parseFloat(amount),
            p_method: method,
            p_reference_number: cleanReference,
            p_user_id: req.user.id,
            p_user_name: req.user.full_name
        });

        if (rpcError) {
            console.error('Record payment RPC error:', rpcError);
            return res.status(500).json({
                success: false,
                error: rpcError.message || 'Failed to record payment'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Payment recorded successfully',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Record payment error:', error);
        return res.status(500).json({ success: false, error: 'Failed to record payment: ' + error.message });
    }
};

const confirmOrder = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid order ID' });
        }

        // Atomic: status update + activity log in one RPC.
        const { data: updatedOrder, error: rpcError } = await supabase.rpc('confirm_order_atomic', {
            p_order_id: id,
            p_branch_id: branchId,
            p_user_id: req.user.id,
            p_user_name: req.user.full_name
        });

        if (rpcError) {
            console.error('Confirm order RPC error:', rpcError);
            return res.status(500).json({
                success: false,
                error: rpcError.message || 'Failed to confirm order'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Order confirmed successfully',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Confirm order error:', error);
        return res.status(500).json({ success: false, error: 'Failed to confirm order' });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;
        const { reason } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid order ID' });
        }

        let cleanReason = 'No reason provided';
        if (reason) {
            if (!isValidLength(reason, 3, 500) || !isSafeText(reason)) {
                return res.status(400).json({ success: false, error: 'Reason must be 3-500 characters and contain no HTML or scripts' });
            }
            cleanReason = sanitize(reason);
        }

        // Pre-check: is this order allowed to be cancelled by this user?
        // (Business logic that determines role restrictions, not transactional work.)
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, order_number, paid_amount, order_status')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (orderError || !order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        if (order.order_status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'Order is already cancelled' });
        }

        const paidAmount = parseFloat(order.paid_amount) || 0;
        if (paidAmount > 0 && req.user.role !== 'boss') {
            return res.status(403).json({ success: false, error: 'Only the Boss can cancel an order that has received payment' });
        }

        // The actual cancellation is one atomic RPC call. Every step inside
        // (restore stock, log movements, update customer, void payments,
        // update order, write audit log) either all succeed or none do.
        const { data: updatedOrder, error: rpcError } = await supabase.rpc('cancel_order_atomic', {
            p_order_id: id,
            p_branch_id: branchId,
            p_user_id: req.user.id,
            p_user_name: req.user.full_name,
            p_reason: cleanReason
        });

        if (rpcError) {
            console.error('Cancel order RPC error:', rpcError);
            return res.status(500).json({
                success: false,
                error: rpcError.message || 'Failed to cancel order'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Order cancelled. Stock restored, payments voided, totals preserved for audit.',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Cancel order error:', error);
        return res.status(500).json({ success: false, error: 'Failed to cancel order' });
    }
};

// ============================================================
// POST /api/orders/quick-sale
// One-screen sale: optional customer, inline payment, atomic.
// Roles: boss, manager, cashier.
// Payment is required and must equal the order total (full pay).
// ============================================================
const createQuickSale = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { items, payment, new_customer, notes, discount_amount } = req.body;

        // ---------------- items ----------------
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one item is required'
            });
        }

        if (!isValidArrayLength(items, 100)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot have more than 100 items'
            });
        }

        // Quick Sale items are validated by product_id and quantity only.
        // unit_price and cost_price come from the products table, never
        // from the client — that closes the price-manipulation hole.
        for (const item of items) {
            if (!item.product_id || !isValidUUID(item.product_id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid product ID'
                });
            }
            if (!isValidQuantity(item.quantity)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid quantity'
                });
            }
        }

        // ---------------- payment ----------------
        if (!payment || typeof payment !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Payment is required'
            });
        }

        if (!isValidPaymentMethod(payment.method)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment method'
            });
        }

        // M-Pesa and Tigo Pesa require a reference number
        if (
            (payment.method === 'mpesa' || payment.method === 'tigo_pesa') &&
            (!payment.reference_number || !isSafeText(String(payment.reference_number)))
        ) {
            return res.status(400).json({
                success: false,
                error: 'Reference number is required for mobile money payments'
            });
        }

        let cleanReference = null;
        if (payment.reference_number) {
            if (!isValidLength(payment.reference_number, 3, 50) || !isSafeText(payment.reference_number)) {
                return res.status(400).json({
                    success: false,
                    error: 'Reference number must be 3-50 characters and contain no HTML or scripts'
                });
            }
            cleanReference = sanitize(payment.reference_number.trim());
        }

        // ---------------- discount ----------------
        let cleanDiscount = 0;
        if (discount_amount !== undefined && discount_amount !== null && discount_amount !== '') {
            const d = parseFloat(discount_amount);
            if (isNaN(d) || d < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid discount amount'
                });
            }
            if (d > 0 && !['boss', 'manager'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Only owners and managers can apply discounts'
                });
            }
            cleanDiscount = d;
        }

        // ---------------- notes ----------------
        let cleanNotes = '';
        if (notes) {
            if (!isValidLength(notes, 0, 50) || !isSafeText(notes)) {
                return res.status(400).json({
                    success: false,
                    error: 'Notes must be under 50 characters and contain no invalid content'
                });
            }
            cleanNotes = sanitize(notes);
        }

        // ---------------- optional new customer ----------------
        let cleanNewCustomer = null;
        if (new_customer !== undefined && new_customer !== null) {
            if (typeof new_customer !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'new_customer must be an object'
                });
            }

            const { name, phone, email, address } = new_customer;

            if (!name || !isValidName(name) || !isSafeText(name)) {
                return res.status(400).json({
                    success: false,
                    error: 'Customer name must be 2-20 characters and contain no invalid content'
                });
            }

            if (!phone || !isValidPhone(phone) || !isSafeText(phone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid phone number format'
                });
            }

            if (email && (!isValidEmail(email) || !isSafeText(email))) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }

            let cleanAddress = '';
            if (address) {
                if (!isValidLength(address, 0, 500) || !isSafeText(address)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Address must be under 500 characters'
                    });
                }
                cleanAddress = sanitize(address);
            }

            cleanNewCustomer = {
                name: sanitize(name.trim()),
                phone: sanitize(phone.trim()),
                email: email ? sanitize(email.toLowerCase().trim()) : '',
                address: cleanAddress
            };
        }

        // ---------------- check quick_sale_enabled ----------------
        const { data: business, error: bizErr } = await supabase
            .from('businesses')
            .select('vat_enabled, vat_rate, quick_sale_enabled')
            .eq('id', req.scope.business_id)
            .single();

        if (bizErr || !business) {
            return res.status(404).json({
                success: false,
                error: 'Business not found'
            });
        }

        if (!business.quick_sale_enabled) {
            return res.status(403).json({
                success: false,
                error: 'Quick Sale is not enabled for this business'
            });
        }

        const vatEnabled = business.vat_enabled === true;
        const vatRate = parseFloat(business.vat_rate) || 18;

        // ---------------- resolve products and totals ----------------
        // Ignore client-supplied unit_price / cost_price. Look them up
        // from the products table so a cashier can't manipulate prices.
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const { data: product, error: prodErr } = await supabase
                .from('products')
                .select('id, name, selling_price, cost_price, is_active')
                .eq('id', item.product_id)
                .eq('branch_id', branchId)
                .single();

            if (prodErr || !product) {
                return res.status(404).json({
                    success: false,
                    error: `Product not found in this branch`
                });
            }

            if (product.is_active === false) {
                return res.status(400).json({
                    success: false,
                    error: `Product "${product.name}" is inactive`
                });
            }

            const unitPrice = parseFloat(product.selling_price) || 0;
            const costPrice = parseFloat(product.cost_price) || 0;
            const itemTotal = unitPrice * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                product_id: product.id,
                product_name: product.name,
                quantity: item.quantity,
                unit_price: unitPrice,
                cost_price: costPrice,
                subtotal: itemTotal
            });
        }

        const tax_amount = vatEnabled ? subtotal * (vatRate / 100) : 0;
        const totalBeforeDiscount = subtotal + tax_amount;

        if (cleanDiscount > totalBeforeDiscount) {
            return res.status(400).json({
                success: false,
                error: 'Discount cannot exceed order total'
            });
        }

        const total_amount = totalBeforeDiscount - cleanDiscount;
        const paymentAmount = parseFloat(payment.amount);

        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment amount'
            });
        }

        // Quick Sale requires full payment (no partials, no unpaid).
        // Partial payments must go through the Advanced flow.
        if (paymentAmount < total_amount - 0.01) {
            return res.status(400).json({
                success: false,
                error: `Quick Sale requires full payment. Order total is ${total_amount.toFixed(2)}.`
            });
        }

        // ---------------- call RPC ----------------
        const payload = {
            branch_id: branchId,
            customer_id: null,
            created_by: req.user.id,
            created_by_name: req.user.full_name,
            notes: cleanNotes,
            subtotal,
            tax_amount,
            discount_amount: cleanDiscount,
            total_amount,
            items: orderItems,
            payment: {
                method: payment.method,
                amount: paymentAmount,
                reference_number: cleanReference
            }
        };

        // Only include new_customer when a customer is actually being created.
        // Sending null causes the RPC to insert a customer with NULL name/phone.
        if (cleanNewCustomer) {
            payload.new_customer = cleanNewCustomer;
        }

        const { data: order, error: rpcError } = await supabase.rpc('create_order_atomic', { payload });

        if (rpcError) {
            console.error('Quick sale RPC error:', rpcError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create quick sale: ' + rpcError.message
            });
        }

        // ---------------- activity log ----------------
        await supabase
            .from('activity_logs')
            .insert({
                branch_id: branchId,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Quick Sale',
                order_id: order.id,
                order_number: order.order_number,
                details: {
                    mode: 'quick',
                    role: req.user.role,
                    method: payment.method,
                    items: orderItems.length,
                    total: total_amount,
                    discount: cleanDiscount,
                    walk_in: cleanNewCustomer === null
                }
            });

        return res.status(201).json({
            success: true,
            message: 'Sale completed',
            data: order
        });

    } catch (error) {
        console.error('Create quick sale error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create quick sale: ' + error.message
        });
    }
};

module.exports = {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    recordPayment,
    confirmOrder,
    cancelOrder,
    createQuickSale
};