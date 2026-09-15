// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Orders Controller
// ============================================================

const supabase = require('../config/supabase');
const {
    isValidUUID,
    isValidAmount,
    isValidQuantity,
    isValidOrderStatus,
    isValidPaymentMethod,
    isValidLength,
    isSafeText,
    isValidArrayLength,
    sanitize
} = require('../utils/validators');

const getAllOrders = async (req, res) => {
    try {
        let { page = 1, limit = 50, search, status, startDate, endDate } = req.query;

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
            return res.status(400).json({ success: false, error: 'Invalid status filter. Valid: ' + VALID_STATUSES.join(', ') });
        }

        let matchingIdsFromSearch = null;
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
                matchingIdsFromSearch = Array.from(ids);

                if (matchingIdsFromSearch.length === 0) {
                    return res.status(200).json({
                        success: true,
                        data: [],
                        pagination: { total: 0, page: pageNum, limit: limitNum, pages: 0 }
                    });
                }
            }
        }

        let dataQuery = supabase
            .from('orders')
            .select(`
                *,
                customers:customer_id (name, phone),
                created_by_user:created_by (full_name),
                payment_recorded_by_user:payment_recorded_by (full_name),
                confirmed_by_user:confirmed_by (full_name)
            `);

        if (status) dataQuery = dataQuery.eq('order_status', status);
        if (startDate) dataQuery = dataQuery.gte('created_at', new Date(startDate).toISOString());
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dataQuery = dataQuery.lte('created_at', end.toISOString());
        }
        if (matchingIdsFromSearch !== null) {
            dataQuery = dataQuery.in('id', matchingIdsFromSearch);
        }

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery
            .order('created_at', { ascending: false })
            .range(from, to);

        const { data: orders, error } = await dataQuery;
        if (error) throw error;

        let countQuery = supabase
            .from('orders')
            .select('id', { count: 'exact', head: true });

        if (status) countQuery = countQuery.eq('order_status', status);
        if (startDate) countQuery = countQuery.gte('created_at', new Date(startDate).toISOString());
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            countQuery = countQuery.lte('created_at', end.toISOString());
        }
        if (matchingIdsFromSearch !== null) {
            countQuery = countQuery.in('id', matchingIdsFromSearch);
        }

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
        const pages = Math.ceil(total / limitNum);

        return res.status(200).json({
            success: true,
            data: formattedOrders,
            pagination: { total, page: pageNum, limit: limitNum, pages }
        });

    } catch (error) {
        console.error('Get orders error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
};

const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid order ID'
            });
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
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Get order error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch order'
        });
    }
};

const createOrder = async (req, res) => {
    try {
        const { customer_id, items, notes } = req.body;

        if (!customer_id || !isValidUUID(customer_id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid customer ID'
            });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one item is required'
            });
        }

        if (!isValidArrayLength(items, 100)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot have more than 100 items in an order'
            });
        }

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
            if (!isValidAmount(item.unit_price)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid unit price'
                });
            }
        }

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

        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id')
            .eq('id', customer_id)
            .single();

        if (customerError || !customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }

        const { data: settingsData, error: settingsError } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', ['vat_enabled', 'vat_rate']);

        if (settingsError) {
            console.error('Settings fetch error, defaulting VAT OFF');
        }

        const settingsMap = {};
        (settingsData || []).forEach(item => {
            settingsMap[item.key] = item.value;
        });

        const vatEnabled = settingsMap['vat_enabled'] === 'true';
        const vatRate = parseFloat(settingsMap['vat_rate'] || 18);

        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const itemTotal = item.unit_price * item.quantity;
            subtotal += itemTotal;

            const { data: product, error: productError } = await supabase
                .from('products')
                .select('id, name')
                .eq('id', item.product_id)
                .single();

            if (productError || !product) {
                return res.status(404).json({
                    success: false,
                    error: `Product ${item.name || 'not found'} not found`
                });
            }

            orderItems.push({
                product_id: item.product_id,
                product_name: item.name || product.name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                cost_price: item.cost_price || 0,
                subtotal: itemTotal
            });
        }

        const tax_amount = vatEnabled ? subtotal * (vatRate / 100) : 0;
        const total_amount = subtotal + tax_amount;
        const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

        const payload = {
            order_number: orderNumber,
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
            return res.status(500).json({
                success: false,
                error: 'Failed to create order: ' + rpcError.message
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: order
        });

    } catch (error) {
        console.error('Create order error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create order: ' + error.message
        });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!isValidOrderStatus(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Valid: pending, confirmed, delivered, cancelled'
            });
        }

        if (status === 'cancelled') {
            return res.status(400).json({
                success: false,
                error: 'To cancel an order, use the Cancel Order button. This endpoint cannot cancel orders.'
            });
        }

        const { data: order, error } = await supabase
            .from('orders')
            .update({
                order_status: status,
                updated_at: new Date()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }
            throw error;
        }

        await supabase
            .from('activity_logs')
            .insert({
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
        return res.status(500).json({
            success: false,
            error: 'Failed to update order status'
        });
    }
};

const recordPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, method, reference_number } = req.body;

        if (!isValidAmount(amount)) {
            return res.status(400).json({
                success: false,
                error: 'Valid amount is required'
            });
        }

        if (!isValidPaymentMethod(method)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment method. Valid: cash, mpesa, tigo_pesa'
            });
        }

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (orderError || !order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const orderTotal = parseFloat(order.total_amount) || 0;
        const previousPaid = parseFloat(order.paid_amount) || 0;
        const remaining = orderTotal - previousPaid;
        const paymentAmount = parseFloat(amount);

        if (paymentAmount > remaining + 0.01) {
            return res.status(400).json({
                success: false,
                error: `Payment exceeds remaining balance of ${remaining.toFixed(2)}`
            });
        }

        const validUserId = req.user.id;
        const validUserName = req.user.full_name;

        const paidAmount = previousPaid + paymentAmount;
        const paymentStatus = paidAmount >= orderTotal ? 'paid' : 'partial';
        const firstPaymentMethod = order.payment_method || method;

        const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update({
                paid_amount: paidAmount,
                payment_status: paymentStatus,
                payment_method: firstPaymentMethod,
                payment_recorded_by: validUserId,
                payment_recorded_by_name: validUserName,
                payment_recorded_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update order: ' + updateError.message
            });
        }

        const { error: paymentError } = await supabase
            .from('payments')
            .insert({
                order_id: id,
                amount: paymentAmount,
                method: method,
                reference_number: reference_number || null,
                status: 'completed',
                recorded_by: validUserId,
                recorded_by_name: validUserName,
                payment_date: new Date().toISOString()
            });

        if (paymentError) {
            console.error('Failed to record payment:', paymentError);
        }

        await supabase
            .from('activity_logs')
            .insert({
                user_id: validUserId,
                user_name: validUserName,
                action: 'Payment Recorded',
                order_id: order.id,
                order_number: order.order_number,
                details: {
                    amount: paymentAmount,
                    method,
                    payment_status: paymentStatus
                }
            });

        return res.status(200).json({
            success: true,
            message: 'Payment recorded successfully',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Record payment error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to record payment: ' + error.message
        });
    }
};

const confirmOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (orderError || !order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        if (order.payment_status !== 'paid') {
            return res.status(400).json({
                success: false,
                error: 'Cannot confirm order. Payment is not completed.'
            });
        }

        const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update({
                order_status: 'confirmed',
                confirmed_by: req.user.id,
                confirmed_by_name: req.user.full_name,
                confirmed_at: new Date(),
                updated_at: new Date()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        await supabase
            .from('activity_logs')
            .insert({
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Order Confirmed',
                order_id: order.id,
                order_number: order.order_number,
                details: { confirmed_by: req.user.full_name }
            });

        return res.status(200).json({
            success: true,
            message: 'Order confirmed successfully',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Confirm order error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to confirm order'
        });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        let cleanReason = 'No reason provided';
        if (reason) {
            if (!isValidLength(reason, 3, 500)) {
                return res.status(400).json({
                    success: false,
                    error: 'Reason must be between 3 and 500 characters'
                });
            }
            if (!isSafeText(reason)) {
                return res.status(400).json({
                    success: false,
                    error: 'Reason contains invalid content'
                });
            }
            cleanReason = sanitize(reason);
        }

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .eq('id', id)
            .single();

        if (orderError || !order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        if (order.order_status === 'cancelled') {
            return res.status(400).json({
                success: false,
                error: 'Order is already cancelled'
            });
        }

        const paidAmount = parseFloat(order.paid_amount) || 0;
        if (paidAmount > 0 && req.user.role !== 'boss') {
            return res.status(403).json({
                success: false,
                error: 'Only the Boss can cancel an order that has received payment'
            });
        }

        // Restore stock and record movement
        if (order.order_items && order.order_items.length > 0) {
            for (const item of order.order_items) {
                const { data: product, error: productError } = await supabase
                    .from('products')
                    .select('id, stock_quantity')
                    .eq('id', item.product_id)
                    .single();

                if (productError || !product) continue;

                await supabase
                    .from('products')
                    .update({
                        stock_quantity: product.stock_quantity + item.quantity,
                        updated_at: new Date()
                    })
                    .eq('id', item.product_id);
            }

            const stockMovements = order.order_items.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                movement_type: 'RETURN',
                reference_id: order.id,
                reference_number: order.order_number,
                created_by: req.user.id,
                reason: cleanReason
            }));

            const { error: movementError } = await supabase
                .from('stock_movements')
                .insert(stockMovements);

            if (movementError) {
                console.error('Failed to record stock movements on cancel:', movementError);
            }
        }

        // Reverse customer stats
        if (order.customer_id) {
            const { data: customer } = await supabase
                .from('customers')
                .select('total_orders, total_spent')
                .eq('id', order.customer_id)
                .single();

            if (customer) {
                await supabase
                    .from('customers')
                    .update({
                        total_orders: Math.max(0, (customer.total_orders || 0) - 1),
                        total_spent: Math.max(0, (customer.total_spent || 0) - (parseFloat(order.total_amount) || 0))
                    })
                    .eq('id', order.customer_id);
            }
        }

        // Void payments (do not delete). Preserves audit trail.
        if (paidAmount > 0) {
            const { error: voidError } = await supabase
                .from('payments')
                .update({
                    status: 'voided',
                    voided_at: new Date().toISOString(),
                    voided_by: req.user.id,
                    voided_by_name: req.user.full_name,
                    void_reason: cleanReason
                })
                .eq('order_id', id)
                .neq('status', 'voided');

            if (voidError) {
                console.error('Failed to void payments on cancel:', voidError);
            }
        }

        const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update({
                order_status: 'cancelled',
                cancelled_by: req.user.id,
                cancelled_by_name: req.user.full_name,
                cancelled_at: new Date(),
                cancellation_reason: cleanReason,
                paid_amount: 0,
                payment_status: 'cancelled',
                updated_at: new Date()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        await supabase
            .from('activity_logs')
            .insert({
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Order Cancelled',
                order_id: order.id,
                order_number: order.order_number,
                details: {
                    reason: cleanReason,
                    stock_restored: true,
                    preserved_total: order.total_amount,
                    preserved_vat: order.tax_amount,
                    voided_paid: order.paid_amount
                }
            });

        return res.status(200).json({
            success: true,
            message: 'Order cancelled. Stock restored, payments voided, totals preserved for audit.',
            data: updatedOrder
        });

    } catch (error) {
        console.error('Cancel order error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to cancel order'
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
    cancelOrder
};