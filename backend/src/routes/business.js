// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Business Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { isBoss } = require('../middleware/permissions');
const subscriptionGuard = require('../middleware/subscriptionGuard');
const {
    getCurrent,
    listBusinesses,
    updateCurrent,
    createBusiness,
    listBranches,
    createBranch,
    updateBranch,
    deactivateBranch,
    activateBranch,
    deleteBranch,
    deactivateBusiness,
    activateBusiness,
    deleteBusiness
} = require('../controllers/businessController');

router.use(authenticate);

router.get('/current', getCurrent);
router.put('/current', subscriptionGuard, isBoss, updateCurrent);

router.get('/list', isBoss, listBusinesses);

router.post('/', subscriptionGuard, isBoss, createBusiness);
router.patch('/:id/deactivate', subscriptionGuard, isBoss, deactivateBusiness);
router.patch('/:id/activate', subscriptionGuard, isBoss, activateBusiness);
router.delete('/:id', subscriptionGuard, isBoss, deleteBusiness);

router.get('/branches', listBranches);
router.post('/branches', subscriptionGuard, isBoss, createBranch);
router.put('/branches/:id', subscriptionGuard, isBoss, updateBranch);
router.patch('/branches/:id/deactivate', subscriptionGuard, isBoss, deactivateBranch);
router.patch('/branches/:id/activate', subscriptionGuard, isBoss, activateBranch);
router.delete('/branches/:id', subscriptionGuard, isBoss, deleteBranch);

module.exports = router;