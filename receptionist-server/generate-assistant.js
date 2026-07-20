#!/usr/bin/env node
// Regenerates this company's Vapi assistant definition (system prompt +
// tools) from its actual trade and service catalog in Supabase, instead of
// hand-maintaining a static JSON file that silently drifts out of sync
// with whatever the dashboard's Settings > Service Catalog page says.
// Replaces the old checked-in vapi-assistant.json - see README.md
// "Step 4: Create the assistant".
//
// Usage: node generate-assistant.js <webhookUrl> [variant]
//   variant: 'a' (default) or 'b' - see assistantConfig.js's OPENING_LINES.
//   Deploy each variant as its own Vapi assistant on its own phone number
//   to A/B test - the variant tag gets baked into the webhook URL itself
//   (?variant=b) so server.js can stamp calls.prompt_variant without
//   needing a lookup table anywhere. Point roughly half your call volume
//   at each number, then check `select * from call_variant_performance`
//   after a couple hundred calls.

const { getSupabase, getCompanyId, validateEnv } = require("./lib/supabase");
const { buildAssistantConfig } = require("./lib/assistantConfig");

async function main() {
  validateEnv();
  const rawWebhookUrl = process.argv[2];
  const variant = process.argv[3] === "b" ? "b" : "a";
  if (!rawWebhookUrl) {
    console.error("Usage: node generate-assistant.js <webhookUrl> [variant]");
    process.exit(1);
  }
  const webhookUrl = `${rawWebhookUrl}${rawWebhookUrl.includes("?") ? "&" : "?"}variant=${variant}`;

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

  const config = buildAssistantConfig({ company, jobTypes, webhookUrl, variant });
  console.log(JSON.stringify(config, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
