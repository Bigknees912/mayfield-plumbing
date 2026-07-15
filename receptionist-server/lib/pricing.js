// Pricing rules for Mayfield Plumbing & Drain.
// Change these numbers to re-price the whole business in one place.

const JOB_TYPES = {
  drain:       { label: "Drain Cleaning",               baseFee: 149, hours: 1,   hourly: 135, parts: 0   },
  faucet:      { label: "Faucet Repair / Install",      baseFee: 149, hours: 1.5, hourly: 135, parts: 80  },
  toilet:      { label: "Toilet Repair / Install",      baseFee: 149, hours: 1.5, hourly: 135, parts: 120 },
  waterheater: { label: "Water Heater Install / Repair",baseFee: 149, hours: 3,   hourly: 145, parts: 950 },
  pipeleak:    { label: "Pipe Repair / Leak",           baseFee: 149, hours: 2,   hourly: 145, parts: 150 },
  sump:        { label: "Sump Pump",                    baseFee: 149, hours: 2.5, hourly: 145, parts: 400 },
};

const URGENCY = {
  standard:  { label: "Standard",  mult: 1 },
  sameday:   { label: "Same-Day",  mult: 1.25 },
  emergency: { label: "Emergency", mult: 1.75 },
};

const PARTS_TIER_MULT = { basic: 0.75, mid: 1, premium: 1.6 };

/**
 * Calculates a quote range. Throws if jobType/urgency are not recognized.
 * @param {{jobType: string, property: "residential"|"commercial", urgency: string, partsTier?: string}} input
 */
function calcQuote({ jobType, property, urgency, partsTier }) {
  const job = JOB_TYPES[jobType];
  const urg = URGENCY[urgency];
  if (!job) throw new Error(`Unknown jobType: ${jobType}`);
  if (!urg) throw new Error(`Unknown urgency: ${urgency}`);

  const tierMult = PARTS_TIER_MULT[partsTier || "mid"] ?? 1;
  const commercialBump = property === "commercial" ? 1.15 : 1;

  const laborRaw = job.hours * job.hourly;
  const partsRaw = job.parts * tierMult;
  const subtotal = (job.baseFee + laborRaw + partsRaw) * commercialBump;
  const withUrgency = subtotal * urg.mult;

  const low = Math.round((withUrgency * 0.92) / 5) * 5;
  const high = Math.round((withUrgency * 1.1) / 5) * 5;

  return {
    jobLabel: job.label,
    low,
    high,
    breakdown: {
      baseFee: job.baseFee,
      labor: Math.round(laborRaw * commercialBump),
      parts: Math.round(partsRaw * commercialBump),
    },
  };
}

module.exports = { JOB_TYPES, URGENCY, PARTS_TIER_MULT, calcQuote };
