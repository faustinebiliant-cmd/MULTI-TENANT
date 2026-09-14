// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Reports Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { hasRole, isBoss } = require('../middleware/permissions');
const {
    getSalesReport,
    getYearOverYear,
    getProfitReport,
    getInventoryReport,
    getTopCustomers
} = require('../controllers/reportController');
const {
    testExport,
    exportSalesReport,
    exportPaymentsReport,
    exportExpensesReport,
    exportProductsReport,
    exportStockMovementsReport,
    exportCustomersReport,
    exportSuppliersReport,
    exportPurchaseOrdersReport,
    exportProfitReport,
    exportVATReport,
    exportFullReport
} = require('../controllers/exportController');

router.use(authenticate);

// ─── Existing report routes ───
router.get('/sales', hasRole(['boss', 'manager']), getSalesReport);
router.get('/year-over-year', hasRole(['boss', 'manager']), getYearOverYear);
router.get('/profit', hasRole(['boss', 'manager']), getProfitReport);
router.get('/inventory', hasRole(['boss', 'manager']), getInventoryReport);
router.get('/top-customers', hasRole(['boss', 'manager']), getTopCustomers);

// ─── Export routes — Boss only ───
router.get('/export/test', isBoss, testExport);
router.get('/export/sales', isBoss, exportSalesReport);
router.get('/export/payments', isBoss, exportPaymentsReport);
router.get('/export/expenses', isBoss, exportExpensesReport);
router.get('/export/products', isBoss, exportProductsReport);
router.get('/export/stock-movements', isBoss, exportStockMovementsReport);
router.get('/export/customers', isBoss, exportCustomersReport);
router.get('/export/suppliers', isBoss, exportSuppliersReport);
router.get('/export/purchase-orders', isBoss, exportPurchaseOrdersReport);
router.get('/export/profit', isBoss, exportProfitReport);
router.get('/export/vat', isBoss, exportVATReport);
router.get('/export/full', isBoss, exportFullReport);

module.exports = router;