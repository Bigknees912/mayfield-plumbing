import { supabase } from './supabaseClient'

// The open entry (clock_out is null) is the source of truth for whether a
// tech is currently clocked in - no separate boolean to get out of sync.
export async function getOpenTimeEntry(techId) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('tech_id', techId)
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function clockIn(techId) {
  const { data, error } = await supabase
    .from('time_entries')
    .insert({ tech_id: techId, clock_in: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function clockOut(entryId) {
  const { error } = await supabase
    .from('time_entries')
    .update({ clock_out: new Date().toISOString() })
    .eq('id', entryId)
  if (error) throw error
}
