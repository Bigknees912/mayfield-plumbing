const { test } = require("node:test");
const assert = require("node:assert/strict");
const { calcQuote } = require("../lib/pricing");

// Pricing is the one part of the booking flow with zero UI feedback loop -
// a broken formula here doesn't show an error, it just quotes the wrong
// price to a real customer over the phone. These lock in concrete numbers
// (hand-computed from lib/pricing.js's own formula) so a future edit that
// changes the math gets caught here, not in a client's complaint.

test("calcQuote: drain / standard / residential / default (mid) parts tier", () => {
  const q = calcQuote({ jobType: "drain", property: "residential", urgency: "standard" });
  assert.equal(q.jobLabel, "Drain Cleaning");
  assert.equal(q.low, 260);
  assert.equal(q.high, 310);
  assert.equal(q.breakdown.baseFee, 149);
  assert.equal(q.breakdown.labor, 135);
  assert.equal(q.breakdown.parts, 0);
});

test("calcQuote: waterheater / emergency / commercial / premium parts", () => {
  const q = calcQuote({ jobType: "waterheater", property: "commercial", urgency: "emergency", partsTier: "premium" });
  assert.equal(q.low, 3895);
  assert.equal(q.high, 4660);
  assert.equal(q.breakdown.baseFee, 149);
  assert.equal(q.breakdown.labor, 500);
  assert.equal(q.breakdown.parts, 1748);
});

test("calcQuote: low is always less than high", () => {
  for (const jobType of ["drain", "faucet", "toilet", "waterheater", "pipeleak", "sump"]) {
    for (const urgency of ["standard", "sameday", "emergency"]) {
      const q = calcQuote({ jobType, property: "residential", urgency });
      assert.ok(q.low < q.high, `${jobType}/${urgency}: expected low (${q.low}) < high (${q.high})`);
      assert.ok(q.low > 0, `${jobType}/${urgency}: expected a positive price, got ${q.low}`);
    }
  }
});

test("calcQuote: urgency strictly increases price (standard < sameday < emergency)", () => {
  const standard = calcQuote({ jobType: "toilet", property: "residential", urgency: "standard" });
  const sameday = calcQuote({ jobType: "toilet", property: "residential", urgency: "sameday" });
  const emergency = calcQuote({ jobType: "toilet", property: "residential", urgency: "emergency" });
  assert.ok(standard.low < sameday.low);
  assert.ok(sameday.low < emergency.low);
});

test("calcQuote: commercial property costs at least as much as residential", () => {
  const residential = calcQuote({ jobType: "sump", property: "residential", urgency: "standard" });
  const commercial = calcQuote({ jobType: "sump", property: "commercial", urgency: "standard" });
  assert.ok(commercial.low > residential.low);
});

test("calcQuote: parts tier ordering (basic < mid < premium) when parts cost is nonzero", () => {
  const basic = calcQuote({ jobType: "faucet", property: "residential", urgency: "standard", partsTier: "basic" });
  const mid = calcQuote({ jobType: "faucet", property: "residential", urgency: "standard", partsTier: "mid" });
  const premium = calcQuote({ jobType: "faucet", property: "residential", urgency: "standard", partsTier: "premium" });
  assert.ok(basic.low < mid.low);
  assert.ok(mid.low < premium.low);
});

test("calcQuote: throws on an unrecognized jobType", () => {
  assert.throws(
    () => calcQuote({ jobType: "not-a-real-job", property: "residential", urgency: "standard" }),
    /Unknown jobType/
  );
});

test("calcQuote: throws on an unrecognized urgency", () => {
  assert.throws(
    () => calcQuote({ jobType: "drain", property: "residential", urgency: "whenever" }),
    /Unknown urgency/
  );
});
