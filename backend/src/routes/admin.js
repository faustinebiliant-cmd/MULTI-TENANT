// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Admin Routes
// All routes (except /login) require an admin token.
// ============================================================

const express = require('express');
const router = express.Router();
const { adminLoginLimiter } = require('../middleware/rateLimiter');
const authenticateAdmin = require('../middleware/adminAuth');
const {
    adminLogin,
    getAdminMe,
    getMetrics,
    listAllBusinesses,
    getBusinessDetail,
    suspendBusiness,
    unsuspendBusiness,
    resetUserPassword,
    startImpersonation,
    endImpersonation,
    listAuditLogs,
    listAllCustomers,     
    getCustomerDetail     
} = require('../controllers/adminController');

// Public — rate-limited
router.post('/login', adminLoginLimiter, adminLogin);

// Everything below requires admin auth
router.use(authenticateAdmin);

router.get('/me', getAdminMe);
router.get('/metrics', getMetrics);

router.get('/customers', listAllCustomers);
router.get('/customers/:id', getCustomerDetail);

router.get('/businesses', listAllBusinesses);
router.get('/businesses/:id', getBusinessDetail);
router.patch('/businesses/:id/suspend', suspendBusiness);
router.patch('/businesses/:id/unsuspend', unsuspendBusiness);

router.patch('/users/:id/reset-password', resetUserPassword);

router.post('/impersonate', startImpersonation);
router.post('/impersonate/end', endImpersonation);

router.get('/audit-logs', listAuditLogs);

module.exports = router;