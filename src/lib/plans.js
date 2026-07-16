import { supabase } from './supabaseClient'

// Plan metadata for PlanSelectionScreen. The dollar figures below are
// placeholders - edit them freely, they're just display text. What
// actually charges a card is the Stripe Price object each plan maps to
// (STRIPE_PRICE_GROWTH / STRIPE_PRICE_PRO edge function secrets - see
// AUTH.md "Self-serve onboarding & billing"), so changing a number here
// does nothing to real billing until the matching Stripe Price is updated
// too. Keep `key` in sync with subscriptions.plan's check constraint.
export const PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    price: 'Free',
    blurb: 'For a solo operator getting off the ground.',
    features: ['Up to 2 team members', 'Jobs, calendar & CRM', 'Automations (SMS + email)'],
  },
  {
    key: 'growth',
    label: 'Growth',
    price: '$49/mo',
    blurb: 'For a small crew that needs the AI receptionist and deposits.',
    features: ['Up to 10 team members', 'Everything in Starter', 'AI phone receptionist', 'Stripe deposit collection'],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '$149/mo',
    blurb: 'For a growing shop that wants it all.',
    features: ['Unlimited team members', 'Everything in Growth', 'Priority support'],
  },
]

// Starter has no Stripe Price - it's free, so there's nothing to check out.
export function planRequiresCheckout(planKey) {
  return planKey !== 'starter'
}

// Calls create-subscription-checkout and returns the Stripe-hosted
// Checkout URL to redirect to. Only valid for a plan that already has a
// subscriptions row (i.e. after createCompanyAndOwner has run) - the edge
// function resolves the caller's own company from their session, not a
// client-supplied id.
export async function createSubscriptionCheckout(planKey) {
  const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
    body: { plan: planKey },
  })
  if (error) {
    // supabase-js surfaces non-2xx responses as a generic FunctionsHttpError;
    // the actual { error: "..." } message from our function is on the
    // response body, not the error object - see deposits.js for the same
    // unwrap.
    const detail = await error.context?.json?.().catch(() => null)
    throw new Error(detail?.error || error.message)
  }
  return data.url
}
