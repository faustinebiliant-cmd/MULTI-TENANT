// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Auth Controller (UPDATED)
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { isValidEmail, isValidPassword, sanitize } = require('../utils/validators');
require('dotenv').config();

// ✅ Track login attempts (simple in-memory, consider Redis for production)
const loginAttempts = new Map();

// ============================================================
// LOGIN - WITH IMPROVED SECURITY
// ============================================================

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // ✅ VALIDATE INPUT
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

        // ✅ SANITIZE INPUT
        const cleanEmail = sanitize(email.toLowerCase().trim());

        // ✅ Check login attempts (prevent brute force)
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const attemptsKey = `${ip}:${cleanEmail}`;
        const now = Date.now();
        const attempts = loginAttempts.get(attemptsKey) || { count: 0, firstAttempt: now };
        
        // Reset if more than 15 minutes have passed
        if (now - attempts.firstAttempt > 15 * 60 * 1000) {
            attempts.count = 0;
            attempts.firstAttempt = now;
        }

        // Block if too many attempts
        if (attempts.count >= 5) {
            return res.status(429).json({
                success: false,
                error: 'Too many login attempts. Please wait 15 minutes before trying again.'
            });
        }

        // Find user by email
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', cleanEmail)
            .single();

        if (error || !user) {
            // ✅ Increment failed attempts
            attempts.count++;
            loginAttempts.set(attemptsKey, attempts);
            
            // ✅ Generic message for security (don't reveal if user exists)
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check if account is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated. Please contact the administrator.'
            });
        }

        // Check if account is deleted
        if (user.is_deleted) {
            return res.status(401).json({
                success: false,
                error: 'Account has been deleted.'
            });
        }

        // Verify password
        const isValidPasswordMatch = await bcrypt.compare(password, user.password_hash);

        if (!isValidPasswordMatch) {
            // ✅ Increment failed attempts
            attempts.count++;
            loginAttempts.set(attemptsKey, attempts);
            
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // ✅ Successful login - reset attempts
        loginAttempts.delete(attemptsKey);

        // ✅ GENERATE JWT WITH EXPIRY
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                is_first_login: user.is_first_login
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        // Log activity
        await supabase
            .from('activity_logs')
            .insert({
                user_id: user.id,
                user_name: user.full_name,
                action: 'Login',
                details: { email: user.email },
                ip_address: ip
            });

        // Return user data (without password hash)
        const { password_hash, ...userData } = user;

        return res.status(200).json({
            success: true,
            token,
            user: {
                ...userData,
                is_first_login: user.is_first_login
            }
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
            .select('id, full_name, email, phone, role, is_active, is_first_login, created_at')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            user
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
// CHANGE PASSWORD - WITH IMPROVED VALIDATION
// ============================================================

const changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id;

        // ✅ VALIDATE INPUT
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

        // ✅ Prevent password reuse (optional but recommended)
        if (new_password === current_password) {
            return res.status(400).json({
                success: false,
                error: 'New password cannot be the same as the current password'
            });
        }

        // Get user with password hash
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

        // Verify current password
        const isValidPasswordMatch = await bcrypt.compare(current_password, user.password_hash);
        if (!isValidPasswordMatch) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 12);

        // Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                is_first_login: false,
                updated_at: new Date()
            })
            .eq('id', userId);

        if (updateError) {
            throw updateError;
        }

        // Log activity
        await supabase
            .from('activity_logs')
            .insert({
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
    changePassword,
    logout
};