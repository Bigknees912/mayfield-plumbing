import { supabase } from './supabaseClient'

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

export async function createContact({ name, phone, email, address }) {
  const { data, error } = await supabase
    .from('customers')
    .insert({ name, phone: phone || null, email: email || null, address: address || null, pipeline_stage: 'new_lead' })
    .select()
    .single()
  if (error) throw error
  return data
}
