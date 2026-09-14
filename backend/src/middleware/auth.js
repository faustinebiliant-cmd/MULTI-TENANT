// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Auth Middleware
// ============================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticate = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                error: 'No token provided. Please login.' 
            });
        }

        const token = authHeader.split(' ')[1];

        // ✅ VERIFY TOKEN
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // ✅ CHECK TOKEN EXPIRY
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            return res.status(401).json({ 
                success: false, 
                error: 'Token expired. Please login again.' 
            });
        }

        // Attach user to request
        req.user = decoded;
        next();
    } catch (error) {
        // ✅ HANDLE DIFFERENT JWT ERRORS
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