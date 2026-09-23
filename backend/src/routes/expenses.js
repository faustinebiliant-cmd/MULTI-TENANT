// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Expenses Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { hasRole } = require('../middleware/permissions');
const subscriptionGuard = require('../middleware/subscriptionGuard');
const {
    getAllExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense
} = require('../controllers/expenseController');

router.use(authenticate);

router.get('/', getAllExpenses);
router.get('/:id', getExpenseById);
router.post('/', subscriptionGuard, hasRole(['boss', 'manager']), createExpense);
router.put('/:id', subscriptionGuard, hasRole(['boss', 'manager']), updateExpense);
router.delete('/:id', subscriptionGuard, hasRole('boss'), deleteExpense);

module.exports = router;