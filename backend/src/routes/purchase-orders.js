// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Purchase Orders Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { hasRole } = require('../middleware/permissions');
const {
    getAllPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    receivePurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder
} = require('../controllers/purchaseOrderController');

// All routes require authentication
router.use(authenticate);

// Get all purchase orders - Manager, Boss, Store Keeper
router.get('/', hasRole(['boss', 'manager', 'store_keeper']), getAllPurchaseOrders);

// Get single purchase order
router.get('/:id', hasRole(['boss', 'manager', 'store_keeper']), getPurchaseOrderById);

// Create purchase order - Manager, Boss
router.post('/', hasRole(['boss', 'manager']), createPurchaseOrder);

// Receive purchase order - Manager, Boss, Store Keeper
router.patch('/:id/receive', hasRole(['boss', 'manager', 'store_keeper']), receivePurchaseOrder);

// Update purchase order - Manager, Boss
router.put('/:id', hasRole(['boss', 'manager']), updatePurchaseOrder);

// Delete purchase order - Boss only
router.delete('/:id', hasRole('boss'), deletePurchaseOrder);

module.exports = router;