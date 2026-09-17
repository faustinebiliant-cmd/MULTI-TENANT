// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Auth Controller
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const {
    isValidEmail,
    isValidPassword,
    isValidPhone,
    isValidName,
    isSafeText,
    sanitize
} = require('../utils/validators');

// ============================================================
// Helper: load businesses + branches for a Boss
// ============================================================
const loadBusinessesForBoss = async (bossId) => {
    const { data: businesses, error } = await supabase
        .from('businesses')
        .select(`
            id, name, shop_name, location, phone, email,
            currency, tin, vrn, vat_enabled, vat_rate,
            expense_categories, is_active, business_code,
            branches (id, name, location, phone, email, is_active)
        `)
        .eq('owner_id', bossId)
        .eq('is_active', true)
        .order('name');

    if (error) throw error;
    return businesses || [];
};

// ============================================================
// LOGIN
// ============================================================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
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

        const cleanEmail = sanitize(email.toLowerCase().trim());
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', cleanEmail)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated. Please contact the administrator.'
            });
        }

        if (user.is_deleted) {
            return res.status(401).json({
                success: false,
                error: 'Account has been deleted.'
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const is_boss = user.role === 'boss';

        if (!is_boss) {
            if (!user.business_id || !user.branch_id) {
                return res.status(403).json({
                    success: false,
                    error: 'Your account is not assigned to a branch. Contact the administrator.'
                });
            }
        }

        const tokenPayload = {
           id: user.id,
           email: user.email,
           full_name: user.full_name,
           role: user.role,
           is_boss,
           is_first_login: user.is_first_login,
           account_code: user.account_code
        };

        // Staff tokens carry their branch scope inside the JWT
        if (!is_boss) {
            tokenPayload.business_id = user.business_id;
            tokenPayload.branch_id = user.branch_id;
        }

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        // Load businesses list for Boss (empty array for staff)
        let businesses = [];
        if (is_boss) {
            businesses = await loadBusinessesForBoss(user.id);
        }

        // Record login activity with branch if present
        await supabase
            .from('activity_logs')
            .insert({
                branch_id: is_boss ? null : user.branch_id,
                user_id: user.id,
                user_name: user.full_name,
                action: 'Login',
                details: { email: user.email },
                ip_address: ip
            });

        const { password_hash, ...userData } = user;

        return res.status(200).json({
            success: true,
            token,
            user: {
                ...userData,
                is_first_login: user.is_first_login,
                is_boss
            },
            businesses
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred during login'
        });
    }
};

// ============================================================
// GET CURRENT USER
// ============================================================
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: user, error } = await supabase
            .from('users')
            .select('id, full_name, email, phone, role, business_id, branch_id, is_active, is_first_login, account_code, created_at')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const is_boss = user.role === 'boss';

        let businesses = [];
        if (is_boss) {
            businesses = await loadBusinessesForBoss(user.id);
        }

        return res.status(200).json({
            success: true,
            user: {
                ...user,
                is_boss
            },
            businesses
        });

    } catch (error) {
        console.error('Get current user error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred'
        });
    }
};

// ============================================================
// UPDATE PROFILE
// ============================================================
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, phone } = req.body;

        const updates = {};

        if (full_name !== undefined) {
            if (!isValidName(full_name) || !isSafeText(full_name)) {
                return res.status(400).json({
                    success: false,
                    error: 'Full name must be between 2 and 20 characters and contain no HTML or scripts'
                });
            }
            updates.full_name = sanitize(full_name.trim());
        }

        if (phone !== undefined && phone !== '') {
            if (!isValidPhone(phone) || !isSafeText(phone)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid phone number format'
                });
            }
            updates.phone = sanitize(phone.trim());
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nothing to update'
            });
        }

        updates.updated_at = new Date();

        const { data: user, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select('id, full_name, email, phone, role, business_id, branch_id, is_active, is_first_login, created_at')
            .single();

        if (error) throw error;

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: req.scope?.branch_id || null,
                user_id: userId,
                user_name: user.full_name,
                action: 'Profile Updated',
                details: updates
            });

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user
        });

    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
};

// ============================================================
// CHANGE PASSWORD
// ============================================================
const changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }

        if (!isValidPassword(new_password)) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters with at least 1 number'
            });
        }

        if (new_password === current_password) {
            return res.status(400).json({
                success: false,
                error: 'New password cannot be the same as the current password'
            });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const passwordMatch = await bcrypt.compare(current_password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 12);

        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                is_first_login: false,
                updated_at: new Date()
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        await supabase
            .from('activity_logs')
            .insert({
                branch_id: req.scope?.branch_id || null,
                user_id: userId,
                user_name: user.full_name,
                action: 'Password Changed',
                ip_address: req.ip || req.connection.remoteAddress
            });

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while changing password'
        });
    }
};

// ============================================================
// LOGOUT
// ============================================================
const logout = async (req, res) => {
    try {
        if (req.user) {
            await supabase
                .from('activity_logs')
                .insert({
                    branch_id: req.scope?.branch_id || null,
                    user_id: req.user.id,
                    user_name: req.user.full_name,
                    action: 'Logout',
                    ip_address: req.ip || req.connection.remoteAddress
                });
        }

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred during logout'
        });
    }
};

module.exports = {
    login,
    getCurrentUser,
    updateProfile,
    changePassword,
    logout
};