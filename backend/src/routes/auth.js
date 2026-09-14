// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Auth Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
    login,
    getCurrentUser,
    changePassword,
    logout
} = require('../controllers/authController');

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Login - Anyone can access
router.post('/login', login);

// Logout - Anyone can access (clears token client-side)
router.post('/logout', logout);

// ============================================================
// PROTECTED ROUTES (Requires Authentication)
// ============================================================

// Get current user - Requires login
router.get('/me', authenticate, getCurrentUser);

// Change password - Requires login
router.post('/change-password', authenticate, changePassword);

module.exports = router;