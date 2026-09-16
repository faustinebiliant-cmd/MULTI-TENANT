// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Users Controller
// Branch-scoped. Boss can assign business + branch to staff.
// ============================================================

const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const {
    isValidRole,
    isValidEmail,
    isValidPassword,
    isValidName,
    isValidPhone,
    isValidUUID,
    isSafeText,
    sanitize
} = require('../utils/validators');

// ============================================================
// LIST USERS
// Boss sees all staff in the active business (across its branches).
// Manager/etc sees only their own branch's staff.
// ============================================================
const getAllUsers = async (req, res) => {
    try {
        const isBoss = req.user.is_boss === true;
        const branchId = req.scope?.branch_id;
        const businessId = req.scope?.business_id;

        let query = supabase
            .from('users')
            .select('id, full_name, email, phone, role, business_id, branch_id, is_active, is_first_login, is_deleted, created_at')
            .eq('is_deleted', false);

        if (isBoss && businessId) {
            // Boss: all staff of this business
            query = query.eq('business_id', businessId);
        } else if (!isBoss && branchId) {
            // Staff: only their own branch
            query = query.eq('branch_id', branchId);
        } else {
            return res.status(400).json({
                success: false,
                error: 'No active business or branch selected'
            });
        }

        const { data: users, error } = await query.order('full_name');
        if (error) throw error;

        return res.status(200).json({ success: true, data: users || [] });

    } catch (error) {
        console.error('Get users error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
};

// ============================================================
// GET ONE USER
// ============================================================
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('id, full_name, email, phone, role, business_id, branch_id, is_active, is_first_login, created_at')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'User not found' });
            }
            throw error;
        }

        // Non-Boss can only view users in their own branch
        if (!req.user.is_boss && user.branch_id !== req.scope?.branch_id) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        return res.status(200).json({ success: true, data: user });

    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
};

// ============================================================
// CREATE USER
// Boss assigns business + branch. Staff get the same business
// as the Boss, and the branch the Boss picked.
// ============================================================
const createUser = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({ success: false, error: 'Only the Boss can create staff' });
        }

        const { full_name, email, phone, role, password, branch_id } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and password are required'
            });
        }

        if (!isValidName(full_name) || !isSafeText(full_name)) {
            return res.status(400).json({
                success: false,
                error: 'Full name must be between 2 and 20 characters with no invalid content'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ success: false, error: 'Invalid email format' });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters with at least 1 number'
            });
        }

        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({ success: false, error: 'Invalid phone number format' });
        }

        if (!isValidRole(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role. Allowed: boss, manager, cashier, store_keeper, sales_rep'
            });
        }

        if (role === 'boss') {
            return res.status(400).json({
                success: false,
                error: 'Cannot create another Boss account through this endpoint'
            });
        }

        if (!branch_id || !isValidUUID(branch_id)) {
            return res.status(400).json({
                success: false,
                error: 'A valid branch_id is required to create staff'
            });
        }

        const businessId = req.scope?.business_id;
        if (!businessId) {
            return res.status(400).json({ success: false, error: 'No active business selected' });
        }

        // Confirm branch belongs to this business
        const { data: branch } = await supabase
            .from('branches')
            .select('id, business_id, is_active')
            .eq('id', branch_id)
            .single();

        if (!branch || branch.business_id !== businessId) {
            return res.status(400).json({ success: false, error: 'Branch does not belong to the active business' });
        }

        if (!branch.is_active) {
            return res.status(400).json({ success: false, error: 'Branch is inactive' });
        }

        const cleanEmail = sanitize(email.toLowerCase().trim());

        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', cleanEmail)
            .single();

        if (existing) {
            return res.status(400).json({ success: false, error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const userData = {
            full_name: sanitize(full_name.trim()),
            email: cleanEmail,
            phone: phone ? sanitize(phone.trim()) : '',
            role,
            business_id: businessId,
            branch_id,
            password_hash: hashedPassword,
            is_first_login: true,
            is_active: true,
            created_by: req.user.id
        };

        const { data: user, error } = await supabase
            .from('users')
            .insert(userData)
            .select('id, full_name, email, phone, role, business_id, branch_id, is_active, is_first_login, created_at')
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
                branch_id,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Staff Created',
                details: { staff_id: user.id, staff_name: user.full_name, role: user.role }
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
        if (!req.user.is_boss) {
            return res.status(403).json({ success: false, error: 'Only the Boss can update staff' });
        }

        const { id } = req.params;
        const { full_name, phone, role, is_active, branch_id } = req.body;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }

        const { data: existing, error: checkError } = await supabase
            .from('users')
            .select('id, full_name, role, business_id, branch_id')
            .eq('id', id)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Boss can only edit staff within his active business
        if (existing.business_id !== req.scope?.business_id) {
            return res.status(403).json({ success: false, error: 'User belongs to a different business' });
        }

        if (id === req.user.id && is_active === false) {
            return res.status(400).json({ success: false, error: 'You cannot deactivate your own account' });
        }

        const updateData = {};

        if (full_name !== undefined) {
            if (!isValidName(full_name) || !isSafeText(full_name)) {
                return res.status(400).json({
                    success: false,
                    error: 'Full name must be between 2 and 20 characters with no invalid content'
                });
            }
            updateData.full_name = sanitize(full_name.trim());
        }

        if (phone !== undefined && phone !== '') {
            if (!isValidPhone(phone)) {
                return res.status(400).json({ success: false, error: 'Invalid phone number format' });
            }
            updateData.phone = sanitize(phone.trim());
        } else if (phone === '') {
            updateData.phone = '';
        }

        if (is_active !== undefined) updateData.is_active = is_active;

        if (role !== undefined) {
            if (!isValidRole(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role. Allowed: boss, manager, cashier, store_keeper, sales_rep'
                });
            }

            if (id === req.user.id) {
                return res.status(400).json({ success: false, error: 'You cannot change your own role' });
            }

            if (role === 'boss') {
                return res.status(400).json({ success: false, error: 'Cannot promote to Boss through this endpoint' });
            }

            updateData.role = role;
        }

        if (branch_id !== undefined) {
            if (!isValidUUID(branch_id)) {
                return res.status(400).json({ success: false, error: 'Invalid branch ID' });
            }

            const { data: branch } = await supabase
                .from('branches')
                .select('id, business_id')
                .eq('id', branch_id)
                .single();

            if (!branch || branch.business_id !== req.scope?.business_id) {
                return res.status(400).json({ success: false, error: 'Branch does not belong to the active business' });
            }

            updateData.branch_id = branch_id;
        }

        updateData.updated_at = new Date();

        const { data: user, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select('id, full_name, email, phone, role, business_id, branch_id, is_active, is_first_login, created_at')
            .single();

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: user.branch_id,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Staff Updated',
                details: { staff_id: id, staff_name: user.full_name, changes: updateData }
            });

        return res.status(200).json({
            success: true,
            message: 'Staff updated successfully',
            data: user
        });

    } catch (error) {
        console.error('Update user error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update user' });
    }
};

// ============================================================
// DELETE USER (soft delete)
// ============================================================
const deleteUser = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({ success: false, error: 'Only the Boss can delete staff' });
        }

        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID' });
        }

        const { data: existing, error: checkError } = await supabase
            .from('users')
            .select('id, full_name, role, business_id')
            .eq('id', id)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (id === req.user.id) {
            return res.status(400).json({ success: false, error: 'You cannot delete your own account' });
        }

        if (existing.role === 'boss') {
            return res.status(400).json({ success: false, error: 'Cannot delete another Boss account' });
        }

        if (existing.business_id !== req.scope?.business_id) {
            return res.status(403).json({ success: false, error: 'User belongs to a different business' });
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
                branch_id: req.scope?.branch_id || null,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Staff Deleted',
                details: { staff_id: id, staff_name: existing.full_name, role: existing.role }
            });

        return res.status(200).json({ success: true, message: 'Staff deleted successfully' });

    } catch (error) {
        console.error('Delete user error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
};

// ============================================================
// RESET PASSWORD
// ============================================================
const resetPassword = async (req, res) => {
    try {
        if (!req.user.is_boss) {
            return res.status(403).json({ success: false, error: 'Only the Boss can reset passwords' });
        }

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
            .select('id, full_name, business_id, branch_id')
            .eq('id', id)
            .single();

        if (checkError || !existing) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (existing.business_id !== req.scope?.business_id) {
            return res.status(403).json({ success: false, error: 'User belongs to a different business' });
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
                branch_id: existing.branch_id,
                user_id: req.user.id,
                user_name: req.user.full_name,
                action: 'Staff Password Reset',
                details: { staff_id: id, staff_name: existing.full_name }
            });

        return res.status(200).json({ success: true, message: 'Password reset successfully' });

    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ success: false, error: 'Failed to reset password' });
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