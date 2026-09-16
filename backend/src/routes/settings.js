// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Settings Routes (alias)
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { isBoss } = require('../middleware/permissions');
const {
    getCurrent,
    updateCurrent
} = require('../controllers/businessController');

router.use(authenticate);

router.get('/', getCurrent);
router.put('/', isBoss, updateCurrent);

module.exports = router;