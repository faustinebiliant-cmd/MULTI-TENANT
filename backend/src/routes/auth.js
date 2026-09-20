// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Auth Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
    login,
    getCurrentUser,
    updateProfile,
    changePassword,
    logout,
    endImpersonationSelf
} = require('../controllers/authController');

// Public
router.post('/login', login);
router.post('/logout', logout);

// Protected
router.get('/me', authenticate, getCurrentUser);
router.put('/me', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);

// Impersonation - only valid while an impersonation session is active
router.post('/end-impersonation', authenticate, endImpersonationSelf);

module.exports = router;