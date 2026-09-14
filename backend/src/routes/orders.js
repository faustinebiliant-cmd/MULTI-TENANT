// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Orders Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { hasRole } = require('../middleware/permissions');
const {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    recordPayment,
    confirmOrder,
    cancelOrder
} = require('../controllers/orderController');

router.use(authenticate);

// Read access — everyone
router.get('/', getAllOrders);
router.get('/:id', getOrderById);

// Create order — sales team, store keeper, management
router.post('/', hasRole(['boss', 'manager', 'store_keeper', 'sales_rep']), createOrder);

// Status change — cannot set 'cancelled' (blocked in controller)
router.patch('/:id/status', hasRole(['boss', 'manager', 'store_keeper']), updateOrderStatus);

// Payment — cashier and management
router.post('/:id/payment', hasRole(['boss', 'manager', 'cashier']), recordPayment);

// Confirm — store keeper and management
router.patch('/:id/confirm', hasRole(['boss', 'manager', 'store_keeper']), confirmOrder);

// Cancel — boss, manager, store_keeper
// Note: controller blocks non-boss if payment was already recorded
router.patch('/:id/cancel', hasRole(['boss', 'manager', 'store_keeper']), cancelOrder);

module.exports = router;