#!/usr/bin/env node
// Regenerates this company's Vapi assistant definition (system prompt +
// tools) from its actual trade and service catalog in Supabase, instead of
// hand-maintaining a static JSON file that silently drifts out of sync
// with whatever the dashboard's Settings > Service Catalog page says.
// Replaces the old checked-in vapi-assistant.json - see README.md
// "Step 4: Create the assistant".
//
// Usage: node generate-assistant.js <webhookUrl> > assistant.generated.json

const { getSupabase, getCompanyId, validateEnv } = require("./lib/supabase");
const { buildAssistantConfig } = require("./lib/assistantConfig");

async function main() {
  validateEnv();
  const webhookUrl = process.argv[2];
  if (!webhookUrl) {
    console.error("Usage: node generate-assistant.js <webhookUrl>");
    process.exit(1);
  }

  const supabase = getSupabase();
  const companyId = getCompanyId();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("name, trade, service_area")
    .eq("id", companyId)
    .single();
  if (companyError) throw companyError;

  const { data: jobTypes, error: jobTypesError } = await supabase
    .from("job_types")
    .select("key, label")
    .eq("company_id", companyId)
    .eq("active", true)
    .order("key", { ascending: true });
  if (jobTypesError) throw jobTypesError;

  if (jobTypes.length === 0) {
    console.error("This company has no active services yet - add some in the dashboard's Settings > Service Catalog page first.");
    process.exit(1);
  }

  const config = buildAssistantConfig({ company, jobTypes, webhookUrl });
  console.log(JSON.stringify(config, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
