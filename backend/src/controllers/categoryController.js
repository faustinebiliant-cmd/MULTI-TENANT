// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Categories Controller
// Branch-scoped: every operation filters by req.scope.branch_id
// ============================================================

const supabase = require('../config/supabase');
const {
    isValidName,
    isValidLength,
    isValidUUID,
    isSafeText,
    sanitize
} = require('../utils/validators');

// ============================================================
// Resolve the branch for this request.
// Staff: comes from JWT via req.scope.
// Boss: comes from X-Branch-Id header (validated in middleware).
// Fallback: if Boss has no branch header but the business has
// exactly one branch, auto-use it. Keeps single-branch shops
// working without frontend changes.
// ============================================================
const resolveBranchId = async (req) => {
    if (req.scope?.branch_id) return req.scope.branch_id;

    if (req.user.is_boss && req.scope?.business_id) {
        const { data: branches } = await supabase
            .from('branches')
            .select('id')
            .eq('business_id', req.scope.business_id)
            .eq('is_active', true)
            .limit(2);

        if (branches && branches.length === 1) {
            return branches[0].id;
        }
    }

    return null;
};

// ============================================================
// GET all categories for the active branch
// ============================================================
const getAllCategories = async (req, res) => {
    try {
        const branchId = await resolveBranchId(req);
        if (!branchId) {
            return res.status(400).json({
                success: false,
                error: 'No active branch selected'
            });
        }

        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .eq('branch_id', branchId)
            .order('name');

        if (error) throw error;

        const categoriesWithCount = await Promise.all(categories.map(async (category) => {
            const { count, error: countError } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('category_id', category.id)
                .eq('branch_id', branchId)
                .eq('is_active', true);

            if (countError) {
                console.error('Count error for category:', category.name, countError);
                return { ...category, product_count: 0 };
            }

            return { ...category, product_count: count || 0 };
        }));

        return res.status(200).json({
            success: true,
            data: categoriesWithCount
        });

    } catch (error) {
        console.error('Get categories error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch categories'
        });
    }
};

// ============================================================
// CREATE category
// ============================================================
const createCategory = async (req, res) => {
    try {
        const branchId = await resolveBranchId(req);
        if (!branchId) {
            return res.status(400).json({
                success: false,
                error: 'No active branch selected'
            });
        }

        const { name, description } = req.body;

        if (!name || !isValidName(name) || !isSafeText(name)) {
            return res.status(400).json({
                success: false,
                error: 'Category name must be between 2 and 20 characters with no invalid content'
            });
        }

        let cleanDescription = '';
        if (description) {
            if (!isValidLength(description, 0, 500)) {
                return res.status(400).json({
                    success: false,
                    error: 'Description must be less than 500 characters'
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

        const cleanName = sanitize(name.trim());

        const { data, error } = await supabase
            .from('categories')
            .insert({
                branch_id: branchId,
                name: cleanName,
                description: cleanDescription
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    error: 'Category already exists in this branch'
                });
            }
            throw error;
        }

        return res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data
        });

    } catch (error) {
        console.error('Create category error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create category'
        });
    }
};

// ============================================================
// UPDATE category
// ============================================================
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid category ID'
            });
        }

        const branchId = await resolveBranchId(req);
        if (!branchId) {
            return res.status(400).json({
                success: false,
                error: 'No active branch selected'
            });
        }

        const { data: existing, error: checkError } = await supabase
            .from('categories')
            .select('id')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        const { name, description } = req.body;
        const updateData = {};

        if (name !== undefined) {
            if (!isValidName(name) || !isSafeText(name)) {
                return res.status(400).json({
                    success: false,
                    error: 'Category name must be between 2 and 20 characters with no invalid content'
                });
            }
            updateData.name = sanitize(name.trim());
        }

        if (description !== undefined) {
            if (description && !isValidLength(description, 0, 500)) {
                return res.status(400).json({
                    success: false,
                    error: 'Description must be less than 500 characters'
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

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nothing to update'
            });
        }

        const { data, error } = await supabase
            .from('categories')
            .update(updateData)
            .eq('id', id)
            .eq('branch_id', branchId)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Category not found'
                });
            }
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    error: 'Another category with this name already exists in this branch'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data
        });

    } catch (error) {
        console.error('Update category error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update category'
        });
    }
};

// ============================================================
// DELETE category
// ============================================================
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid category ID'
            });
        }

        const branchId = await resolveBranchId(req);
        if (!branchId) {
            return res.status(400).json({
                success: false,
                error: 'No active branch selected'
            });
        }

        const { data: category, error: checkError } = await supabase
            .from('categories')
            .select('id, name')
            .eq('id', id)
            .eq('branch_id', branchId)
            .single();

        if (checkError || !category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        const { count: activeCount, error: activeErr } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', id)
            .eq('branch_id', branchId)
            .eq('is_active', true);

        if (activeErr) throw activeErr;

        if ((activeCount || 0) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Category is in use by products'
            });
        }

        const { error: detachError } = await supabase
            .from('products')
            .update({ category_id: null })
            .eq('category_id', id)
            .eq('branch_id', branchId)
            .eq('is_active', false);

        if (detachError) throw detachError;

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)
            .eq('branch_id', branchId);

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Category not found'
                });
            }
            if (error.code === '23503') {
                return res.status(400).json({
                    success: false,
                    error: 'Category is in use by products'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });

    } catch (error) {
        console.error('Delete category error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete category'
        });
    }
};

module.exports = {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory
};