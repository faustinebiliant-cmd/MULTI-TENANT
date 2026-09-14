// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Categories Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { hasRole } = require('../middleware/permissions');
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
router.post('/', hasRole(['boss', 'manager']), createCategory);

// PUT update category - Manager and Boss only
router.put('/:id', hasRole(['boss', 'manager']), updateCategory);

// DELETE category - Boss only
router.delete('/:id', hasRole('boss'), deleteCategory);

module.exports = router;