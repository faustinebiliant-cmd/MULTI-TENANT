// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Products Controller
// ============================================================

const supabase = require('../config/supabase');
const {
    isValidName,
    isValidAmount,
    isValidQuantity,
    isValidUUID,
    isValidLength,
    isSafeText,
    sanitize
} = require('../utils/validators');

const updateCategoryProductCount = async (categoryId) => {
    try {
        if (!categoryId) return 0;

        const { count, error } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', categoryId)
            .eq('is_active', true);

        if (error) throw error;

        await supabase
            .from('categories')
            .update({
                product_count: count || 0,
                updated_at: new Date()
            })
            .eq('id', categoryId);

        return count || 0;
    } catch (error) {
        console.error('Update category count error:', error);
        return 0;
    }
};

const getAllProducts = async (req, res) => {
    try {
        let { page = 1, limit = 50, search, category_id } = req.query;

        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({ success: false, error: 'Page must be a positive number' });
        }

        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
            return res.status(400).json({ success: false, error: 'Limit must be between 1 and 200' });
        }

        if (category_id && !isValidUUID(category_id)) {
            return res.status(400).json({ success: false, error: 'Invalid category ID' });
        }

        const cleanSearch = search && search.trim()
            ? search.trim().replace(/[%_,()'"]/g, '')
            : null;

        let dataQuery = supabase
            .from('products')
            .select(`
                *,
                categories:category_id (name),
                suppliers:supplier_id (name)
            `)
            .eq('is_active', true);

        if (cleanSearch) {
            dataQuery = dataQuery.or(
                `name.ilike.%${cleanSearch}%,sku.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`
            );
        }
        if (category_id) {
            dataQuery = dataQuery.eq('category_id', category_id);
        }

        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;
        dataQuery = dataQuery.order('name').range(from, to);

        const totalsPromise = supabase.rpc('sum_products_totals', {
            search_term: cleanSearch || null,
            category_filter: category_id || null
        });

        let countQuery = supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true);

        if (cleanSearch) {
            countQuery = countQuery.or(
                `name.ilike.%${cleanSearch}%,sku.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`
            );
        }
        if (category_id) {
            countQuery = countQuery.eq('category_id', category_id);
        }

        const [
            { data: products, error },
            { data: totalsData, error: totalsError },
            { count: totalCount, error: countError }
        ] = await Promise.all([
            dataQuery,
            totalsPromise,
            countQuery
        ]);

        if (error) throw error;
        if (totalsError) throw totalsError;
        if (countError) throw countError;

        const formattedProducts = products.map(product => ({
            ...product,
            category_name: product.categories?.name || null,
            supplier_name: product.suppliers?.name || null
        }));

        const total = totalCount || 0;
        const pages = Math.ceil(total / limitNum);

        const totalsRow = totalsData?.[0] || {
            total_inventory_value: 0,
            total_cost_value: 0,
            total_product_count: 0
        };

        const inventoryValue = Number(totalsRow.total_inventory_value) || 0;
        const costValue = Number(totalsRow.total_cost_value) || 0;

        const totals = {
            inventoryValue,
            costValue,
            profitPotential: inventoryValue - costValue,
            productCount: Number(totalsRow.total_product_count) || 0
        };

        return res.status(200).json({
            success: true,
            data: formattedProducts,
            pagination: { total, page: pageNum, limit: limitNum, pages },
            totals
        });

    } catch (error) {
        console.error('Get products error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch products'
        });
    }
};

const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID'
            });
        }

        const { data: product, error } = await supabase
            .from('products')
            .select(`
                *,
                categories:category_id (id, name),
                suppliers:supplier_id (id, name)
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            data: {
                ...product,
                category_name: product.categories?.name || null,
                supplier_name: product.suppliers?.name || null
            }
        });

    } catch (error) {
        console.error('Get product error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch product'
        });
    }
};

const createProduct = async (req, res) => {
    try {
        const {
            name,
            description,
            category_id,
            sku,
            cost_price,
            selling_price,
            stock_quantity,
            low_stock_threshold,
            supplier_id
        } = req.body;

        if (!isValidName(name)) {
            return res.status(400).json({
                success: false,
                error: 'Product name must be at least 2 characters'
            });
        }

        let cleanDescription = '';
        if (description) {
            if (!isValidLength(description, 0, 1000)) {
                return res.status(400).json({
                    success: false,
                    error: 'Description must be less than 1000 characters'
                });
            }
            if (!isSafeText(description)) {
                return res.status(400).json({
                    success: false,
                    error: 'Description contains invalid content'
                });
            }
            cleanDescription = sanitize(description);
        }

        if (!isValidAmount(cost_price)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid cost price'
            });
        }

        if (!isValidAmount(selling_price)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid selling price'
            });
        }

        if (stock_quantity !== undefined && !isValidQuantity(stock_quantity)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid stock quantity'
            });
        }

        if (category_id && !isValidUUID(category_id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid category ID'
            });
        }

        if (supplier_id && !isValidUUID(supplier_id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid supplier ID'
            });
        }

        const cleanName = sanitize(name.trim());
        const cleanSku = sku ? sanitize(sku) : null;

        if (cleanSku) {
            const { data: existing } = await supabase
                .from('products')
                .select('id')
                .eq('sku', cleanSku)
                .single();

            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'Product with this SKU already exists'
                });
            }
        }

        const { data: product, error } = await supabase
            .from('products')
            .insert({
                name: cleanName,
                description: cleanDescription,
                category_id: category_id || null,
                sku: cleanSku,
                cost_price: parseFloat(cost_price),
                selling_price: parseFloat(selling_price),
                stock_quantity: parseInt(stock_quantity) || 0,
                low_stock_threshold: parseInt(low_stock_threshold) || 5,
                supplier_id: supplier_id || null,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        if (product.category_id) {
            await updateCategoryProductCount(product.category_id);
        }

        if (parseInt(stock_quantity) > 0) {
            await supabase
                .from('stock_movements')
                .insert({
                    product_id: product.id,
                    quantity: parseInt(stock_quantity),
                    movement_type: 'ADJUSTMENT',
                    reference_id: product.id,
                    reference_number: product.sku || null,
                    created_by: req.user.id,
                    reason: 'Initial stock'
                });
        }

        await supabase
            .from('activity_logs')
            .insert({
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Product Created',
                details: { product_id: product.id, name: product.name }
            });

        return res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });

    } catch (error) {
        console.error('Create product error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create product'
        });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID'
            });
        }

        if (updates.name) {
            if (!isValidName(updates.name)) {
                return res.status(400).json({
                    success: false,
                    error: 'Product name must be at least 2 characters'
                });
            }
            updates.name = sanitize(updates.name);
        }

        if (updates.description) {
            if (!isValidLength(updates.description, 0, 1000)) {
                return res.status(400).json({
                    success: false,
                    error: 'Description must be less than 1000 characters'
                });
            }
            if (!isSafeText(updates.description)) {
                return res.status(400).json({
                    success: false,
                    error: 'Description contains invalid content'
                });
            }
            updates.description = sanitize(updates.description);
        }

        if (updates.cost_price && !isValidAmount(updates.cost_price)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid cost price'
            });
        }

        if (updates.selling_price && !isValidAmount(updates.selling_price)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid selling price'
            });
        }

        if (updates.stock_quantity !== undefined && !isValidQuantity(updates.stock_quantity)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid stock quantity'
            });
        }

        if (updates.sku) updates.sku = sanitize(updates.sku);

        const { data: oldProduct, error: oldError } = await supabase
            .from('products')
            .select('category_id, stock_quantity')
            .eq('id', id)
            .single();

        if (oldError) throw oldError;

        const { data: product, error } = await supabase
            .from('products')
            .update({
                ...updates,
                updated_at: new Date()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Product not found'
                });
            }
            throw error;
        }

        if (oldProduct.category_id) {
            await updateCategoryProductCount(oldProduct.category_id);
        }
        if (product.category_id && product.category_id !== oldProduct.category_id) {
            await updateCategoryProductCount(product.category_id);
        }

        if (updates.stock_quantity && updates.stock_quantity !== oldProduct.stock_quantity) {
            const stockDiff = parseInt(updates.stock_quantity) - oldProduct.stock_quantity;

            await supabase
                .from('stock_movements')
                .insert({
                    product_id: id,
                    quantity: stockDiff,
                    movement_type: 'ADJUSTMENT',
                    reference_id: id,
                    reference_number: product.sku || null,
                    created_by: req.user.id,
                    reason: 'Stock updated'
                });
        }

        await supabase
            .from('activity_logs')
            .insert({
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Product Updated',
                details: { product_id: id, name: product.name }
            });

        return res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });

    } catch (error) {
        console.error('Update product error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update product'
        });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID'
            });
        }

        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, name, category_id')
            .eq('id', id)
            .single();

        if (productError || !product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        const { error } = await supabase
            .from('products')
            .update({
                is_active: false,
                updated_at: new Date()
            })
            .eq('id', id);

        if (error) throw error;

        if (product.category_id) {
            await updateCategoryProductCount(product.category_id);
        }

        await supabase
            .from('activity_logs')
            .insert({
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Product Deleted',
                details: { product_id: id, name: product.name }
            });

        return res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('Delete product error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete product'
        });
    }
};

const adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, reason, type } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID'
            });
        }

        if (!isValidQuantity(quantity)) {
            return res.status(400).json({
                success: false,
                error: 'Valid quantity is required'
            });
        }

        if (!reason || !isValidLength(reason, 3, 200)) {
            return res.status(400).json({
                success: false,
                error: 'Reason is required (min 3 characters, max 200)'
            });
        }

        if (!isSafeText(reason)) {
            return res.status(400).json({
                success: false,
                error: 'Reason contains invalid content'
            });
        }

        if (!['add', 'remove'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Type must be "add" or "remove"'
            });
        }

        const cleanReason = sanitize(reason.trim());

        const { data: product, error: findError } = await supabase
            .from('products')
            .select('id, name, stock_quantity, sku')
            .eq('id', id)
            .single();

        if (findError || !product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        let newStock = product.stock_quantity;
        if (type === 'add') {
            newStock += parseInt(quantity);
        } else {
            if (newStock < quantity) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient stock'
                });
            }
            newStock -= parseInt(quantity);
        }

        const { data: updated, error } = await supabase
            .from('products')
            .update({
                stock_quantity: newStock,
                updated_at: new Date()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        const movementQuantity = type === 'add' ? parseInt(quantity) : -parseInt(quantity);

        await supabase
            .from('stock_movements')
            .insert({
                product_id: id,
                quantity: movementQuantity,
                movement_type: 'ADJUSTMENT',
                reference_id: id,
                reference_number: product.sku || null,
                created_by: req.user.id,
                reason: cleanReason
            });

        await supabase
            .from('activity_logs')
            .insert({
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Stock Adjusted',
                details: {
                    product_id: id,
                    product_name: product.name,
                    type,
                    quantity,
                    reason: cleanReason,
                    old_stock: product.stock_quantity,
                    new_stock: newStock
                }
            });

        return res.status(200).json({
            success: true,
            message: 'Stock adjusted successfully',
            data: updated
        });

    } catch (error) {
        console.error('Adjust stock error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to adjust stock'
        });
    }
};

const getLowStockProducts = async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, stock_quantity, low_stock_threshold')
            .eq('is_active', true)
            .order('stock_quantity');

        if (error) throw error;

        const lowStock = (products || []).filter(
            p => (p.stock_quantity || 0) <= (p.low_stock_threshold || 5)
        );

        return res.status(200).json({
            success: true,
            count: lowStock.length,
            data: lowStock
        });

    } catch (error) {
        console.error('Get low stock products error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch low stock products'
        });
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    getLowStockProducts
};