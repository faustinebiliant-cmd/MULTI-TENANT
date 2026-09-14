// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Permissions Middleware
// ============================================================

// Allowed roles (must match backend validators)
const ALLOWED_ROLES = ['boss', 'manager', 'cashier', 'store_keeper', 'sales_rep'];

// Role hierarchy — higher = more permissions
const ROLE_HIERARCHY = {
    boss: 5,
    manager: 4,
    store_keeper: 3,
    sales_rep: 2,
    cashier: 1
};

// Require user to have one of the allowed roles
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

        // Validate config
        const invalidRole = roles.find(r => !ALLOWED_ROLES.includes(r));
        if (invalidRole) {
            console.warn(`Invalid role in permission check: ${invalidRole}`);
            return res.status(500).json({
                success: false,
                error: 'Server configuration error'
            });
        }

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

// Require user to have at least the given role level
const hasMinRole = (minRole) => {
    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized. Please login.'
            });
        }

        if (!ALLOWED_ROLES.includes(user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Invalid user role.'
            });
        }

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

// Boss only
const isBoss = (req, res, next) => {
    if (!req.user || req.user.role !== 'boss') {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Only the Boss can perform this action.'
        });
    }
    next();
};

// Manager or Boss
const isManagerOrBoss = (req, res, next) => {
    if (!req.user || !['boss', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Only Manager or Boss can perform this action.'
        });
    }
    next();
};

// Cashier-tier (Boss, Manager, Cashier)
const isCashier = (req, res, next) => {
    if (!req.user || !['boss', 'manager', 'cashier'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Only Cashier can perform this action.'
        });
    }
    next();
};

// Store Keeper-tier (Boss, Manager, Store Keeper)
const isStoreKeeper = (req, res, next) => {
    if (!req.user || !['boss', 'manager', 'store_keeper'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Only Store Keeper can perform this action.'
        });
    }
    next();
};

// Sales Rep-tier (Boss, Manager, Sales Rep)
const isSalesRep = (req, res, next) => {
    if (!req.user || !['boss', 'manager', 'sales_rep'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Only Sales Rep can perform this action.'
        });
    }
    next();
};

module.exports = {
    hasRole,
    hasMinRole,
    isBoss,
    isManagerOrBoss,
    isCashier,
    isStoreKeeper,
    isSalesRep,
    ALLOWED_ROLES,
    ROLE_HIERARCHY
};