// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Users Controller
// ============================================================

const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const {
    isValidRole,
    isValidEmail,
    isValidPassword,
    isValidName,
    isValidPhone,
    sanitize
} = require('../utils/validators');

// ============================================================
// GET ALL USERS
// ============================================================

const getAllUsers = async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, full_name, email, phone, role, is_active, is_first_login, is_deleted, created_at')
            .order('full_name');

        if (error) throw error;

        const activeUsers = users.filter(u => !u.is_deleted);

        return res.status(200).json({
            success: true,
            data: activeUsers
        });

    } catch (error) {
        console.error('Get users error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
};

// ============================================================
// GET SINGLE USER
// ============================================================

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .select('id, full_name, email, phone, role, is_active, is_first_login, created_at')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            throw error;
        }

        return res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch user'
        });
    }
};

// ============================================================
// CREATE USER
// ============================================================

const createUser = async (req, res) => {
    try {
        const { full_name, email, phone, role, password } = req.body;

        // Validate
        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and password are required'
            });
        }

        if (!isValidName(full_name)) {
            return res.status(400).json({
                success: false,
                error: 'Full name must be between 2 and 100 characters'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters with at least 1 number'
            });
        }

        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format'
            });
        }

        if (role && !isValidRole(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role. Allowed: boss, manager, cashier, store_keeper, sales_rep'
            });
        }

        const cleanEmail = sanitize(email.toLowerCase().trim());

        // Check duplicate email
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', cleanEmail)
            .single();

        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Resolve valid creator ID
        let createdById = null;
        if (req.user && req.user.id) {
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('id', req.user.id)
                .single();

            if (user) {
                createdById = user.id;
            }
        }

        const userData = {
            full_name: sanitize(full_name.trim()),
            email: cleanEmail,
            phone: phone ? sanitize(phone.trim()) : '',
            role: role || 'cashier',
            password_hash: hashedPassword,
            is_first_login: true,
            is_active: true
        };

        if (createdById) userData.created_by = createdById;

        const { data: user, error } = await supabase
            .from('users')
            .insert(userData)
            .select('id, full_name, email, phone, role, is_active, is_first_login, created_at')
            .single();

        if (error) {
            console.error('Create user error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create user: ' + error.message
            });
        }

        await supabase
            .from('activity_logs')
            .insert({
                user_id: req.user?.id || null,
                user_name: req.user?.full_name || 'System',
                action: 'Staff Created',
                details: {
                    staff_id: user.id,
                    staff_name: user.full_name,
                    role: user.role
                }
            });

        return res.status(201).json({
            success: true,
            message: 'Staff created successfully',
            data: user
        });

    } catch (error) {
        console.error('Create user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create user: ' + error.message
        });
    }
};

// ============================================================
// UPDATE USER
// ============================================================

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, phone, role, is_active } = req.body;

        const { data: existing, error: checkError } = await supabase
            .from('users')
            .select('id, full_name, role')
            .eq('id', id)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Prevent deactivating self
        if (id === req.user.id && is_active === false) {
            return res.status(400).json({
                success: false,
                error: 'You cannot deactivate your own account'
            });
        }

        const updateData = {};

        if (full_name !== undefined) {
            if (!isValidName(full_name)) {
                return res.status(400).json({
                    success: false,
                    error: 'Full name must be between 2 and 100 characters'
                });
            }
            updateData.full_name = sanitize(full_name.trim());
        }

        if (phone !== undefined && phone !== '') {
            if (!isValidPhone(phone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid phone number format'
                });
            }
            updateData.phone = sanitize(phone.trim());
        } else if (phone === '') {
            updateData.phone = '';
        }

        if (is_active !== undefined) updateData.is_active = is_active;

        // Role change rules
        if (role !== undefined) {
            if (req.user.role !== 'boss') {
                return res.status(403).json({
                    success: false,
                    error: 'Only Boss can change user roles'
                });
            }

            if (id === req.user.id) {
                return res.status(400).json({
                    success: false,
                    error: 'You cannot change your own role'
                });
            }

            if (!isValidRole(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role. Allowed: boss, manager, cashier, store_keeper, sales_rep'
                });
            }

            // Prevent demoting the last Boss
            if (existing.role === 'boss' && role !== 'boss') {
                const { count, error: countError } = await supabase
                    .from('users')
                    .select('id', { count: 'exact', head: true })
                    .eq('role', 'boss')
                    .eq('is_deleted', false)
                    .eq('is_active', true);

                if (countError) {
                    console.error('Error counting bosses:', countError);
                } else if (count <= 1) {
                    return res.status(400).json({
                        success: false,
                        error: 'Cannot demote the only Boss account. Create another Boss first.'
                    });
                }
            }

            updateData.role = role;
        }

        updateData.updated_at = new Date();

        const { data: user, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select('id, full_name, email, phone, role, is_active, is_first_login, created_at')
            .single();

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Staff Updated',
                details: {
                    staff_id: id,
                    staff_name: user.full_name,
                    changes: updateData
                }
            });

        return res.status(200).json({
            success: true,
            message: 'Staff updated successfully',
            data: user
        });

    } catch (error) {
        console.error('Update user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
};

// ============================================================
// DELETE USER (soft delete)
// ============================================================

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: existing, error: checkError } = await supabase
            .from('users')
            .select('id, full_name, role')
            .eq('id', id)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'You cannot delete your own account'
            });
        }

        if (existing.role === 'boss') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete another Boss account'
            });
        }

        const { error } = await supabase
            .from('users')
            .update({
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: req.user.id,
                deletion_reason: 'Account deleted by admin'
            })
            .eq('id', id);

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Staff Deleted',
                details: {
                    staff_id: id,
                    staff_name: existing.full_name,
                    role: existing.role
                }
            });

        return res.status(200).json({
            success: true,
            message: 'Staff deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
};

// ============================================================
// RESET PASSWORD
// ============================================================

const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password || !isValidPassword(new_password)) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters with at least 1 number'
            });
        }

        const { data: existing, error: checkError } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('id', id)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 12);

        const { error } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                is_first_login: true,
                updated_at: new Date()
            })
            .eq('id', id);

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Staff Password Reset',
                details: {
                    staff_id: id,
                    staff_name: existing.full_name
                }
            });

        return res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to reset password'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    resetPassword
};