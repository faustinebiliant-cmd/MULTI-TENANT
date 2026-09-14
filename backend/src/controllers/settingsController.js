// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Settings Controller
// ============================================================

const supabase = require('../config/supabase');
const {
    isValidLength,
    isSafeText,
    sanitize
} = require('../utils/validators');

// ============================================================
// GET ALL SETTINGS
// ============================================================

const getSettings = async (req, res) => {
    try {
        const { data: settings, error } = await supabase
            .from('settings')
            .select('*');

        if (error) throw error;

        const settingsMap = {};
        settings.forEach(item => {
            settingsMap[item.key] = item.value;
        });

        return res.status(200).json({
            success: true,
            data: settingsMap
        });

    } catch (error) {
        console.error('Get settings error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch settings'
        });
    }
};

// ============================================================
// UPDATE SETTINGS
// ============================================================

const updateSettings = async (req, res) => {
    try {
        const updates = req.body;

        // Allowed keys with validation
        const allowedSettings = {
            vat_enabled: {
                validate: (value) => value === 'true' || value === 'false' || value === true || value === false,
                transform: (value) => String(value)
            },
            vat_rate: {
                validate: (value) => {
                    const num = parseFloat(value);
                    return !isNaN(num) && num >= 0 && num <= 100;
                },
                transform: (value) => String(parseFloat(value))
            },
            tin: {
                validate: (value) => !value || isValidLength(value, 0, 50),
                transform: (value) => value ? sanitize(String(value)) : ''
            },
            vrn: {
                validate: (value) => !value || isValidLength(value, 0, 50),
                transform: (value) => value ? sanitize(String(value)) : ''
            },
            shopName: {
                validate: (value) => !value || (isValidLength(value, 0, 100) && isSafeText(value)),
                transform: (value) => value ? sanitize(String(value)) : ''
            },
            location: {
                validate: (value) => !value || (isValidLength(value, 0, 200) && isSafeText(value)),
                transform: (value) => value ? sanitize(String(value)) : ''
            },
            phone: {
                validate: (value) => !value || isValidLength(value, 0, 20),
                transform: (value) => value ? sanitize(String(value)) : ''
            },
            email: {
                validate: (value) => !value || isValidLength(value, 0, 100),
                transform: (value) => value ? sanitize(String(value)) : ''
            },
            currency: {
                validate: (value) => !value || ['TZS', 'USD', 'EUR'].includes(value),
                transform: (value) => value || 'TZS'
            },
            taxRate: {
                validate: (value) => {
                    if (!value) return true;
                    const num = parseFloat(value);
                    return !isNaN(num) && num >= 0 && num <= 100;
                },
                transform: (value) => String(parseFloat(value) || 0)
            }
        };

        // Validate + save each
        for (const [key, value] of Object.entries(updates)) {
            if (!allowedSettings[key]) {
                console.warn(`Unknown setting key: ${key} - skipping`);
                continue;
            }

            const rule = allowedSettings[key];

            if (!rule.validate(value)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid value for setting: ${key}`
                });
            }

            const transformedValue = rule.transform(value);

            const { error } = await supabase
                .from('settings')
                .upsert({
                    key: key,
                    value: String(transformedValue),
                    updated_at: new Date()
                }, { onConflict: 'key' });

            if (error) {
                console.error(`Error updating ${key}:`, error);
                throw error;
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Settings updated successfully'
        });

    } catch (error) {
        console.error('Update settings error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update settings: ' + error.message
        });
    }
};

module.exports = {
    getSettings,
    updateSettings
};