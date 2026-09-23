// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Subscription Controller
// Read endpoints + the submit-payment write endpoint.
// ============================================================

const supabase = require('../config/supabase');
const { getPricingTable, getPlan } = require('../utils/pricing');
const { isValidLength, isSafeText, sanitize } = require('../utils/validators');

// Allowed methods — must match the SQL constraint on
// payment_submissions.method.
const ALLOWED_METHODS = ['mpesa', 'tigo_pesa', 'airtel_money', 'bank'];

// ============================================================
// GET /api/subscription/pricing
// Public. Returns the three plans the customer can choose from.
// ============================================================
const getPricing = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: getPricingTable()
    });
  } catch (error) {
    console.error('Get pricing error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing'
    });
  }
};

// ============================================================
// GET /api/subscription/status
// Auth required. Scoped to the active business.
// ============================================================
const getStatus = async (req, res) => {
  try {
    const businessId = req.scope?.business_id;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'No active business selected'
      });
    }

    const { data: business, error } = await supabase
      .from('businesses')
      .select('id, subscription_status, trial_ends_at')
      .eq('id', businessId)
      .single();

    if (error || !business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }

    // Days remaining. trial_ends_at is the last full day of access.
    let daysRemaining = 0;
    if (business.trial_ends_at) {
      const end = new Date(business.trial_ends_at + 'T23:59:59.999Z');
      const diffMs = end.getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    const { count: pendingCount } = await supabase
      .from('payment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'pending');

    return res.status(200).json({
      success: true,
      data: {
        subscription_status: business.subscription_status || 'trial',
        trial_ends_at: business.trial_ends_at || null,
        days_remaining: daysRemaining,
        has_pending_submission: (pendingCount || 0) > 0
      }
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription status'
    });
  }
};

// ============================================================
// POST /api/subscription/submit-payment
// Boss only. Records a claimed payment for admin review.
// The amount is computed from the plan, never trusted from the client.
// ============================================================
const submitPayment = async (req, res) => {
  try {
    // Boss only — staff cannot pay on behalf of the business.
    if (!req.user?.is_boss) {
      return res.status(403).json({
        success: false,
        error: 'Only the Boss can submit a payment'
      });
    }

    const businessId = req.scope?.business_id;
    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'No active business selected'
      });
    }

    const { duration_months, method, transaction_id } = req.body;

    // Duration must match a real plan.
    const plan = getPlan(duration_months);
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan. Choose 2 months, 6 months, or 1 year.'
      });
    }

    // Method must be one of the allowed values.
    if (!method || !ALLOWED_METHODS.includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method'
      });
    }

    // Transaction ID must be safe text, 6-100 chars.
    if (
      !transaction_id ||
      !isValidLength(transaction_id, 6, 100) ||
      !isSafeText(transaction_id)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID must be 6-100 characters and contain no invalid content'
      });
    }

    const cleanTxn = sanitize(transaction_id.trim());

    // Prevent the same transaction ID from being submitted twice for
    // this business. The database also enforces this, but this gives
    // a clean error instead of a Postgres constraint name.
    const { data: existing } = await supabase
      .from('payment_submissions')
      .select('id')
      .eq('business_id', businessId)
      .eq('transaction_id', cleanTxn)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'This transaction ID has already been submitted'
      });
    }

    // Prevent stacking submissions. One pending at a time.
    const { count: pendingCount } = await supabase
      .from('payment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'pending');

    if ((pendingCount || 0) > 0) {
      return res.status(400).json({
        success: false,
        error: 'You already have a payment under review. Please wait for approval.'
      });
    }

    // Insert. Amount comes from the plan, not from the client.
    const { data: submission, error: insertError } = await supabase
      .from('payment_submissions')
      .insert({
        business_id: businessId,
        submitted_by: req.user.id,
        submitted_by_name: req.user.full_name,
        method,
        amount: plan.amount,
        duration_months: plan.duration_months,
        transaction_id: cleanTxn,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Submit payment insert error:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit payment: ' + insertError.message
      });
    }

    // Audit trail on the business's own activity log.
    await supabase
      .from('activity_logs')
      .insert({
        branch_id: null,
        user_id: req.user.id,
        user_name: req.user.full_name,
        action: 'Payment Submitted',
        details: {
          submission_id: submission.id,
          method,
          amount: plan.amount,
          duration_months: plan.duration_months,
          transaction_id: cleanTxn
        },
        ip_address: req.ip || req.connection?.remoteAddress || 'unknown'
      });

    return res.status(201).json({
      success: true,
      message: 'Payment submitted. Awaiting review.',
      data: {
        submission_id: submission.id,
        amount: plan.amount,
        duration_months: plan.duration_months
      }
    });

  } catch (error) {
    console.error('Submit payment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit payment'
    });
  }
};

module.exports = {
  getPricing,
  getStatus,
  submitPayment
};