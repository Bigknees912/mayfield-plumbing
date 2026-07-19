const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cleanText, isPlausiblePhone, validateBookingArgs, validateQuoteArgs } = require("../lib/validate");

test("cleanText: trims and caps length", () => {
  assert.equal(cleanText("  hello  "), "hello");
  assert.equal(cleanText("a".repeat(600), 10), "a".repeat(10));
});

test("cleanText: non-string input becomes empty string, never throws", () => {
  assert.equal(cleanText(123), "");
  assert.equal(cleanText(null), "");
  assert.equal(cleanText(undefined), "");
  assert.equal(cleanText({ a: 1 }), "");
});

test("isPlausiblePhone: accepts realistic phone shapes", () => {
  assert.ok(isPlausiblePhone("+15551234567"));
  assert.ok(isPlausiblePhone("(555) 123-4567"));
});

test("isPlausiblePhone: rejects garbage", () => {
  assert.ok(!isPlausiblePhone("not a phone"));
  assert.ok(!isPlausiblePhone(""));
  assert.ok(!isPlausiblePhone("123"));
  assert.ok(!isPlausiblePhone(12345678901));
});

test("validateBookingArgs: accepts a complete, well-formed booking", () => {
  const result = validateBookingArgs({
    address: "123 Main St",
    customerName: "Sarah Chen",
    slot: "Tomorrow, 9:00-11:00 AM",
    jobType: "drain",
    customerPhone: "+15551234567",
  });
  assert.equal(result.address, "123 Main St");
  assert.equal(result.customerName, "Sarah Chen");
  assert.equal(result.customerPhone, "+15551234567");
});

test("validateBookingArgs: rejects a booking missing required fields, naming all of them", () => {
  assert.throws(
    () => validateBookingArgs({ address: "", customerName: "", slot: "", jobType: "" }),
    /address is required.*customerName is required.*slot is required.*jobType is required/s
  );
});

test("validateBookingArgs: rejects a garbage customerPhone instead of silently passing it through", () => {
  assert.throws(
    () => validateBookingArgs({ address: "1 St", customerName: "A", slot: "S", jobType: "drain", customerPhone: "not a phone at all" }),
    /doesn't look like a real phone number/
  );
});

test("validateBookingArgs: truncates an oversized address instead of inserting it as-is", () => {
  const result = validateBookingArgs({
    address: "A".repeat(1000),
    customerName: "Sarah Chen",
    slot: "Tomorrow",
    jobType: "drain",
  });
  assert.equal(result.address.length, 300);
});

test("validateQuoteArgs: defaults urgency and property when omitted", () => {
  const result = validateQuoteArgs({ jobType: "drain" });
  assert.equal(result.urgency, "standard");
  assert.equal(result.property, "residential");
});

test("validateQuoteArgs: rejects a missing jobType", () => {
  assert.throws(() => validateQuoteArgs({}), /jobType is required/);
});

test("validateQuoteArgs: non-'commercial' property values default to residential rather than passing through unchecked", () => {
  const result = validateQuoteArgs({ jobType: "drain", property: "<script>alert(1)</script>" });
  assert.equal(result.property, "residential");
});
