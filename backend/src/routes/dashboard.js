// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Dashboard Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboardController');

router.use(authenticate);

// Main endpoint — frontend uses this
router.get('/stats', getDashboardStats);

module.exports = router;