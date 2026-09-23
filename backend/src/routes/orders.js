// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Orders Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const subscriptionGuard = require('../middleware/subscriptionGuard');
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

// Read — everyone
router.get('/', getAllOrders);

// Quick Sale — must come before /:id
router.post('/quick-sale', subscriptionGuard, canUseQuickSale, createQuickSale);

router.get('/:id', getOrderById);

// Create order
router.post('/', subscriptionGuard, hasRole(['boss', 'manager', 'store_keeper', 'sales_rep']), createOrder);

// Status change (cannot set cancelled here — blocked in controller)
router.patch('/:id/status', subscriptionGuard, hasRole(['boss', 'manager', 'store_keeper']), updateOrderStatus);

// Payment — NOT guarded: expired Boss must still collect from customers
router.post('/:id/payment', hasRole(['boss', 'manager', 'cashier']), recordPayment);

// Confirm
router.patch('/:id/confirm', subscriptionGuard, hasRole(['boss', 'manager', 'store_keeper']), confirmOrder);

// Cancel — NOT guarded: restores stock, voids payments, reduces obligations
router.patch('/:id/cancel', hasRole(['boss', 'manager', 'store_keeper']), cancelOrder);

module.exports = router;