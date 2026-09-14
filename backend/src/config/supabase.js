// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Supabase Connection
// ============================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate credentials exist
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ ERROR: Missing Supabase credentials!');
    console.error('Please check your .env file has:');
    console.error('  SUPABASE_URL=your_url');
    console.error('  SUPABASE_SERVICE_ROLE_KEY=your_key');
    process.exit(1);
}

// Service role key bypasses RLS — used only on the backend.
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

console.log('✅ Supabase connected successfully');

module.exports = supabase;