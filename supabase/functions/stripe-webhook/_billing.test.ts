import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapSubscriptionStatus, periodEndOf } from "./_billing.ts";

// Run with: deno test supabase/functions/stripe-webhook/
// A wrong status mapping here doesn't error out loud - it just quietly
// writes the wrong value into subscriptions.status (or fails the check
// constraint and silently drops the whole webhook update, since the
// caller only logs the error to Sentry, it doesn't retry). Every Stripe
// subscription status this webhook can actually receive is covered here.

Deno.test("mapSubscriptionStatus: active and trialing both count as active", () => {
  assertEquals(mapSubscriptionStatus("active"), "active");
  assertEquals(mapSubscriptionStatus("trialing"), "active");
});

Deno.test("mapSubscriptionStatus: past_due and unpaid both count as past_due", () => {
  assertEquals(mapSubscriptionStatus("past_due"), "past_due");
  assertEquals(mapSubscriptionStatus("unpaid"), "past_due");
});

Deno.test("mapSubscriptionStatus: canceled, incomplete_expired, and paused all count as canceled", () => {
  assertEquals(mapSubscriptionStatus("canceled"), "canceled");
  assertEquals(mapSubscriptionStatus("incomplete_expired"), "canceled");
  assertEquals(mapSubscriptionStatus("paused"), "canceled");
});

Deno.test("mapSubscriptionStatus: incomplete (and anything unrecognized) falls back to incomplete", () => {
  assertEquals(mapSubscriptionStatus("incomplete"), "incomplete");
  assertEquals(mapSubscriptionStatus("some_future_stripe_status_we_dont_know_about"), "incomplete");
});

Deno.test("mapSubscriptionStatus: every mapped value is one our subscriptions.status check constraint actually allows", () => {
  const allowed = new Set(["incomplete", "active", "past_due", "canceled"]);
  const stripeStatuses = [
    "active", "trialing", "past_due", "unpaid", "canceled",
    "incomplete_expired", "paused", "incomplete", "anything_else",
  ];
  for (const s of stripeStatuses) {
    const mapped = mapSubscriptionStatus(s);
    if (!allowed.has(mapped)) {
      throw new Error(`mapSubscriptionStatus("${s}") returned "${mapped}", which isn't in the DB check constraint - the update would fail silently`);
    }
  }
});

Deno.test("periodEndOf: converts a Stripe unix timestamp (seconds) to an ISO string", () => {
  // 1735689600 = 2025-01-01T00:00:00.000Z
  assertEquals(periodEndOf({ current_period_end: 1735689600 }), "2025-01-01T00:00:00.000Z");
});

Deno.test("periodEndOf: returns null when the field is missing rather than throwing", () => {
  assertEquals(periodEndOf({}), null);
  assertEquals(periodEndOf({ current_period_end: 0 }), null);
});
