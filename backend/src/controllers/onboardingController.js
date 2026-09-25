// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Onboarding Controller
// Public signup: creates a Boss user, their first business,
// and that business's first branch in one atomic operation.
// ============================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const {
    isValidEmail,
    isValidPassword,
    isValidName,
    isValidPhone,
    isSafeText,
    sanitize
} = require('../utils/validators');

// Disposable email domains to reject.
// Keep this list in sync with what spammers actually use.
const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.net',
    'tempmail.com', 'temp-mail.org', '10minutemail.com',
    'throwaway.email', 'yopmail.com', 'sharklasers.com',
    'trashmail.com', 'getnada.com', 'maildrop.cc',
    'dispostable.com', 'fakeinbox.com', 'mailnesia.com',
    'spam4.me', 'grr.la', 'mailcatch.com', 'mytemp.email',
    'tempinbox.com', 'throwawaymail.com', 'tempr.email',
    'discard.email', 'emailondeck.com', 'email-temp.com'
]);

const isDisposableEmail = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    return domain && DISPOSABLE_DOMAINS.has(domain);
};

// ============================================================
// POST /api/onboarding/signup
// Public. Creates Boss + Business + First Branch atomically.
// ============================================================

const signup = async (req, res) => {
    try {
        const {
            email,
            password,
            full_name,
            phone,
            business_name,
            branch_name,
            location
        } = req.body;

        // ---------------------------------------------------------
        // 1. Required fields
        // ---------------------------------------------------------
        if (!email || !password || !full_name || !business_name || !branch_name) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, password, business name, and branch name are required'
            });
        }

        // ---------------------------------------------------------
        // 2. Validation
        // ---------------------------------------------------------
        if (!isValidName(full_name) || !isSafeText(full_name)) {
            return res.status(400).json({
                success: false,
                error: 'Full name must be 2-20 characters and contain no HTML or scripts'
            });
        }

        if (!isValidEmail(email) || !isSafeText(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters with at least 1 number'
            });
        }

        if (!isValidName(business_name) || !isSafeText(business_name)) {
            return res.status(400).json({
                success: false,
                error: 'Business name must be 2-20 characters and contain no HTML or scripts'
            });
        }

        if (!isValidName(branch_name) || !isSafeText(branch_name)) {
            return res.status(400).json({
                success: false,
                error: 'Branch name must be 2-20 characters and contain no HTML or scripts'
            });
        }

        if (phone && (!isValidPhone(phone) || !isSafeText(phone))) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format'
            });
        }

        const cleanEmail = sanitize(email.toLowerCase().trim());

        if (isDisposableEmail(cleanEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Disposable email addresses are not allowed. Please use a permanent email.'
            });
        }

        // ---------------------------------------------------------
        // 3. Email must be unique
        // ---------------------------------------------------------
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'An account with this email already exists'
            });
        }

        // ---------------------------------------------------------
        // 4. Hash the password before leaving Node
        // ---------------------------------------------------------
        const hashedPassword = await bcrypt.hash(password, 12);

        // ---------------------------------------------------------
        // 5. Atomic signup: user + business + branch in one transaction
        // ---------------------------------------------------------
        const { data: result, error: rpcError } = await supabase.rpc('signup_atomic', {
            p_full_name: sanitize(full_name.trim()),
            p_email: cleanEmail,
            p_phone: phone ? sanitize(phone.trim()) : '',
            p_password_hash: hashedPassword,
            p_business_name: sanitize(business_name.trim()),
            p_branch_name: sanitize(branch_name.trim()),
            p_location: location ? sanitize(location.trim()) : ''
        });

        if (rpcError) {
            console.error('Signup RPC error:', rpcError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create account: ' + rpcError.message
            });
        }

        const user = result.user;
        const business = result.business;

        // ---------------------------------------------------------
        // 6. Load businesses (with branches) for the response
        // ---------------------------------------------------------
        const { data: businesses } = await supabase
            .from('businesses')
            .select(`
                id, name, shop_name, location, phone, email,
                currency, tin, vrn, vat_enabled, vat_rate,
                expense_categories, is_active, business_code,
                branches (id, name, location, phone, email, is_active)
            `)
            .eq('owner_id', user.id)
            .order('created_at');

        // ---------------------------------------------------------
        // 7. Issue JWT
        // ---------------------------------------------------------
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                is_boss: true,
                is_first_login: user.is_first_login,
                account_code: user.account_code
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        // ---------------------------------------------------------
        // 8. Audit log
        // ---------------------------------------------------------
        await supabase
            .from('activity_logs')
            .insert({
                branch_id: null,
                user_id: user.id,
                user_name: user.full_name,
                action: 'Account Signed Up',
                details: {
                    email: user.email,
                    business_id: business.id,
                    business_name: business.name
                },
                ip_address: req.ip || req.connection?.remoteAddress || 'unknown'
            });

        // ---------------------------------------------------------
        // 9. Response
        // ---------------------------------------------------------
        return res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                ...user,
                is_boss: true
            },
            businesses: businesses || []
        });

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({
            success: false,
            error: 'Signup failed. Please try again.'
        });
    }
};

module.exports = { signup };