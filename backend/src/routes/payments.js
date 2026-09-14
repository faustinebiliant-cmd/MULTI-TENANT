// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Payments Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { hasRole } = require('../middleware/permissions');
const {
    getAllPayments,
    getPaymentById,
    createPayment
} = require('../controllers/paymentController');

router.use(authenticate);

router.get('/', getAllPayments);
router.get('/:id', getPaymentById);
router.post('/', hasRole(['boss', 'manager', 'cashier']), createPayment);

module.exports = router;