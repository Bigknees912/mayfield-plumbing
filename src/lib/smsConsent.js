import { supabase } from './supabaseClient'

// The script/checkbox copy shown wherever a rep captures consent on a
// customer's behalf (JobsBoard's New Job form, ClientsPage's Add Contact
// form). Read it to the customer, or make sure it was conveyed, before
// checking the box - see AUTH.md "SMS consent & compliance" for why this
// exact wording (opt-out instructions, rate disclosure, "not a condition
// of purchase") isn't optional boilerplate.
export function smsConsentScript(companyName) {
  const name = companyName || 'us'
  return `"${name} may text you about your appointment — status updates and occasional feedback requests. Message frequency varies, message and data rates may apply. Reply STOP anytime to opt out. This isn't required to book service."`
}

// Wraps the record_sms_consent RPC (migration 032_sms_consent) - the
// single entry point for the frontend to change a customer's consent
// state, so the customers row and the sms_consent_events audit trail
// always update together. Requires an existing customer_id, so callers
// creating a brand-new contact must create it first, then call this with
// the returned id (see findOrCreateCustomer / createContact).
export async function recordSmsConsent(customerId, consent, method, note) {
  const { error } = await supabase.rpc('record_sms_consent', {
    p_customer_id: customerId,
    p_consent: consent,
    p_method: method,
    p_note: note || null,
  })
  if (error) throw error
}
