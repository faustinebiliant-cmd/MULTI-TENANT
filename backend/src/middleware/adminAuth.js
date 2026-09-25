// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Admin Auth Middleware
// Verifies admin JWTs. Uses a DIFFERENT secret from customer
// JWTs, so a customer token can never be accepted here.
// ============================================================

const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!ADMIN_JWT_SECRET || ADMIN_JWT_SECRET.length < 32) {
    console.error('FATAL: ADMIN_JWT_SECRET missing or too short.');
    console.error('Add a strong ADMIN_JWT_SECRET to .env (at least 32 characters).');
    process.exit(1);
}

const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No admin token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        let decoded;
        try {
            decoded = jwt.verify(token, ADMIN_JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Admin session expired. Please log in again.'
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Invalid admin token'
            });
        }

        if (decoded.type !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not an admin token'
            });
        }

        // Confirm the admin still exists and is active
        const { data: admin, error } = await supabase
            .from('platform_admins')
            .select('id, email, full_name, is_active')
            .eq('id', decoded.id)
            .single();

        if (error || !admin) {
            return res.status(401).json({
                success: false,
                error: 'Admin account not found'
            });
        }

        if (!admin.is_active) {
            return res.status(403).json({
                success: false,
                error: 'Admin account is deactivated'
            });
        }

        req.admin = admin;

        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Admin authentication error'
        });
    }
};

module.exports = authenticateAdmin;