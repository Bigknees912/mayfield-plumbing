const { test } = require("node:test");
const assert = require("node:assert/strict");
const { recordQuote } = require("../lib/booking");
const { createFakeSupabase } = require("./fakeSupabase");

const COMPANY_ID = "company-1";

test("recordQuote: creates both a calls row and an estimates row for a first-time quote", async () => {
  const fake = createFakeSupabase();

  await recordQuote({
    companyId: COMPANY_ID,
    vapiCallId: "vapi-1",
    customerPhone: "+15551234567",
    jobType: "drain",
    urgency: "standard",
    property: "residential",
    quote: { low: 260, high: 310, jobLabel: "Drain Cleaning" },
    supabaseClient: fake,
  });

  assert.equal(fake.table("calls").rows.length, 1);
  assert.equal(fake.table("estimates").rows.length, 1, "should create exactly one estimate for a new quote");
  const estimate = fake.table("estimates").rows[0];
  assert.equal(estimate.price_low, 260);
  assert.equal(estimate.price_high, 310);
  assert.equal(estimate.status, "sent");
  assert.equal(estimate.source, "phone_ai");
  assert.equal(estimate.customer_phone, "+15551234567");
  assert.equal(estimate.call_id, fake.table("calls").rows[0].id);
});

test("recordQuote: re-quoting the same call (caller asks for a different price) updates the existing estimate instead of creating a second one", async () => {
  const fake = createFakeSupabase({
    job_types: [
      { company_id: COMPANY_ID, key: "drain", label: "Drain Cleaning" },
      { company_id: COMPANY_ID, key: "waterheater", label: "Water Heater Install / Repair" },
    ],
  });

  await recordQuote({
    companyId: COMPANY_ID,
    vapiCallId: "vapi-2",
    customerPhone: "+15551234567",
    jobType: "drain",
    urgency: "standard",
    property: "residential",
    quote: { low: 260, high: 310, jobLabel: "Drain Cleaning" },
    supabaseClient: fake,
  });

  await recordQuote({
    companyId: COMPANY_ID,
    vapiCallId: "vapi-2",
    customerPhone: "+15551234567",
    jobType: "waterheater",
    urgency: "emergency",
    property: "residential",
    quote: { low: 900, high: 1100, jobLabel: "Water Heater Install / Repair" },
    supabaseClient: fake,
  });

  assert.equal(fake.table("calls").rows.length, 1, "still one calls row");
  assert.equal(fake.table("estimates").rows.length, 1, "still one estimate, updated in place");
  const estimate = fake.table("estimates").rows[0];
  assert.equal(estimate.price_low, 900);
  assert.equal(estimate.price_high, 1100);
  assert.equal(estimate.description, "Water Heater Install / Repair");
});

test("recordQuote: links the estimate to an existing customer when the phone number matches one on file", async () => {
  const fake = createFakeSupabase({
    customers: [{ id: "existing-customer", company_id: COMPANY_ID, phone: "+15559998888", name: "Returning Caller" }],
  });

  await recordQuote({
    companyId: COMPANY_ID,
    vapiCallId: "vapi-3",
    customerPhone: "+15559998888",
    jobType: "faucet",
    urgency: "standard",
    property: "residential",
    quote: { low: 200, high: 250, jobLabel: "Faucet Repair / Install" },
    supabaseClient: fake,
  });

  const estimate = fake.table("estimates").rows[0];
  assert.equal(estimate.customer_id, "existing-customer");
});

test("recordQuote: a brand-new caller's estimate has no customer_id yet - not created eagerly at quote time", async () => {
  const fake = createFakeSupabase();

  await recordQuote({
    companyId: COMPANY_ID,
    vapiCallId: "vapi-4",
    customerPhone: "+15550009999",
    jobType: "drain",
    urgency: "standard",
    property: "residential",
    quote: { low: 260, high: 310, jobLabel: "Drain Cleaning" },
    supabaseClient: fake,
  });

  assert.equal(fake.table("customers").rows.length, 0, "quoting alone should never create a customer record");
  const estimate = fake.table("estimates").rows[0];
  assert.equal(estimate.customer_id, null);
  assert.equal(estimate.customer_phone, "+15550009999");
});

test("recordQuote: with no vapiCallId, does nothing (no calls row, no estimate) rather than erroring", async () => {
  const fake = createFakeSupabase();

  await recordQuote({
    companyId: COMPANY_ID,
    customerPhone: "+15551234567",
    jobType: "drain",
    urgency: "standard",
    property: "residential",
    quote: { low: 260, high: 310, jobLabel: "Drain Cleaning" },
    supabaseClient: fake,
  });

  assert.equal(fake.table("calls").rows.length, 0);
  assert.equal(fake.table("estimates").rows.length, 0);
});
