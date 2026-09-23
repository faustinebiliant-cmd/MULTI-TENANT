// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Categories Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { hasRole } = require('../middleware/permissions');
const subscriptionGuard = require('../middleware/subscriptionGuard');
const {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');

// All routes require authentication
router.use(authenticate);

// GET all categories - Everyone can view
router.get('/', getAllCategories);

// POST create category - Manager and Boss only
router.post('/', subscriptionGuard, hasRole(['boss', 'manager']), createCategory);

// PUT update category - Manager and Boss only
router.put('/:id', subscriptionGuard, hasRole(['boss', 'manager']), updateCategory);

// DELETE category - Boss only
router.delete('/:id', subscriptionGuard, hasRole('boss'), deleteCategory);

module.exports = router;