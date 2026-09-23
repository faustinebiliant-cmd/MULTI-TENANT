// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Suppliers Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { hasRole } = require('../middleware/permissions');
const subscriptionGuard = require('../middleware/subscriptionGuard');
const {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
} = require('../controllers/supplierController');

router.use(authenticate);

router.get('/', getAllSuppliers);
router.get('/:id', getSupplierById);
router.post('/', subscriptionGuard, hasRole(['boss', 'manager']), createSupplier);
router.put('/:id', subscriptionGuard, hasRole(['boss', 'manager']), updateSupplier);
router.delete('/:id', subscriptionGuard, hasRole('boss'), deleteSupplier);

module.exports = router;