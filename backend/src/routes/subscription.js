// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Subscription Routes
// ============================================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  getPricing,
  getStatus,
  submitPayment
} = require('../controllers/subscriptionController');

// Public — the customer modal needs to show prices.
router.get('/pricing', getPricing);

// Auth required — scoped to the active business.
router.get('/status', authenticate, getStatus);

// Auth required — Boss only (enforced inside the controller).
// Deliberately NOT behind subscriptionGuard: the whole point is
// to let an expired business submit payment to become active again.
router.post('/submit-payment', authenticate, submitPayment);

module.exports = router;