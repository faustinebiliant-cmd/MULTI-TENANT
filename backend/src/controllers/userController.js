// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Users Controller (UPDATED)
// ============================================================

const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { isValidRole } = require('../utils/validators');

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
// CREATE USER - FIXED
// ============================================================

const createUser = async (req, res) => {
    try {
        const { full_name, email, phone, role, password } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and password are required'
            });
        }

        const { data: existing, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Get valid user ID
        let createdById = null;
        if (req.user && req.user.id) {
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('id', req.user.id)
                .single();

            if (!userError && user) {
                createdById = user.id;
            } else {
                const { data: boss } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', 'faustinebiliant@gmail.com')
                    .single();
                if (boss) {
                    createdById = boss.id;
                }
            }
        }

        const userData = {
            full_name,
            email,
            phone: phone || '',
            role: role || 'cashier',
            password_hash: hashedPassword,
            is_first_login: true,
            is_active: true
        };

        if (createdById) {
            userData.created_by = createdById;
        }

        const { data: user, error } = await supabase
            .from('users')
            .insert(userData)
            .select()
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
// UPDATE USER - WITH ROLE VALIDATION
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

        // ✅ SECURITY: Prevent deactivating self
        if (id === req.user.id && is_active === false) {
            return res.status(400).json({
                success: false,
                error: 'You cannot deactivate your own account'
            });
        }

        const updateData = {};
        if (full_name !== undefined) updateData.full_name = full_name;
        if (phone !== undefined) updateData.phone = phone;
        if (is_active !== undefined) updateData.is_active = is_active;

        // ✅ SECURITY: Role change validation
        if (role !== undefined) {
            // 1. Only Boss can change roles
            if (req.user.role !== 'boss') {
                return res.status(403).json({
                    success: false,
                    error: 'Only Boss can change user roles'
                });
            }

            // 2. Prevent changing your own role
            if (id === req.user.id) {
                return res.status(400).json({
                    success: false,
                    error: 'You cannot change your own role'
                });
            }

            // 3. Validate the role is allowed
            if (!isValidRole(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role. Allowed: boss, manager, cashier, store_keeper, sales_rep'
                });
            }

            // 4. Prevent changing the last Boss account
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

        const { data: user, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
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
// DELETE USER
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

        // ✅ SECURITY: Prevent deleting self
        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'You cannot delete your own account'
            });
        }

        // ✅ SECURITY: Prevent deleting Boss accounts
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

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters'
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