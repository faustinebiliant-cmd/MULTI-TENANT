// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Orders Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { hasRole, canUseQuickSale } = require('../middleware/permissions');
const {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    recordPayment,
    confirmOrder,
    cancelOrder,
    createQuickSale
} = require('../controllers/orderController');

router.use(authenticate);

// Read access — everyone
router.get('/', getAllOrders);

// Quick Sale — one-screen sale, roles enforced by canUseQuickSale.
// MUST be declared BEFORE /:id, otherwise Express treats
// "quick-sale" as an order ID and this route never matches.
router.post('/quick-sale', canUseQuickSale, createQuickSale);

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