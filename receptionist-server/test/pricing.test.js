const { test } = require("node:test");
const assert = require("node:assert/strict");
const { calcQuote } = require("../lib/pricing");
const { createFakeSupabase } = require("./fakeSupabase");

// Pricing is the one part of the booking flow with zero UI feedback loop -
// a broken formula here doesn't show an error, it just quotes the wrong
// price to a real customer over the phone. These lock in concrete numbers
// (hand-computed from lib/pricing.js's own formula) so a future edit that
// changes the math gets caught here, not in a client's complaint. Job
// types and company defaults now come from Supabase (see pricing.js's
// header comment on why), so each test seeds a fake company + job_types
// row instead of relying on a hardcoded JOB_TYPES map - the seeded numbers
// below are the same ones that map used to hardcode for Plumbing, so the
// hand-computed expected values are unchanged.

const COMPANY_ID = "company-1";

const PLUMBING_COMPANY = {
  id: COMPANY_ID,
  base_fee: 149,
  hourly_rate: 135,
  sameday_multiplier: 1.25,
  emergency_multiplier: 1.75,
};

const PLUMBING_JOB_TYPES = [
  { company_id: COMPANY_ID, key: "drain", label: "Drain Cleaning", base_hours: 1, hourly_rate_override: 135, parts_cost: 0, active: true },
  { company_id: COMPANY_ID, key: "faucet", label: "Faucet Repair / Install", base_hours: 1.5, hourly_rate_override: 135, parts_cost: 80, active: true },
  { company_id: COMPANY_ID, key: "toilet", label: "Toilet Repair / Install", base_hours: 1.5, hourly_rate_override: 135, parts_cost: 120, active: true },
  { company_id: COMPANY_ID, key: "waterheater", label: "Water Heater Install / Repair", base_hours: 3, hourly_rate_override: 145, parts_cost: 950, active: true },
  { company_id: COMPANY_ID, key: "pipeleak", label: "Pipe Repair / Leak", base_hours: 2, hourly_rate_override: 145, parts_cost: 150, active: true },
  { company_id: COMPANY_ID, key: "sump", label: "Sump Pump", base_hours: 2.5, hourly_rate_override: 145, parts_cost: 400, active: true },
];

function fakePlumbingCo() {
  return createFakeSupabase({
    companies: [{ ...PLUMBING_COMPANY }],
    job_types: PLUMBING_JOB_TYPES.map((jt) => ({ ...jt })),
  });
}

test("calcQuote: drain / standard / residential / default (mid) parts tier", async () => {
  const q = await calcQuote({ companyId: COMPANY_ID, jobType: "drain", property: "residential", urgency: "standard", supabaseClient: fakePlumbingCo() });
  assert.equal(q.jobLabel, "Drain Cleaning");
  assert.equal(q.low, 260);
  assert.equal(q.high, 310);
  assert.equal(q.breakdown.baseFee, 149);
  assert.equal(q.breakdown.labor, 135);
  assert.equal(q.breakdown.parts, 0);
});

test("calcQuote: waterheater / emergency / commercial / premium parts", async () => {
  const q = await calcQuote({ companyId: COMPANY_ID, jobType: "waterheater", property: "commercial", urgency: "emergency", partsTier: "premium", supabaseClient: fakePlumbingCo() });
  assert.equal(q.low, 3895);
  assert.equal(q.high, 4660);
  assert.equal(q.breakdown.baseFee, 149);
  assert.equal(q.breakdown.labor, 500);
  assert.equal(q.breakdown.parts, 1748);
});

test("calcQuote: low is always less than high, across every seeded job type", async () => {
  const fake = fakePlumbingCo();
  for (const jobType of ["drain", "faucet", "toilet", "waterheater", "pipeleak", "sump"]) {
    for (const urgency of ["standard", "sameday", "emergency"]) {
      const q = await calcQuote({ companyId: COMPANY_ID, jobType, property: "residential", urgency, supabaseClient: fake });
      assert.ok(q.low < q.high, `${jobType}/${urgency}: expected low (${q.low}) < high (${q.high})`);
      assert.ok(q.low > 0, `${jobType}/${urgency}: expected a positive price, got ${q.low}`);
    }
  }
});

test("calcQuote: urgency strictly increases price (standard < sameday < emergency)", async () => {
  const fake = fakePlumbingCo();
  const standard = await calcQuote({ companyId: COMPANY_ID, jobType: "toilet", property: "residential", urgency: "standard", supabaseClient: fake });
  const sameday = await calcQuote({ companyId: COMPANY_ID, jobType: "toilet", property: "residential", urgency: "sameday", supabaseClient: fake });
  const emergency = await calcQuote({ companyId: COMPANY_ID, jobType: "toilet", property: "residential", urgency: "emergency", supabaseClient: fake });
  assert.ok(standard.low < sameday.low);
  assert.ok(sameday.low < emergency.low);
});

test("calcQuote: commercial property costs at least as much as residential", async () => {
  const fake = fakePlumbingCo();
  const residential = await calcQuote({ companyId: COMPANY_ID, jobType: "sump", property: "residential", urgency: "standard", supabaseClient: fake });
  const commercial = await calcQuote({ companyId: COMPANY_ID, jobType: "sump", property: "commercial", urgency: "standard", supabaseClient: fake });
  assert.ok(commercial.low > residential.low);
});

test("calcQuote: parts tier ordering (basic < mid < premium) when parts cost is nonzero", async () => {
  const fake = fakePlumbingCo();
  const basic = await calcQuote({ companyId: COMPANY_ID, jobType: "faucet", property: "residential", urgency: "standard", partsTier: "basic", supabaseClient: fake });
  const mid = await calcQuote({ companyId: COMPANY_ID, jobType: "faucet", property: "residential", urgency: "standard", partsTier: "mid", supabaseClient: fake });
  const premium = await calcQuote({ companyId: COMPANY_ID, jobType: "faucet", property: "residential", urgency: "standard", partsTier: "premium", supabaseClient: fake });
  assert.ok(basic.low < mid.low);
  assert.ok(mid.low < premium.low);
});

test("calcQuote: throws on a jobType this company doesn't have", async () => {
  await assert.rejects(
    () => calcQuote({ companyId: COMPANY_ID, jobType: "not-a-real-job", property: "residential", urgency: "standard", supabaseClient: fakePlumbingCo() }),
    /Unknown jobType/
  );
});

test("calcQuote: throws on an unrecognized urgency", async () => {
  await assert.rejects(
    () => calcQuote({ companyId: COMPANY_ID, jobType: "drain", property: "residential", urgency: "whenever", supabaseClient: fakePlumbingCo() }),
    /Unknown urgency/
  );
});

test("calcQuote: an electrical company's catalog never resolves a plumbing key, and vice versa", async () => {
  const fake = createFakeSupabase({
    companies: [{ id: "company-2", base_fee: 149, hourly_rate: 125, sameday_multiplier: 1.25, emergency_multiplier: 1.75 }],
    job_types: [{ company_id: "company-2", key: "panel", label: "Panel Repair / Upgrade", base_hours: 3, hourly_rate_override: 145, parts_cost: 600, active: true }],
  });
  const q = await calcQuote({ companyId: "company-2", jobType: "panel", property: "residential", urgency: "standard", supabaseClient: fake });
  assert.equal(q.jobLabel, "Panel Repair / Upgrade");

  await assert.rejects(
    () => calcQuote({ companyId: "company-2", jobType: "drain", property: "residential", urgency: "standard", supabaseClient: fake }),
    /Unknown jobType/
  );
});
