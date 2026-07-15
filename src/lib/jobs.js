import { supabase } from './supabaseClient'

// All reads below are automatically scoped to the caller's company by RLS
// (jobs_select/customers_select/etc use company_id = current_company_id()),
// so there's no need to filter by company_id client-side.

const JOB_SELECT = '*, customers(*), job_types(*), assigned_tech:profiles!jobs_assigned_tech_id_fkey(*)'

export async function listJobs() {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listRecentJobs(limit = 6) {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// [start, end) - end is exclusive, matches calendar month-grid usage.
export async function listJobsInRange(startDate, endDate, { techId } = {}) {
  let query = supabase
    .from('jobs')
    .select(JOB_SELECT)
    .gte('scheduled_date', startDate)
    .lt('scheduled_date', endDate)
  if (techId) query = query.eq('assigned_tech_id', techId)
  const { data, error } = await query.order('scheduled_date', { ascending: true })
  if (error) throw error
  return data
}

export async function listJobsForTechToday(techId, date) {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_SELECT)
    .eq('assigned_tech_id', techId)
    .eq('scheduled_date', date)
    .order('scheduled_window', { ascending: true })
  if (error) throw error
  return data
}

export async function listJobTypes() {
  const { data, error } = await supabase
    .from('job_types')
    .select('*')
    .eq('active', true)
    .order('label', { ascending: true })
  if (error) throw error
  return data
}

export async function listTeamTechs() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'tech')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

// Keyed by tech_id. lat/lng live on tech_locations, not profiles - there's
// no GPS pipeline populating this yet, so it'll be an empty map in
// practice until a mobile app starts upserting positions.
export async function listTechLocationsById() {
  const { data, error } = await supabase.from('tech_locations').select('*')
  if (error) throw error
  return Object.fromEntries(data.map((loc) => [loc.tech_id, loc]))
}

// Reuses an existing customer by phone within the company if there's an
// exact match, otherwise creates a new one - avoids duplicate contacts for
// repeat callers without building a full CRM matching flow. Only the
// create path sets pipeline_stage (default 'booked', since this is called
// right alongside creating a job for them) - an existing match's stage is
// never touched, so manually dragging a contact on the Clients pipeline
// never gets silently overwritten by a later job.
export async function findOrCreateCustomer({ name, phone, address, pipelineStage = 'booked' }) {
  if (phone) {
    const { data: existing, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()
    if (findError) throw findError
    if (existing) return existing
  }
  const { data, error } = await supabase
    .from('customers')
    .insert({ name, phone, address, pipeline_stage: pipelineStage })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createJob({
  customerId, jobTypeId, description, address, urgency,
  scheduledDate, scheduledWindow, priceLow, priceHigh,
}) {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      customer_id: customerId,
      job_type_id: jobTypeId,
      description,
      address,
      urgency,
      scheduled_date: scheduledDate || null,
      scheduled_window: scheduledWindow || null,
      price_low: priceLow || null,
      price_high: priceHigh || null,
      source: 'manual',
    })
    .select(JOB_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function assignJob(jobId, techId, currentStatus) {
  const nextStatus = currentStatus === 'unassigned' ? 'assigned' : currentStatus
  const { error } = await supabase
    .from('jobs')
    .update({ assigned_tech_id: techId, status: nextStatus })
    .eq('id', jobId)
  if (error) throw error
}

// Updates the job's status and records the transition in job_status_events
// (the audit trail that also powers "checked in, location verified").
export async function advanceJobStatus(jobId, status, actorId, extra = {}) {
  const patch = { status, ...extra }
  if (status === 'done') patch.completed_at = new Date().toISOString()
  const { error: updateError } = await supabase.from('jobs').update(patch).eq('id', jobId)
  if (updateError) throw updateError

  const { error: eventError } = await supabase
    .from('job_status_events')
    .insert({ job_id: jobId, status, changed_by: actorId })
  if (eventError) throw eventError
}

export async function updateJobNotes(jobId, notes) {
  const { error } = await supabase.from('jobs').update({ notes }).eq('id', jobId)
  if (error) throw error
}

// Haversine distance in km. Returns null if either point is missing -
// job.lat/lng and tech_locations.lat/lng have no geocoding pipeline wired
// up yet, so this will usually be null until that exists.
export function distanceKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
