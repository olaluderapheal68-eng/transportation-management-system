const { createClient } = require("@supabase/supabase-js");

let supabase;
let supabaseAdmin;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key =
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error("Supabase URL or publishable key is missing.");
    }

    supabase = createClient(url, key);
  }

  return supabase;
}

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const key =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error("Supabase secret key is missing.");
    }

    supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
}

module.exports = {
  getSupabase,
  getSupabaseAdmin,
};