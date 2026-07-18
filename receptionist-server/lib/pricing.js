const { getSupabase } = require("./supabase");

// Pricing used to be one hardcoded plumbing-only JOB_TYPES map here -
// that's gone. Job types now come from this company's own `job_types` row
// in Supabase (the same table the dashboard's Settings > Service Catalog
// page edits), so an electrician's, HVAC company's, or locksmith's
// receptionist prices real services instead of drain cleaning. Urgency
// multipliers and the base fee/hourly-rate fallback come from the
// `companies` row too, matching what the dashboard already shows the
// owner in Settings - one number, not a second hardcoded copy of it.

const PARTS_TIER_MULT = { basic: 0.75, mid: 1, premium: 1.6 };

async function getJobType(supabase, companyId, jobTypeKey) {
  const { data, error } = await supabase
    .from("job_types")
    .select("key, label, base_hours, hourly_rate_override, parts_cost")
    .eq("company_id", companyId)
    .eq("key", jobTypeKey)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getCompanyPricingDefaults(supabase, companyId) {
  const { data, error } = await supabase
    .from("companies")
    .select("base_fee, hourly_rate, sameday_multiplier, emergency_multiplier")
    .eq("id", companyId)
    .single();
  if (error) throw error;
  return data;
}

function urgencyMultiplier(urgency, company) {
  if (urgency === "standard") return 1;
  if (urgency === "sameday") return company.sameday_multiplier;
  if (urgency === "emergency") return company.emergency_multiplier;
  throw new Error(`Unknown urgency: ${urgency}`);
}

/**
 * Calculates a quote range for one of this company's own job types.
 * Throws if jobType/urgency are not recognized for this company.
 * @param {{companyId: string, jobType: string, property: "residential"|"commercial", urgency: string, partsTier?: string, supabaseClient?: object}} input
 */
async function calcQuote({ companyId, jobType, property, urgency, partsTier, supabaseClient }) {
  const supabase = supabaseClient || getSupabase();

  const [job, company] = await Promise.all([
    getJobType(supabase, companyId, jobType),
    getCompanyPricingDefaults(supabase, companyId),
  ]);
  if (!job) throw new Error(`Unknown jobType: ${jobType}`);
  const urgMult = urgencyMultiplier(urgency, company);

  const tierMult = PARTS_TIER_MULT[partsTier || "mid"] ?? 1;
  const commercialBump = property === "commercial" ? 1.15 : 1;
  const hourlyRate = job.hourly_rate_override ?? company.hourly_rate;

  const laborRaw = job.base_hours * hourlyRate;
  const partsRaw = job.parts_cost * tierMult;
  const subtotal = (company.base_fee + laborRaw + partsRaw) * commercialBump;
  const withUrgency = subtotal * urgMult;

  const low = Math.round((withUrgency * 0.92) / 5) * 5;
  const high = Math.round((withUrgency * 1.1) / 5) * 5;

  return {
    jobLabel: job.label,
    low,
    high,
    breakdown: {
      baseFee: company.base_fee,
      labor: Math.round(laborRaw * commercialBump),
      parts: Math.round(partsRaw * commercialBump),
    },
  };
}

module.exports = { PARTS_TIER_MULT, calcQuote };
