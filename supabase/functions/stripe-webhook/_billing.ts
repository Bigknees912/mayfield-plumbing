// Pure Stripe-subscription-to-our-schema mapping, pulled out of index.ts
// so it's testable without also triggering Deno.serve() (a side effect of
// importing index.ts) or needing live Stripe/Supabase credentials. See
// _billing.test.ts and AUTH.md "Automated tests (booking & payment flows)".

// Stripe subscription statuses don't map 1:1 onto our 4-value
// subscriptions.status check constraint (incomplete/active/past_due/
// canceled) - collapse the rest into the closest equivalent.
export function mapSubscriptionStatus(stripeStatus: string): string {
  if (stripeStatus === "active" || stripeStatus === "trialing") return "active";
  if (stripeStatus === "past_due" || stripeStatus === "unpaid") return "past_due";
  if (stripeStatus === "canceled" || stripeStatus === "incomplete_expired" || stripeStatus === "paused") return "canceled";
  return "incomplete";
}

// Loosely typed on purpose (not Stripe.Subscription) - current_period_end
// isn't always a documented top-level field depending on Stripe API
// version, which is why the call site in index.ts still casts through
// `unknown` before calling this. Keeping that cast at the call site
// instead of in here keeps this module free of any Stripe SDK dependency.
export function periodEndOf(subscription: { current_period_end?: number }): string | null {
  const raw = subscription.current_period_end;
  return raw ? new Date(raw * 1000).toISOString() : null;
}
