// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Products Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { hasRole } = require('../middleware/permissions');
const subscriptionGuard = require('../middleware/subscriptionGuard');
const {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    getLowStockProducts
} = require('../controllers/productController');

// ============================================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================================

router.use(authenticate);

// ============================================================
// PUBLIC PRODUCT ROUTES (All authenticated users)
// ============================================================

// Get all products - Everyone can view
router.get('/', getAllProducts);

// Get single product - Everyone can view
router.get('/:id', getProductById);

// Get low stock products - Everyone can view
router.get('/low-stock', getLowStockProducts);

// ============================================================
// RESTRICTED PRODUCT ROUTES
// ============================================================

// Create product - Manager, Boss, Store Keeper
router.post('/', subscriptionGuard, hasRole(['boss', 'manager', 'store_keeper']), createProduct);

// Update product - Manager, Boss, Store Keeper
router.put('/:id', subscriptionGuard, hasRole(['boss', 'manager', 'store_keeper']), updateProduct);

// Delete product - Boss only
router.delete('/:id', subscriptionGuard, hasRole('boss'), deleteProduct);

// Adjust stock - Manager, Boss, Store Keeper
router.patch('/:id/stock', subscriptionGuard, hasRole(['boss', 'manager', 'store_keeper']), adjustStock);

module.exports = router;