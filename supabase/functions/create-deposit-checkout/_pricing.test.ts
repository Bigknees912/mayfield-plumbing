import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { calcDepositAmount, requiresDeposit } from "./_pricing.ts";

// Run with: deno test supabase/functions/create-deposit-checkout/
// Deposit math has no UI feedback loop of its own - a broken formula here
// either overcharges a customer's card or silently asks for $0, and either
// way nobody notices until it's already happened. These lock in concrete
// numbers (hand-verified against the exact formula) so a future edit that
// changes the math gets caught here.

Deno.test("calcDepositAmount: rounds to the nearest $5", () => {
  assertEquals(calcDepositAmount(850, 25), 215);
  assertEquals(calcDepositAmount(1000, 20), 200);
  assertEquals(calcDepositAmount(30, 50), 15); // a small job still gets a real, chargeable deposit
});

Deno.test("calcDepositAmount: matches src/dashboard/JobsBoard.jsx's depositAmount() formula exactly", () => {
  // Same three cases run through both implementations by hand - see that
  // file's depositAmount(high, depositPct) => Math.round((high * (depositPct / 100)) / 5) * 5.
  const cases: [number, number, number][] = [
    [4660, 25, 1165],
    [3895, 30, 1170],
    [500, 50, 250],
  ];
  for (const [priceHigh, pct, expected] of cases) {
    assertEquals(calcDepositAmount(priceHigh, pct), expected);
  }
});

Deno.test("requiresDeposit: false when there's no price on file yet", () => {
  assertEquals(requiresDeposit(null, 500), false);
  assertEquals(requiresDeposit(undefined, 500), false);
});

Deno.test("requiresDeposit: false when the price is under the company's threshold", () => {
  assertEquals(requiresDeposit(499, 500), false);
});

Deno.test("requiresDeposit: true when the price meets or exceeds the threshold", () => {
  assertEquals(requiresDeposit(500, 500), true);
  assertEquals(requiresDeposit(999, 500), true);
});
