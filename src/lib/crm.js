import { supabase } from './supabaseClient'
import { recordSmsConsent } from './smsConsent'

// Mirrors customers.pipeline_stage's check constraint (migration
// 018_customers_pipeline_stage). Order here is the left-to-right column
// order on the board.
export const PIPELINE_STAGES = [
  { key: 'new_lead', label: 'New Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'booked', label: 'Booked' },
  { key: 'completed', label: 'Completed' },
  { key: 'nurture', label: 'Nurture' },
]

export async function listContacts() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// The only way pipeline_stage ever changes after a contact is created -
// this is a manually-managed field (see the migration's comment), so this
// is called exactly once per drag, never automatically from job/deposit
// events.
export async function updateContactStage(customerId, stage) {
  const { error } = await supabase.from('customers').update({ pipeline_stage: stage }).eq('id', customerId)
  if (error) throw error
}

// `smsConsent` (Add Contact form's consent checkbox) is applied via
// record_sms_consent after the insert, same reasoning as
// findOrCreateCustomer in lib/jobs.js - one audited code path either way.
export async function createContact({ name, phone, email, address, smsConsent = false }) {
  const { data, error } = await supabase
    .from('customers')
    .insert({ name, phone: phone || null, email: email || null, address: address || null, pipeline_stage: 'new_lead' })
    .select()
    .single()
  if (error) throw error
  if (smsConsent) {
    await recordSmsConsent(data.id, true, 'web_form', 'Captured on Add Contact form')
    return { ...data, sms_consent: true }
  }
  return data
}

export async function updateContactTags(customerId, tags) {
  const { error } = await supabase.from('customers').update({ tags }).eq('id', customerId)
  if (error) throw error
}

// Toggle from ContactDetailModal - unlike the creation-time paths above,
// this can go either direction (a rep can flip it back off if a customer
// asks not to be texted), so it always calls record_sms_consent directly
// rather than only-ever-turning-on.
export async function updateContactConsent(customerId, consent) {
  await recordSmsConsent(customerId, consent, 'web_form', consent ? 'Set from contact detail' : 'Revoked from contact detail')
}

// Append-only interaction timeline (customer_interactions has no update
// RLS policy, by design - see migration 019). created_by/company_id are
// both DB-side defaults (auth.uid() / current_company_id()), not supplied
// here, matching the rest of this app's inserts.
export async function listInteractions(customerId) {
  const { data, error } = await supabase
    .from('customer_interactions')
    .select('*, created_by:profiles(name)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addInteraction({ customerId, type, body }) {
  const { data, error } = await supabase
    .from('customer_interactions')
    .insert({ customer_id: customerId, type, body })
    .select('*, created_by:profiles(name)')
    .single()
  if (error) throw error
  return data
}
