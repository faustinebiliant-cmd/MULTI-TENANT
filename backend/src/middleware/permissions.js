// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Permissions Middleware (UPDATED)
// ============================================================

const supabase = require('../config/supabase');

// ✅ Allowed roles
const ALLOWED_ROLES = ['boss', 'manager', 'cashier', 'store_keeper', 'sales_rep'];

// ✅ Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
    boss: 5,
    manager: 4,
    store_keeper: 3,
    sales_rep: 2,
    cashier: 1
};

/**
 * Check if user has required role
 * @param {string|array} allowedRoles - Single role or array of roles
 */
const hasRole = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized. Please login.'
            });
        }

        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        
        // ✅ Validate that the role exists in allowed roles
        const invalidRole = roles.find(r => !ALLOWED_ROLES.includes(r));
        if (invalidRole) {
            console.warn(`Invalid role in permission check: ${invalidRole}`);
            return res.status(500).json({
                success: false,
                error: 'Server configuration error'
            });
        }

        // ✅ Check if user's role is valid
        if (!ALLOWED_ROLES.includes(user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Invalid user role.'
            });
        }

        if (!roles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You do not have permission to perform this action.'
            });
        }

        next();
    };
};

/**
 * Check if user has at least the minimum role level
 * @param {string} minRole - Minimum role required
 */
const hasMinRole = (minRole) => {
    return (req, res, next) => {
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized. Please login.'
            });
        }

        // ✅ Check if user's role is valid
        if (!ALLOWED_ROLES.includes(user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Invalid user role.'
            });
        }

        // ✅ Check if minRole is valid
        if (!ALLOWED_ROLES.includes(minRole)) {
            console.warn(`Invalid minRole: ${minRole}`);
            return res.status(500).json({
                success: false,
                error: 'Server configuration error'
            });
        }

        const userLevel = ROLE_HIERARCHY[user.role] || 0;
        const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

        if (userLevel < requiredLevel) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You need higher privileges for this action.'
            });
        }

        next();
    };
};

/**
 * Check if user is Boss (Owner)
 */
const isBoss = (req, res, next) => {
    if (!req.user || req.user.role !== 'boss') {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Only the Boss can perform this action.'
        });
    }
    next();
};

/**
 * Check if user is Manager or Boss
 */
const isManagerOrBoss = (req, res, next) => {
    if (!req.user || !['boss', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Only Manager or Boss can perform this action.'
        });
    }
    next();
};

/**
 * Check if user is Cashier
 */
const isCashier = (req, res, next) => {
    if (!req.user || !['boss', 'manager', 'cashier'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Only Cashier can perform this action.'
        });
    }
    next();
};

/**
 * Check if user is Store Keeper
 */
const isStoreKeeper = (req, res, next) => {
    if (!req.user || !['boss', 'manager', 'store_keeper'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Only Store Keeper can perform this action.'
        });
    }
    next();
};

/**
 * Check if user is Sales Rep
 */
const isSalesRep = (req, res, next) => {
    if (!req.user || !['boss', 'manager', 'sales_rep'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Only Sales Rep can perform this action.'
        });
    }
    next();
};

/**
 * ✅ NEW: Check if user can access a specific resource
 * @param {string} resourceType - The type of resource (order, product, etc.)
 * @param {string} resourceId - The ID of the resource
 */
const canAccessResource = (resourceType, resourceId) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized. Please login.'
                });
            }

            // Boss can access everything
            if (user.role === 'boss') {
                return next();
            }

            // Manager can access everything except sensitive resources
            if (user.role === 'manager') {
                const sensitiveResources = ['users', 'settings', 'audit'];
                if (sensitiveResources.includes(resourceType)) {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied. Only Boss can access this resource.'
                    });
                }
                return next();
            }

            // For other roles, check if they own the resource
            // This is a simple example - you can expand this based on your needs
            const { data: resource, error } = await supabase
                .from(resourceType)
                .select('created_by')
                .eq('id', resourceId)
                .single();

            if (error || !resource) {
                return res.status(404).json({
                    success: false,
                    error: 'Resource not found'
                });
            }

            // Check if user created this resource
            if (resource.created_by === user.id) {
                return next();
            }

            return res.status(403).json({
                success: false,
                error: 'Access denied. You do not own this resource.'
            });

        } catch (error) {
            console.error('Resource access check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to check resource access'
            });
        }
    };
};

module.exports = {
    hasRole,
    hasMinRole,
    isBoss,
    isManagerOrBoss,
    isCashier,
    isStoreKeeper,
    isSalesRep,
    canAccessResource,
    ALLOWED_ROLES,
    ROLE_HIERARCHY
};