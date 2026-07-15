import { supabase } from './supabaseClient'

// Calls the create-deposit-checkout edge function, which creates a real
// Stripe Checkout Session server-side (the secret key can never touch the
// browser) and marks the job's deposit_status 'pending'. Returns the
// hosted Stripe checkout URL to share with the customer.
export async function createDepositCheckout(jobId) {
  const { data, error } = await supabase.functions.invoke('create-deposit-checkout', {
    body: { jobId },
  })
  if (error) {
    // supabase-js surfaces non-2xx responses as a generic FunctionsHttpError;
    // the actual { error: "..." } message from our function is on the
    // response body, not the error object, so pull it out for a useful
    // message instead of "Edge Function returned a non-2xx status code".
    const detail = await error.context?.json?.().catch(() => null)
    throw new Error(detail?.error || error.message)
  }
  return data // { url, amount }
}
