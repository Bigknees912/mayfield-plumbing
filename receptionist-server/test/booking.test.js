const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createBooking } = require("../lib/booking");
const { buildCandidates } = require("../lib/scheduling");
const { createFakeSupabase } = require("./fakeSupabase");

const COMPANY_ID = "company-1";

test("createBooking: creates a new customer and a job for a first-time caller", async () => {
  const fake = createFakeSupabase();
  const slot = buildCandidates("standard")[0];

  const result = await createBooking({
    companyId: COMPANY_ID,
    slot: slot.label,
    jobType: "drain",
    address: "123 Main St",
    customerPhone: "+15551234567",
    customerName: "Sarah Chen",
    supabaseClient: fake,
  });

  assert.equal(result.ok, true);
  assert.equal(fake.table("customers").rows.length, 1, "should have created exactly one customer");
  assert.equal(fake.table("customers").rows[0].name, "Sarah Chen");
  assert.equal(fake.table("customers").rows[0].phone, "+15551234567");
  assert.equal(fake.table("customers").rows[0].pipeline_stage, "booked");

  assert.equal(fake.table("jobs").rows.length, 1, "should have created exactly one job");
  const job = fake.table("jobs").rows[0];
  assert.equal(job.company_id, COMPANY_ID);
  assert.equal(job.address, "123 Main St");
  assert.equal(job.status, "unassigned");
  assert.equal(job.scheduled_date, slot.date);
  assert.equal(job.scheduled_window, slot.window);
  assert.equal(job.source, "phone_ai");
});

test("createBooking: a returning caller (matched by phone) doesn't get a duplicate customer row", async () => {
  const fake = createFakeSupabase({
    customers: [{ id: "existing-customer-id", company_id: COMPANY_ID, phone: "+15559998888", name: "Return Customer" }],
  });
  const slot = buildCandidates("standard")[1];

  const result = await createBooking({
    companyId: COMPANY_ID,
    slot: slot.label,
    jobType: "faucet",
    address: "456 Oak Ave",
    customerPhone: "+15559998888",
    customerName: "Return Customer",
    supabaseClient: fake,
  });

  assert.equal(result.ok, true);
  assert.equal(fake.table("customers").rows.length, 1, "must reuse the existing customer, not create a second one");
  assert.equal(fake.table("jobs").rows[0].customer_id, "existing-customer-id");
});

test("createBooking: rejects a structured slot that's already booked, and doesn't create a job", async () => {
  const slot = buildCandidates("standard")[0];
  const fake = createFakeSupabase({
    jobs: [{ company_id: COMPANY_ID, scheduled_date: slot.date, scheduled_window: slot.window, status: "unassigned" }],
  });

  const result = await createBooking({
    companyId: COMPANY_ID,
    slot: slot.label,
    jobType: "drain",
    address: "789 Pine Rd",
    customerPhone: "+15551112222",
    customerName: "New Caller",
    supabaseClient: fake,
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /taken/i);
  // Exactly the one pre-seeded job - nothing new was created for this failed attempt.
  assert.equal(fake.table("jobs").rows.length, 1);
});

test("createBooking: a cancelled job at the same slot doesn't block a new booking", async () => {
  const slot = buildCandidates("standard")[0];
  const fake = createFakeSupabase({
    jobs: [{ company_id: COMPANY_ID, scheduled_date: slot.date, scheduled_window: slot.window, status: "cancelled" }],
  });

  const result = await createBooking({
    companyId: COMPANY_ID,
    slot: slot.label,
    jobType: "drain",
    address: "789 Pine Rd",
    customerPhone: "+15551112222",
    customerName: "New Caller",
    supabaseClient: fake,
  });

  assert.equal(result.ok, true);
  assert.equal(fake.table("jobs").rows.length, 2);
});

test("createBooking: a freeform slot the caller named skips the conflict check and books as-is", async () => {
  const fake = createFakeSupabase();

  const result = await createBooking({
    companyId: COMPANY_ID,
    slot: "Next Tuesday morning, whenever works",
    jobType: "toilet",
    address: "1 Freeform Ln",
    customerPhone: "+15550001111",
    customerName: "Freeform Caller",
    supabaseClient: fake,
  });

  assert.equal(result.ok, true);
  const job = fake.table("jobs").rows[0];
  assert.equal(job.scheduled_date, null);
  assert.equal(job.scheduled_window, "Next Tuesday morning, whenever works");
});

test("createBooking: smsConsent true records consent on the customer and logs an audit event", async () => {
  const fake = createFakeSupabase();
  const slot = buildCandidates("standard")[0];

  await createBooking({
    companyId: COMPANY_ID,
    slot: slot.label,
    jobType: "drain",
    address: "123 Main St",
    customerPhone: "+15551234567",
    customerName: "Sarah Chen",
    smsConsent: true,
    supabaseClient: fake,
  });

  const customer = fake.table("customers").rows[0];
  assert.equal(customer.sms_consent, true);
  assert.equal(customer.sms_consent_method, "phone_call");
  assert.equal(fake.table("sms_consent_events").rows.length, 1);
  assert.equal(fake.table("sms_consent_events").rows[0].consent, true);
});

test("createBooking: omitting smsConsent leaves the customer un-consented (secure default)", async () => {
  const fake = createFakeSupabase();
  const slot = buildCandidates("standard")[0];

  await createBooking({
    companyId: COMPANY_ID,
    slot: slot.label,
    jobType: "drain",
    address: "123 Main St",
    customerPhone: "+15551234567",
    customerName: "Sarah Chen",
    supabaseClient: fake,
  });

  const customer = fake.table("customers").rows[0];
  assert.equal(customer.sms_consent, undefined, "a brand-new customer row never sets sms_consent unless explicitly true");
  assert.equal(fake.table("sms_consent_events").rows.length, 0);
});

test("createBooking: picks up urgency and quote price from the call record, and marks the call booked", async () => {
  const slot = buildCandidates("sameday")[0];
  const fake = createFakeSupabase({
    calls: [{ id: "call-1", vapi_call_id: "vapi-abc", urgency: "sameday", quote_low: 300, quote_high: 400, outcome: "quoted" }],
  });

  const result = await createBooking({
    companyId: COMPANY_ID,
    vapiCallId: "vapi-abc",
    slot: slot.label,
    jobType: "pipeleak",
    address: "22 Elm St",
    customerPhone: "+15553334444",
    customerName: "Call Tester",
    supabaseClient: fake,
  });

  assert.equal(result.ok, true);
  const job = fake.table("jobs").rows[0];
  assert.equal(job.urgency, "sameday");
  assert.equal(job.price_low, 300);
  assert.equal(job.price_high, 400);
  assert.equal(job.call_id, "call-1");

  const call = fake.table("calls").rows.find((c) => c.id === "call-1");
  assert.equal(call.outcome, "booked");
});
