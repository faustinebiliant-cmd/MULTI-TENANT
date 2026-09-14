// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Supabase Connection
// ============================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate credentials exist
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('ERROR: Missing Supabase credentials.');
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

// Service role key bypasses RLS — backend only
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

console.log('Supabase connected');

module.exports = supabase;