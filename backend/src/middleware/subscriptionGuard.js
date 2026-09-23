// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Subscription Guard
// Blocks write actions when a business trial has ended.
// Read actions, login, payments, and cancellations are exempt
// by simply not attaching this middleware to their routes.
// ============================================================

const supabase = require('../config/supabase');

const subscriptionGuard = async (req, res, next) => {
  try {
    const businessId = req.scope?.business_id;

    // No business in scope — nothing to guard.
    if (!businessId) {
      return next();
    }

    const { data: business, error } = await supabase
      .from('businesses')
      .select('subscription_status, trial_ends_at')
      .eq('id', businessId)
      .single();

    if (error || !business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }

    const status = business.subscription_status || 'trial';

    // Active — always allowed.
    if (status === 'active') {
      return next();
    }

    // Suspended by admin — distinct message.
    if (status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Your account is suspended. Please contact support.',
        code: 'SUSPENDED'
      });
    }

    // Trial — still allowed if today is on or before trial_ends_at.
    if (status === 'trial' && business.trial_ends_at) {
      const end = new Date(business.trial_ends_at + 'T23:59:59.999Z');
      if (Date.now() <= end.getTime()) {
        return next();
      }
    }

    // Trial expired or status is 'expired'.
    return res.status(403).json({
      success: false,
      error: 'Your free trial has ended. Please subscribe to continue.',
      code: 'TRIAL_EXPIRED',
      trial_ends_at: business.trial_ends_at || null
    });

  } catch (error) {
    console.error('Subscription guard error:', error);
    return res.status(500).json({
      success: false,
      error: 'Subscription check failed'
    });
  }
};

module.exports = subscriptionGuard;