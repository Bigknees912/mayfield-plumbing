// Pure deposit math, pulled out of index.ts so it's testable without also
// triggering Deno.serve() (which runs as a side effect of importing
// index.ts) or needing a live Stripe/Supabase connection. See
// _pricing.test.ts and AUTH.md "Automated tests (booking & payment flows)".

// Same formula as JobsBoard.jsx's depositAmount() (src/dashboard/
// JobsBoard.jsx) - the two are independently authored in different
// languages/runtimes, so nothing keeps them in sync except this comment
// and both sides' tests. If you change one, change the other.
export function calcDepositAmount(priceHigh: number, depositPct: number): number {
  return Math.round((priceHigh * (depositPct / 100)) / 5) * 5;
}

// A job only needs a deposit once it has a price on file and that price
// meets or exceeds the company's configured threshold.
export function requiresDeposit(priceHigh: number | null | undefined, depositThreshold: number): boolean {
  return priceHigh != null && priceHigh >= depositThreshold;
}
