import { supabase } from './supabaseClient'

// Migration 056: Fleet-tier ('pro' plan) companies can split into multiple
// locations, each with its own jobs/calendar/team. A company that never
// creates a location just gets an empty list here and every other screen
// behaves as it always has (location_id stays null everywhere).

export async function listLocations() {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function createLocation({ name, address }) {
  const { data, error } = await supabase
    .from('locations')
    .insert({ name, address: address || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLocation(locationId) {
  const { error } = await supabase.from('locations').delete().eq('id', locationId)
  if (error) throw error
}

// Owner-only RPC (migration 056) - pass locationId = null to unassign a
// team member back to "all locations".
export async function assignProfileLocation(profileId, locationId) {
  const { error } = await supabase.rpc('assign_profile_location', {
    p_profile_id: profileId,
    p_location_id: locationId,
  })
  if (error) throw error
}

// Combined-view totals for the owner's location switcher: open job count
// and in-motion dollar value per location, plus a company-wide row. Pulled
// client-side from the same jobs the owner's RLS already lets them see in
// full, rather than a dedicated RPC - the dataset is small (per-company
// job counts, not per-tenant-wide).
export async function getLocationTotals() {
  const [{ data: locations, error: locErr }, { data: jobs, error: jobsErr }] = await Promise.all([
    supabase.from('locations').select('*').order('name', { ascending: true }),
    supabase.from('jobs').select('location_id, status, price_low, price_high').neq('status', 'done'),
  ])
  if (locErr) throw locErr
  if (jobsErr) throw jobsErr

  return locations.map((loc) => {
    const locJobs = jobs.filter((j) => j.location_id === loc.id)
    const value = locJobs.reduce((sum, j) => sum + (j.price_high || j.price_low || 0), 0)
    return { ...loc, openJobs: locJobs.length, openValue: value }
  })
}
