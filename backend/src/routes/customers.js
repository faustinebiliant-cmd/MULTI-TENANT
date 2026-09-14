// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Customers Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { hasRole } = require('../middleware/permissions');
const {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
} = require('../controllers/customerController');

router.use(authenticate);

router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', hasRole(['boss', 'manager', 'sales_rep']), createCustomer);
router.put('/:id', hasRole(['boss', 'manager', 'sales_rep']), updateCustomer);
router.delete('/:id', hasRole('boss'), deleteCustomer);

module.exports = router;