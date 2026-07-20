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

test("recordQuote: a brand-new caller becomes a new_lead immediately, even before they book", async () => {
  // A quote alone must be enough to create the lead - a caller who gets
  // quoted and hangs up without booking still needs to show up on the
  // pipeline board at "new_lead", not disappear because they never
  // triggered book_appointment.
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

  assert.equal(fake.table("customers").rows.length, 1, "quoting a new caller should create exactly one lead");
  const customer = fake.table("customers").rows[0];
  assert.equal(customer.phone, "+15550009999");
  assert.equal(customer.pipeline_stage, "quoted", "get_quote advances a brand-new lead straight to quoted");

  const call = fake.table("calls").rows[0];
  assert.equal(call.customer_id, customer.id);

  const estimate = fake.table("estimates").rows[0];
  assert.equal(estimate.customer_id, customer.id);
  assert.equal(estimate.customer_phone, "+15550009999");
});

test("recordQuote: a second quote for the same caller doesn't create a duplicate lead", async () => {
  const fake = createFakeSupabase();
  const shared = { companyId: COMPANY_ID, vapiCallId: "vapi-5", customerPhone: "+15551230000", jobType: "drain", urgency: "standard", property: "residential", supabaseClient: fake };

  await recordQuote({ ...shared, quote: { low: 200, high: 240, jobLabel: "Drain Cleaning" } });
  await recordQuote({ ...shared, quote: { low: 210, high: 250, jobLabel: "Drain Cleaning" } });

  assert.equal(fake.table("customers").rows.length, 1, "re-quoting the same caller should not create a second lead");
  assert.equal(fake.table("calls").rows.length, 1, "re-quoting the same call should update, not duplicate, the calls row");
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
