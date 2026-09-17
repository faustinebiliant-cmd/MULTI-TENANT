// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Onboarding Routes
// Public — no authentication required.
// ============================================================

const express = require('express');
const router = express.Router();
const { signupLimiter } = require('../middleware/rateLimiter');
const { signup } = require('../controllers/onboardingController');

// Public signup with aggressive rate limiting
router.post('/signup', signupLimiter, signup);

module.exports = router;