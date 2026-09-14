// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Audit Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { isBoss } = require('../middleware/permissions');
const {
    getActivityLogs,
    getActivitySummary
} = require('../controllers/auditController');

// All routes require authentication AND Boss role
router.use(authenticate);
router.use(isBoss);

// Get activity logs
router.get('/logs', getActivityLogs);

// Get activity summary
router.get('/summary', getActivitySummary);

module.exports = router;