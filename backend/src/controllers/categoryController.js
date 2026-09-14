// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Categories Controller (UPDATED)
// ============================================================

const supabase = require('../config/supabase');
const {
    isValidName,
    isValidLength,
    isSafeText,
    sanitize
} = require('../utils/validators');

// ============================================================
// GET ALL CATEGORIES WITH PRODUCT COUNT
// ============================================================

const getAllCategories = async (req, res) => {
    try {
        // Get all categories
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;

        // ✅ Get product count for each category
        const categoriesWithCount = await Promise.all(categories.map(async (category) => {
            const { count, error: countError } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('category_id', category.id)
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
// CREATE CATEGORY - WITH IMPROVED VALIDATION
// ============================================================

const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        // ✅ VALIDATE NAME
        if (!name || !isValidName(name)) {
            return res.status(400).json({
                success: false,
                error: 'Category name must be at least 2 characters'
            });
        }

        // ✅ IMPROVED: VALIDATE DESCRIPTION
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

        // ✅ SANITIZE NAME
        const cleanName = sanitize(name.trim());

        const { data, error } = await supabase
            .from('categories')
            .insert({ 
                name: cleanName, 
                description: cleanDescription 
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    error: 'Category already exists'
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
// UPDATE CATEGORY - WITH IMPROVED VALIDATION
// ============================================================

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        // ✅ Check if category exists
        const { data: existing, error: checkError } = await supabase
            .from('categories')
            .select('id')
            .eq('id', id)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        const updateData = {};

        // ✅ VALIDATE AND SANITIZE NAME
        if (name !== undefined) {
            if (!isValidName(name)) {
                return res.status(400).json({
                    success: false,
                    error: 'Category name must be at least 2 characters'
                });
            }
            updateData.name = sanitize(name.trim());
        }

        // ✅ IMPROVED: VALIDATE DESCRIPTION
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

        const { data, error } = await supabase
            .from('categories')
            .update({
                ...updateData,
                updated_at: new Date()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Category not found'
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
// DELETE CATEGORY
// ============================================================

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

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