// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Auth Middleware
// ============================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticate = async (req, res, next) => {
    try {
        // Token must be in Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided. Please login.'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify signature and payload
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Reject expired tokens
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            return res.status(401).json({
                success: false,
                error: 'Token expired. Please login again.'
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token. Please login again.'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired. Please login again.'
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Authentication error'
        });
    }
};

module.exports = authenticate;