// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Auth Middleware
// Verifies JWT, then resolves the active business/branch scope.
//
// Headers (sent by the frontend on every request):
//   X-Business-Id : uuid of the active business
//   X-Branch-Id   : uuid of the active branch (optional)
//
// Boss:  headers are validated against ownership, then trusted.
// Staff: headers are ignored. Scope is forced from the JWT so
//        a cashier can never see another branch's data.
// ============================================================

const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { isValidUUID } = require('../utils/validators');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided. Please login.'
            });
        }

        const token = authHeader.split(' ')[1];

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired. Please login again.'
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Invalid token. Please login again.'
            });
        }

        req.user = decoded;

        // --------------------------------------------------------
        // Impersonation session check
        // If this JWT is an impersonation token, verify the session
        // is still active in the DB. This blocks requests the moment
        // the session is ended (from another tab, admin side, or by
        // a natural expiry) instead of waiting for the 60m JWT to lapse.
        // --------------------------------------------------------
        if (decoded.impersonation_token_id) {
            const { data: session, error: sessErr } = await supabase
                .from('impersonation_sessions')
                .select('*')
                .eq('token_id', decoded.impersonation_token_id)
                .is('ended_at', null)
                .single();

            if (sessErr || !session) {
                return res.status(401).json({
                    success: false,
                    error: 'Impersonation session has ended. Please log in again.'
                });
            }

            if (new Date(session.expires_at) < new Date()) {
                // Mark it ended so future requests short-circuit faster
                await supabase
                    .from('impersonation_sessions')
                    .update({ ended_at: new Date(), ended_by: 'expiry' })
                    .eq('id', session.id);

                return res.status(401).json({
                    success: false,
                    error: 'Impersonation session expired. Please log in again.'
                });
            }

            req.impersonation = session;
        }

        // --------------------------------------------------------
        // Resolve scope
        // --------------------------------------------------------
        if (decoded.is_boss) {
            // Boss scope: read from headers, validate ownership
            const headerBusinessId = req.headers['x-business-id'];
            const headerBranchId = req.headers['x-branch-id'];

            if (!headerBusinessId) {
                // No business selected yet - allow read-only endpoints
                // (like listing businesses) to proceed with an empty scope.
                req.scope = {
                    business_id: null,
                    branch_id: null,
                    is_boss: true
                };
                return next();
            }

            if (!isValidUUID(headerBusinessId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid X-Business-Id header'
                });
            }

            // Confirm the Boss owns this business
            const { data: business, error: bizErr } = await supabase
                .from('businesses')
                .select('id, owner_id, is_active')
                .eq('id', headerBusinessId)
                .single();

            if (bizErr || !business) {
                return res.status(403).json({
                    success: false,
                    error: 'Business not found or access denied'
                });
            }

            if (business.owner_id !== decoded.id) {
                return res.status(403).json({
                    success: false,
                    error: 'You do not own this business'
                });
            }

            if (!business.is_active) {
                return res.status(403).json({
                    success: false,
                    error: 'Business is inactive'
                });
            }

            let resolvedBranchId = null;

            if (headerBranchId) {
                if (!isValidUUID(headerBranchId)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid X-Branch-Id header'
                    });
                }

                const { data: branch, error: brErr } = await supabase
                    .from('branches')
                    .select('id, business_id, is_active')
                    .eq('id', headerBranchId)
                    .single();

                if (brErr || !branch) {
                    return res.status(403).json({
                        success: false,
                        error: 'Branch not found'
                    });
                }

                if (branch.business_id !== business.id) {
                    return res.status(403).json({
                        success: false,
                        error: 'Branch does not belong to the selected business'
                    });
                }

                if (!branch.is_active) {
                    return res.status(403).json({
                        success: false,
                        error: 'Branch is inactive'
                    });
                }

                resolvedBranchId = branch.id;
            }

            req.scope = {
                business_id: business.id,
                branch_id: resolvedBranchId,
                is_boss: true
            };

        } else {
            // Staff scope: forced from JWT, headers ignored
            if (!decoded.business_id || !decoded.branch_id) {
                return res.status(403).json({
                    success: false,
                    error: 'Your account is not assigned to a branch. Contact the administrator.'
                });
            }

            req.scope = {
                business_id: decoded.business_id,
                branch_id: decoded.branch_id,
                is_boss: false
            };
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication error'
        });
    }
};

module.exports = authenticate;