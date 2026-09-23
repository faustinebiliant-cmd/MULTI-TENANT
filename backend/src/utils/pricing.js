// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Subscription Pricing
// Single source of truth for subscription plans.
// Change these amounts here and they change everywhere:
// the customer modal, the submit endpoint, and the admin panel.
// ============================================================

// The three supported plans. duration_months must match the SQL
// constraint on payment_submissions.duration_months.
const PLANS = [
  {
    duration_months: 2,
    label: '2 months',
    amount: 41667
  },
  {
    duration_months: 6,
    label: '6 months',
    amount: 125000
  },
  {
    duration_months: 12,
    label: '1 year',
    amount: 250000
  }
];

// Look up a plan by its duration. Returns null if not found.
const getPlan = (durationMonths) => {
  const n = parseInt(durationMonths, 10);
  return PLANS.find((p) => p.duration_months === n) || null;
};

// The full pricing table for the frontend to render.
const getPricingTable = () => PLANS.map((p) => ({ ...p }));

module.exports = {
  PLANS,
  getPlan,
  getPricingTable
};