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
    activateBranch,
    deleteBranch,
    deactivateBusiness,
    activateBusiness,
    deleteBusiness
} = require('../controllers/businessController');

router.use(authenticate);

router.get('/current', getCurrent);
router.put('/current', isBoss, updateCurrent);

router.get('/list', isBoss, listBusinesses);

router.post('/', isBoss, createBusiness);
router.patch('/:id/deactivate', isBoss, deactivateBusiness);
router.patch('/:id/activate', isBoss, activateBusiness);
router.delete('/:id', isBoss, deleteBusiness);

router.get('/branches', listBranches);
router.post('/branches', isBoss, createBranch);
router.put('/branches/:id', isBoss, updateBranch);
router.patch('/branches/:id/deactivate', isBoss, deactivateBranch);
router.patch('/branches/:id/activate', isBoss, activateBranch);
router.delete('/branches/:id', isBoss, deleteBranch);

module.exports = router;