// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Purchase Orders Controller
// ============================================================

const supabase = require('../config/supabase');
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
            return res.status(400).json({
                success: false,
                error: 'Invalid status filter. Valid: ' + VALID_STATUSES.join(', ')
            });
        }

        let matchingPoIdsByNumber = null;
        let matchingSupplierIdsFromSearch = null;

        if (search && search.trim()) {
            const term = search.trim().replace(/[%_,()'"]/g, '');

            if (term) {
                const { data: byNumber, error: errA } = await supabase
                    .from('purchase_orders')
                    .select('id')
                    .ilike('po_number', `%${term}%`);

                if (errA) throw errA;
                matchingPoIdsByNumber = (byNumber || []).map(r => r.id);

                const { data: suppliers, error: errB } = await supabase
                    .from('suppliers')
                    .select('id')
                    .ilike('name', `%${term}%`);

                if (errB) throw errB;
                matchingSupplierIdsFromSearch = (suppliers || []).map(s => s.id);

                if (matchingPoIdsByNumber.length === 0 && matchingSupplierIdsFromSearch.length === 0) {
                    return res.status(200).json({
                        success: true,
                        data: [],
                        pagination: { total: 0, page: pageNum, limit: limitNum, pages: 0 }
                    });
                }
            }
        }

        let dataQuery = supabase.from('purchase_orders').select('*');

        if (status) dataQuery = dataQuery.eq('status', status);
        if (startDate) dataQuery = dataQuery.gte('created_at', new Date(startDate).toISOString());
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dataQuery = dataQuery.lte('created_at', end.toISOString());
        }

        if (matchingPoIdsByNumber !== null || matchingSupplierIdsFromSearch !== null) {
            const ids = new Set();
            (matchingPoIdsByNumber || []).forEach(id => ids.add(id));

            if (matchingSupplierIdsFromSearch && matchingSupplierIdsFromSearch.length > 0) {
                const { data: posBySupplier, error: supErr } = await supabase
                    .from('purchase_orders')
                    .select('id')
                    .in('supplier_id', matchingSupplierIdsFromSearch);
                if (supErr) throw supErr;
                (posBySupplier || []).forEach(r => ids.add(r.id));
            }

            const allIds = Array.from(ids);
            if (allIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: [],
                    pagination: { total: 0, page: pageNum, limit: limitNum, pages: 0 }
                });
            }
            dataQuery = dataQuery.in('id', allIds);
        }

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery
            .order('created_at', { ascending: false })
            .range(from, to);

        const { data: pos, error } = await dataQuery;
        if (error) throw error;

        let countQuery = supabase
            .from('purchase_orders')
            .select('id', { count: 'exact', head: true });

        if (status) countQuery = countQuery.eq('status', status);
        if (startDate) countQuery = countQuery.gte('created_at', new Date(startDate).toISOString());
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            countQuery = countQuery.lte('created_at', end.toISOString());
        }
        if (matchingPoIdsByNumber !== null || matchingSupplierIdsFromSearch !== null) {
            const ids = new Set();
            (matchingPoIdsByNumber || []).forEach(id => ids.add(id));
            if (matchingSupplierIdsFromSearch && matchingSupplierIdsFromSearch.length > 0) {
                const { data: posBySupplier, error: supErr } = await supabase
                    .from('purchase_orders')
                    .select('id')
                    .in('supplier_id', matchingSupplierIdsFromSearch);
                if (supErr) throw supErr;
                (posBySupplier || []).forEach(r => ids.add(r.id));
            }
            countQuery = countQuery.in('id', Array.from(ids));
        }

        const { count: totalCount, error: countError } = await countQuery;
        if (countError) throw countError;

        const supplierIds = [...new Set(pos.map(po => po.supplier_id).filter(id => id))];
        let supplierMap = {};

        if (supplierIds.length > 0) {
            const { data: suppliers } = await supabase
                .from('suppliers')
                .select('id, name')
                .in('id', supplierIds);

            if (suppliers) {
                supplierMap = suppliers.reduce((acc, s) => {
                    acc[s.id] = s.name;
                    return acc;
                }, {});
            }
        }

        const formatted = pos.map(po => ({
            ...po,
            supplier_name: supplierMap[po.supplier_id] || null,
            created_by_name: po.created_by_name || 'System'
        }));

        const total = totalCount || 0;
        const pages = Math.ceil(total / limitNum);

        return res.status(200).json({
            success: true,
            data: formatted,
            pagination: { total, page: pageNum, limit: limitNum, pages }
        });

    } catch (error) {
        console.error('Get purchase orders error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch purchase orders: ' + error.message
        });
    }
};

const getPurchaseOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid purchase order ID'
            });
        }

        const { data: po, error } = await supabase
            .from('purchase_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Purchase order not found'
                });
            }
            throw error;
        }

        let supplierName = null;
        if (po.supplier_id) {
            const { data: supplier } = await supabase
                .from('suppliers')
                .select('name')
                .eq('id', po.supplier_id)
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
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch purchase order: ' + error.message
        });
    }
};

const createPurchaseOrder = async (req, res) => {
    try {
        const { supplier_id, items, notes } = req.body;

        if (!supplier_id || !isValidUUID(supplier_id)) {
            return res.status(400).json({
                success: false,
                error: 'Valid supplier ID is required'
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
                error: 'Cannot have more than 100 items in a purchase order'
            });
        }

        // Validate each item and detect duplicates
        const seenProductIds = new Set();
        for (const item of items) {
            if (!item.product_id || !isValidUUID(item.product_id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid product ID in items'
                });
            }
            if (seenProductIds.has(item.product_id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Duplicate product in items. Each product can appear only once.'
                });
            }
            seenProductIds.add(item.product_id);

            if (!isValidQuantity(item.quantity)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid quantity in items'
                });
            }
            if (!isValidAmount(item.cost_price)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid cost price in items'
                });
            }
        }

        // Validate notes
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

        // Supplier must exist
        const { data: supplier, error: supplierError } = await supabase
            .from('suppliers')
            .select('id')
            .eq('id', supplier_id)
            .single();

        if (supplierError || !supplier) {
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
            });
        }

        // Resolve all products in one query. Reject any missing or inactive product.
        const productIds = items.map(i => i.product_id);
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, name, is_active')
            .in('id', productIds);

        if (productsError) {
            return res.status(500).json({
                success: false,
                error: 'Failed to look up products: ' + productsError.message
            });
        }

        const productMap = {};
        (products || []).forEach(p => { productMap[p.id] = p; });

        for (const item of items) {
            const product = productMap[item.product_id];
            if (!product) {
                return res.status(404).json({
                    success: false,
                    error: `Product not found for ID ${item.product_id}`
                });
            }
            if (product.is_active === false) {
                return res.status(400).json({
                    success: false,
                    error: `Product "${product.name}" is inactive and cannot be added to a purchase order`
                });
            }
        }

        // Build line items using the real product name from the DB
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

        // Insert header
        const { data: po, error } = await supabase
            .from('purchase_orders')
            .insert({
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
            return res.status(500).json({
                success: false,
                error: 'Failed to create purchase order: ' + error.message
            });
        }

        // Insert items
        const poItemsWithId = poItems.map(item => ({
            ...item,
            purchase_order_id: po.id
        }));

        const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(poItemsWithId);

        if (itemsError) {
            console.error('Create PO items error:', itemsError);
            // Roll back the header so we do not leave an orphan PO
            await supabase.from('purchase_orders').delete().eq('id', po.id);
            return res.status(500).json({
                success: false,
                error: 'Failed to create PO items: ' + itemsError.message
            });
        }

        // Activity log
        await supabase
            .from('activity_logs')
            .insert({
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
        return res.status(500).json({
            success: false,
            error: 'Failed to create purchase order: ' + error.message
        });
    }
};

const receivePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid purchase order ID'
            });
        }

        const { data: po, error: poError } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                purchase_order_items (*)
            `)
            .eq('id', id)
            .single();

        if (poError || !po) {
            return res.status(404).json({
                success: false,
                error: 'Purchase order not found'
            });
        }

        if (po.status === 'received') {
            return res.status(400).json({
                success: false,
                error: 'Purchase order already received'
            });
        }

        if (po.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                error: 'Cannot receive a cancelled purchase order'
            });
        }

        for (const item of po.purchase_order_items) {
            const { data: product } = await supabase
                .from('products')
                .select('id, stock_quantity, name')
                .eq('id', item.product_id)
                .single();

            if (!product) continue;

            const newStock = (product.stock_quantity || 0) + item.quantity;

            await supabase
                .from('products')
                .update({
                    stock_quantity: newStock,
                    updated_at: new Date()
                })
                .eq('id', item.product_id);

            await supabase
                .from('stock_movements')
                .insert({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    movement_type: 'PURCHASE',
                    reference_id: po.id,
                    reference_number: po.po_number,
                    created_by: req.user.id,
                    reason: 'Purchase order received'
                });
        }

        const { data: updated, error: updateError } = await supabase
            .from('purchase_orders')
            .update({
                status: 'received',
                delivery_date: new Date().toISOString().split('T')[0],
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
                action: 'Purchase Order Received',
                order_number: po.po_number,
                details: { supplier_id: po.supplier_id, items: po.purchase_order_items.length }
            });

        return res.status(200).json({
            success: true,
            message: 'Purchase order received successfully',
            data: updated
        });

    } catch (error) {
        console.error('Receive PO error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to receive purchase order: ' + error.message
        });
    }
};

// ============================================================
// UPDATE PURCHASE ORDER
// Editable at any status except cancelled.
// If the PO is received, item changes adjust product stock by the
// difference and write ADJUSTMENT stock movements.
// ============================================================
const updatePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { supplier_id, items, notes } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid purchase order ID'
            });
        }

        // Load existing PO with items
        const { data: existing, error: checkError } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                purchase_order_items (*)
            `)
            .eq('id', id)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({
                success: false,
                error: 'Purchase order not found'
            });
        }

        if (existing.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                error: 'Cannot update a cancelled purchase order'
            });
        }

        const wasReceived = existing.status === 'received';

        // Validate header fields
        const updateData = {};

        if (supplier_id !== undefined) {
            if (!isValidUUID(supplier_id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid supplier ID'
                });
            }
            updateData.supplier_id = supplier_id;
        }

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

        updateData.updated_at = new Date();

        // Validate new items if provided
        if (items && items.length > 0) {
            if (!isValidArrayLength(items, 100)) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot have more than 100 items in a purchase order'
                });
            }

            for (const item of items) {
                if (!item.product_id || !isValidUUID(item.product_id)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid product ID in items'
                    });
                }
                if (!isValidQuantity(item.quantity)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid quantity in items'
                    });
                }
                if (!isValidAmount(item.cost_price)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid cost price in items'
                    });
                }
            }
        }

        // Update header
        const { error: poError } = await supabase
            .from('purchase_orders')
            .update(updateData)
            .eq('id', id);

        if (poError) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update purchase order: ' + poError.message
            });
        }

        // Update items if provided
        if (items && items.length > 0) {
            // If the PO was received, adjust product stock by the delta
            // between the old items and the new items.
            if (wasReceived) {
                // Build a quantity map of old items by product_id
                const oldQty = {};
                (existing.purchase_order_items || []).forEach(i => {
                    oldQty[i.product_id] = (oldQty[i.product_id] || 0) + i.quantity;
                });

                // Build a quantity map of new items by product_id
                const newQty = {};
                items.forEach(i => {
                    newQty[i.product_id] = (newQty[i.product_id] || 0) + i.quantity;
                });

                // All product IDs touched
                const allProductIds = new Set([
                    ...Object.keys(oldQty),
                    ...Object.keys(newQty)
                ]);

                // Apply stock deltas and write ADJUSTMENT movements
                for (const productId of allProductIds) {
                    const before = oldQty[productId] || 0;
                    const after = newQty[productId] || 0;
                    const delta = after - before;

                    if (delta === 0) continue;

                    const { data: product, error: productErr } = await supabase
                        .from('products')
                        .select('id, stock_quantity, name')
                        .eq('id', productId)
                        .single();

                    if (productErr || !product) continue;

                    const newStock = (product.stock_quantity || 0) + delta;

                    if (newStock < 0) {
                        return res.status(400).json({
                            success: false,
                            error: `Cannot reduce stock below zero for ${product.name}`
                        });
                    }

                    await supabase
                        .from('products')
                        .update({
                            stock_quantity: newStock,
                            updated_at: new Date()
                        })
                        .eq('id', productId);

                    const reasonText = delta > 0
                        ? `Purchase order edit: added ${delta}`
                        : `Purchase order edit: removed ${Math.abs(delta)}`;

                    await supabase
                        .from('stock_movements')
                        .insert({
                            product_id: productId,
                            quantity: delta,
                            movement_type: 'ADJUSTMENT',
                            reference_id: existing.id,
                            reference_number: existing.po_number,
                            created_by: req.user.id,
                            reason: reasonText
                        });
                }
            }

            // Replace items: delete old, insert new
            await supabase
                .from('purchase_order_items')
                .delete()
                .eq('purchase_order_id', id);

            const newItems = items.map(item => ({
                purchase_order_id: id,
                product_id: item.product_id,
                product_name: item.name || 'Product',
                quantity: item.quantity,
                cost_price: item.cost_price,
                subtotal: item.cost_price * item.quantity
            }));

            const { error: insertError } = await supabase
                .from('purchase_order_items')
                .insert(newItems);

            if (insertError) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to update PO items: ' + insertError.message
                });
            }

            // Recompute total
            const total = newItems.reduce((sum, item) => sum + item.subtotal, 0);
            await supabase
                .from('purchase_orders')
                .update({ total_amount: total })
                .eq('id', id);
        }

        // Log the update
        await supabase
            .from('activity_logs')
            .insert({
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Purchase Order Updated',
                order_number: existing.po_number,
                details: {
                    status: existing.status,
                    stock_adjusted: wasReceived && items && items.length > 0,
                    supplier_id: updateData.supplier_id || existing.supplier_id
                }
            });

        // Return the fresh PO with items
        const { data: finalPO } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                purchase_order_items (*)
            `)
            .eq('id', id)
            .single();

        return res.status(200).json({
            success: true,
            message: wasReceived
                ? 'Purchase order updated. Stock adjusted by the difference.'
                : 'Purchase order updated successfully',
            data: finalPO
        });

    } catch (error) {
        console.error('Update PO error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update purchase order: ' + error.message
        });
    }
};

const deletePurchaseOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid purchase order ID'
            });
        }

        const { data: po, error: checkError } = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', id)
            .single();

        if (checkError || !po) {
            return res.status(404).json({
                success: false,
                error: 'Purchase order not found'
            });
        }

        if (po.status === 'received') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete a received purchase order'
            });
        }

        const { error } = await supabase
            .from('purchase_orders')
            .delete()
            .eq('id', id);

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Purchase order not found'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: 'Purchase order deleted successfully'
        });

    } catch (error) {
        console.error('Delete PO error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete purchase order'
        });
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