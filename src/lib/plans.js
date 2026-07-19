import { supabase } from './supabaseClient'

// Plan tiers (name/price/features) are now data in the `plans` table,
// editable from the super-admin panel without a deploy - see AUTH.md
// "Super-admin panel: pricing & plan control". Blurb copy is the one bit
// that stays hardcoded here, keyed by plan key with a generic fallback:
// the admin panel only edits name/price/features, matching what was asked
// for, so a freshly-added tier still renders something reasonable.
const BLURBS = {
  starter: 'For a solo operator getting off the ground.',
  growth: 'For a small crew that needs PickUp and deposits.',
  pro: 'For a growing shop that wants it all.',
}
const DEFAULT_BLURB = 'Everything you need to run your business.'

function formatPrice(monthlyPrice) {
  const n = Number(monthlyPrice) || 0
  if (n <= 0) return 'Free'
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}/mo`
}

// Fetches active plans, ordered by the admin panel's display_order, for
// PlanSelectionScreen. Replaces the old hardcoded PLANS array.
export async function listPlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('key, name, monthly_price, features')
    .eq('active', true)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data.map((p) => ({
    key: p.key,
    label: p.name,
    price: formatPrice(p.monthly_price),
    blurb: BLURBS[p.key] || DEFAULT_BLURB,
    features: Array.isArray(p.features) ? p.features : [],
  }))
}

// Starter (and any other $0 plan) has no Stripe Price - it's free, so
// there's nothing to check out. Looks the price up rather than hardcoding
// a key match, since a super admin could rename/retier plans later.
export async function planRequiresCheckout(planKey) {
  const { data, error } = await supabase.from('plans').select('monthly_price').eq('key', planKey).maybeSingle()
  if (error) throw error
  return Number(data?.monthly_price) > 0
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
