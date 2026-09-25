// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Purchase Orders Controller
// Branch-scoped
// ============================================================

const supabase = require('../config/supabase');
const { requireBranchId } = require('../utils/branchScope');
const {
    isValidUUID,
    isValidAmount,
    isValidQuantity,
    isValidLength,
    isSafeText,
    isValidArrayLength,
    sanitize
} = require('../utils/validators');

const getAllPurchaseOrders = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        let { page = 1, limit = 50, search, status, startDate, endDate } = req.query;

        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, error: 'Page must be a positive number' });
        }

        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
            return res.status(400).json({ success: false, error: 'Limit must be between 1 and 200' });
        }

        const VALID_STATUSES = ['pending', 'received', 'cancelled'];
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
            const { data: idRows, error: rpcError } = await supabase.rpc('search_purchase_orders', {
                p_branch_id: branchId,
                p_term: cleanSearch,
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

            const { data: pos, error } = await supabase
                .from('purchase_orders')
                .select('*')
                .in('id', ids)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Enrich with supplier names
            const supplierIds = [...new Set((pos || []).map(po => po.supplier_id).filter(id => id))];
            let supplierMap = {};

            if (supplierIds.length > 0) {
                const { data: suppliers } = await supabase
                    .from('suppliers')
                    .select('id, name')
                    .eq('branch_id', branchId)
                    .in('id', supplierIds);

                if (suppliers) {
                    supplierMap = suppliers.reduce((acc, s) => { acc[s.id] = s.name; return acc; }, {});
                }
            }

            const formatted = (pos || []).map(po => ({
                ...po,
                supplier_name: supplierMap[po.supplier_id] || null,
                created_by_name: po.created_by_name || 'System'
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
            .from('purchase_orders')
            .select('*')
            .eq('branch_id', branchId);

        if (status) dataQuery = dataQuery.eq('status', status);
        if (startISO) dataQuery = dataQuery.gte('created_at', startISO);
        if (endISO) dataQuery = dataQuery.lte('created_at', endISO);

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery.order('created_at', { ascending: false }).range(from, to);

        const { data: pos, error } = await dataQuery;
        if (error) throw error;

        let countQuery = supabase
            .from('purchase_orders')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', branchId);

        if (status) countQuery = countQuery.eq('status', status);
        if (startISO) countQuery = countQuery.gte('created_at', startISO);
        if (endISO) countQuery = countQuery.lte('created_at', endISO);

        const { count: totalCount, error: countError } = await countQuery;
        if (countError) throw countError;

        const supplierIds = [...new Set((pos || []).map(po => po.supplier_id).filter(id => id))];
        let supplierMap = {};

        if (supplierIds.length > 0) {
            const { data: suppliers } = await supabase
                .from('suppliers')
                .select('id, name')
                .eq('branch_id', branchId)
                .in('id', supplierIds);

            if (suppliers) {
                supplierMap = suppliers.reduce((acc, s) => { acc[s.id] = s.name; return acc; }, {});
            }
        }

        const formatted = (pos || []).map(po => ({
            ...po,
            supplier_name: supplierMap[po.supplier_id] || null,
            created_by_name: po.created_by_name || 'System'
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
        console.error('Get purchase orders error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch purchase orders: ' + error.message });
    }
};

const getPurchaseOrderById = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid purchase order ID' });
        }

        const { data: po, error } = await supabase
            .from('purchase_orders')
            .select('*')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Purchase order not found' });
            }
            throw error;
        }

        let supplierName = null;
        if (po.supplier_id) {
            const { data: supplier } = await supabase
                .from('suppliers')
                .select('name')
                .eq('id', po.supplier_id)
                .eq('branch_id', branchId)
                .single();
            if (supplier) supplierName = supplier.name;
        }

        const { data: items } = await supabase
            .from('purchase_order_items')
            .select('*')
            .eq('purchase_order_id', id);

        return res.status(200).json({
            success: true,
            data: {
                ...po,
                supplier_name: supplierName,
                created_by_name: po.created_by_name || 'System',
                purchase_order_items: items || []
            }
        });

    } catch (error) {
        console.error('Get purchase order error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch purchase order: ' + error.message });
    }
};

const createPurchaseOrder = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { supplier_id, items, notes } = req.body;

        if (!supplier_id || !isValidUUID(supplier_id)) {
            return res.status(400).json({ success: false, error: 'Valid supplier ID is required' });
        }
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one item is required' });
        }
        if (!isValidArrayLength(items, 100)) {
            return res.status(400).json({ success: false, error: 'Cannot have more than 100 items' });
        }

        const seenProductIds = new Set();
        for (const item of items) {
            if (!item.product_id || !isValidUUID(item.product_id)) {
                return res.status(400).json({ success: false, error: 'Invalid product ID in items' });
            }
            if (seenProductIds.has(item.product_id)) {
                return res.status(400).json({ success: false, error: 'Duplicate product in items' });
            }
            seenProductIds.add(item.product_id);

            if (!isValidQuantity(item.quantity)) {
                return res.status(400).json({ success: false, error: 'Invalid quantity in items' });
            }
            if (!isValidAmount(item.cost_price)) {
                return res.status(400).json({ success: false, error: 'Invalid cost price in items' });
            }
        }

        let cleanNotes = '';
        if (notes) {
            if (!isValidLength(notes, 0, 500) || !isSafeText(notes)) {
                return res.status(400).json({ success: false, error: 'Notes must be under 500 characters and contain no HTML or scripts' });
            }
            cleanNotes = sanitize(notes);
        }

        const { data: supplier } = await supabase
            .from('suppliers')
            .select('id')
            .eq('id', supplier_id)
            .eq('branch_id', branchId)
            .single();

        if (!supplier) {
            return res.status(404).json({ success: false, error: 'Supplier not found in this branch' });
        }

        const productIds = items.map(i => i.product_id);
        const { data: products } = await supabase
            .from('products')
            .select('id, name, is_active')
            .eq('branch_id', branchId)
            .in('id', productIds);

        const productMap = {};
        (products || []).forEach(p => { productMap[p.id] = p; });

        for (const item of items) {
            const product = productMap[item.product_id];
            if (!product) {
                return res.status(404).json({ success: false, error: `Product not found for ID ${item.product_id}` });
            }
            if (product.is_active === false) {
                return res.status(400).json({ success: false, error: `Product "${product.name}" is inactive` });
            }
        }

        let total = 0;
        const poItems = items.map(item => {
            const product = productMap[item.product_id];
            const subtotal = item.cost_price * item.quantity;
            total += subtotal;
            return {
                product_id: item.product_id,
                product_name: product.name,
                quantity: item.quantity,
                cost_price: item.cost_price,
                subtotal
            };
        });

        const poNumber = `PO-${Date.now().toString().slice(-8)}`;

        const { data: po, error } = await supabase
            .from('purchase_orders')
            .insert({
                branch_id: branchId,
                po_number: poNumber,
                supplier_id,
                total_amount: total,
                status: 'pending',
                notes: cleanNotes,
                created_by: req.user.id,
                created_by_name: req.user.full_name
            })
            .select()
            .single();

        if (error) {
            console.error('Create PO error:', error);
            return res.status(500).json({ success: false, error: 'Failed to create purchase order: ' + error.message });
        }

        const poItemsWithId = poItems.map(item => ({ ...item, purchase_order_id: po.id }));

        const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(poItemsWithId);

        if (itemsError) {
            await supabase.from('purchase_orders').delete().eq('id', po.id);
            return res.status(500).json({ success: false, error: 'Failed to create PO items: ' + itemsError.message });
        }

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: branchId,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Purchase Order Created',
                order_number: poNumber,
                details: { supplier_id, total, items: items.length }
            });

        return res.status(201).json({
            success: true,
            message: 'Purchase order created successfully',
            data: po
        });

    } catch (error) {
        console.error('Create PO error:', error);
        return res.status(500).json({ success: false, error: 'Failed to create purchase order: ' + error.message });
    }
};

const receivePurchaseOrder = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid purchase order ID' });
        }

        // All the writes (increment stock per item, insert stock movements,
        // update PO status, log activity) happen in one atomic RPC. If any
        // step fails, the whole receive is rolled back — no half-received POs.
        const { data: updated, error: rpcError } = await supabase.rpc('receive_purchase_order_atomic', {
            p_po_id: id,
            p_branch_id: branchId,
            p_user_id: req.user.id,
            p_user_name: req.user.full_name
        });

        if (rpcError) {
            console.error('Receive PO RPC error:', rpcError);
            return res.status(500).json({
                success: false,
                error: rpcError.message || 'Failed to receive purchase order'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Purchase order received successfully',
            data: updated
        });

    } catch (error) {
        console.error('Receive PO error:', error);
        return res.status(500).json({ success: false, error: 'Failed to receive purchase order: ' + error.message });
    }
};

const updatePurchaseOrder = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;
        const { supplier_id, items, notes } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid purchase order ID' });
        }

        // Pre-check for status and current state
        const { data: existing } = await supabase
            .from('purchase_orders')
            .select('id, po_number, status, supplier_id')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (!existing) {
            return res.status(404).json({ success: false, error: 'Purchase order not found' });
        }

        if (existing.status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'Cannot update a cancelled purchase order' });
        }

        // Build the update payload for the RPC
        const updateData = {};
        if (supplier_id !== undefined) {
            if (!isValidUUID(supplier_id)) {
                return res.status(400).json({ success: false, error: 'Invalid supplier ID' });
            }
            updateData.supplier_id = supplier_id;
        }
        if (notes !== undefined) {
            if (notes && (!isValidLength(notes, 0, 500) || !isSafeText(notes))) {
                return res.status(400).json({ success: false, error: 'Notes must be under 500 characters and contain no HTML or scripts' });
            }
            updateData.notes = notes ? sanitize(notes) : '';
        }

        // Validate items if provided
        let cleanItems = null;
        if (items && items.length > 0) {
            if (!isValidArrayLength(items, 100)) {
                return res.status(400).json({ success: false, error: 'Cannot have more than 100 items' });
            }
            for (const item of items) {
                if (!item.product_id || !isValidUUID(item.product_id)) {
                    return res.status(400).json({ success: false, error: 'Invalid product ID in items' });
                }
                if (!isValidQuantity(item.quantity)) {
                    return res.status(400).json({ success: false, error: 'Invalid quantity in items' });
                }
                if (!isValidAmount(item.cost_price)) {
                    return res.status(400).json({ success: false, error: 'Invalid cost price in items' });
                }
            }
            cleanItems = items.map(item => ({
                product_id: item.product_id,
                name: item.name || 'Product',
                quantity: item.quantity,
                cost_price: item.cost_price
            }));
        }

        // Apply non-item updates via a plain update (safe, single-field writes)
        if (Object.keys(updateData).length > 0) {
            updateData.updated_at = new Date();
            const { error: simpleErr } = await supabase
                .from('purchase_orders')
                .update(updateData)
                .eq('id', id)
                .eq('branch_id', branchId);
            if (simpleErr) throw simpleErr;
        }

        // Apply item updates atomically. This handles stock delta, item
        // replacement, total recalculation, and activity log in one transaction.
        if (cleanItems) {
            const { data: updated, error: rpcError } = await supabase.rpc('update_purchase_order_items_atomic', {
                p_po_id: id,
                p_branch_id: branchId,
                p_user_id: req.user.id,
                p_user_name: req.user.full_name,
                p_new_items: cleanItems
            });

            if (rpcError) {
                console.error('Update PO items RPC error:', rpcError);
                return res.status(500).json({
                    success: false,
                    error: rpcError.message || 'Failed to update purchase order items'
                });
            }

            // Fetch the final PO with items
            const { data: finalPO } = await supabase
                .from('purchase_orders')
                .select(`*, purchase_order_items (*)`)
                .eq('id', id)
                .eq('branch_id', branchId)
                .single();

            return res.status(200).json({
                success: true,
                message: existing.status === 'received'
                    ? 'Purchase order updated. Stock adjusted by the difference.'
                    : 'Purchase order updated successfully',
                data: finalPO
            });
        }

        // No items were changed — just fetch and return
        const { data: finalPO } = await supabase
            .from('purchase_orders')
            .select(`*, purchase_order_items (*)`)
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        return res.status(200).json({
            success: true,
            message: 'Purchase order updated successfully',
            data: finalPO
        });

    } catch (error) {
        console.error('Update PO error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update purchase order: ' + error.message });
    }
};

const deletePurchaseOrder = async (req, res) => {
    try {
        const branchId = await requireBranchId(req, res);
        if (!branchId) return;

        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid purchase order ID' });
        }

        const { data: po } = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (!po) {
            return res.status(404).json({ success: false, error: 'Purchase order not found' });
        }

        if (po.status === 'received') {
            return res.status(400).json({ success: false, error: 'Cannot delete a received purchase order' });
        }

        const { error } = await supabase
            .from('purchase_orders')
            .delete()
            .eq('id', id)
            .eq('branch_id', branchId);

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'Purchase order deleted successfully' });

    } catch (error) {
        console.error('Delete PO error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete purchase order' });
    }
};

module.exports = {
    getAllPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    receivePurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder
};