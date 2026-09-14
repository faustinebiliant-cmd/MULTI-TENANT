// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Users Routes (Staff Management)
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { isBoss } = require('../middleware/permissions');
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    resetPassword
} = require('../controllers/userController');

// All routes require authentication AND Boss role
router.use(authenticate);
router.use(isBoss);

// User management
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/reset-password', resetPassword);

module.exports = router;