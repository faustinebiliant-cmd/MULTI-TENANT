// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Business Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { isBoss } = require('../middleware/permissions');
const {
    getCurrent,
    listBusinesses,
    updateCurrent,
    createBusiness,
    listBranches,
    createBranch,
    updateBranch,
    deactivateBranch,
    activateBranch
} = require('../controllers/businessController');

router.use(authenticate);

// Current business (from X-Business-Id header)
router.get('/current', getCurrent);
router.put('/current', isBoss, updateCurrent);

// List all businesses owned by the Boss
router.get('/list', isBoss, listBusinesses);

// Create a new business (with its first branch)
router.post('/', isBoss, createBusiness);

// Branches of the active business
router.get('/branches', listBranches);
router.post('/branches', isBoss, createBranch);
router.put('/branches/:id', isBoss, updateBranch);
router.patch('/branches/:id/deactivate', isBoss, deactivateBranch);
router.patch('/branches/:id/activate', isBoss, activateBranch);

module.exports = router;