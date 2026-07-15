const { createClient } = require("@supabase/supabase-js");

// This server has no logged-in user - it's answering phone calls - so it
// authenticates as the service role, which bypasses RLS entirely. That
// means every query below must filter by company_id explicitly instead of
// relying on the current_company_id() RLS helper the browser app uses.
let client;
let companyId;

function getSupabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

// One deployed instance of this server answers calls for exactly one
// company (see README's resale model: copy the project per client). Set
// once the owner has signed up in the app and you know their company's id.
function getCompanyId() {
  if (!companyId) {
    companyId = process.env.SUPABASE_COMPANY_ID;
    if (!companyId) {
      throw new Error("Missing SUPABASE_COMPANY_ID env var");
    }
  }
  return companyId;
}

// Called once at server startup so a missing/misconfigured env var fails
// loudly in the deploy logs instead of only surfacing on the first call.
function validateEnv() {
  getSupabase();
  getCompanyId();
}

module.exports = { getSupabase, getCompanyId, validateEnv };
