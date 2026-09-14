// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Settings Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { isBoss } = require('../middleware/permissions');
const {
    getSettings,
    updateSettings
} = require('../controllers/settingsController');

// All routes require authentication
router.use(authenticate);

// Get settings - Any authenticated user
router.get('/', getSettings);

// Update settings - Boss only
router.put('/', isBoss, updateSettings);

module.exports = router;