import { supabase } from './supabaseClient'

// Parts catalog + per-job-type required parts + per-tech stock status
// (migration 052). parts/job_type_parts are owner-only writes (RLS);
// tech_part_stock uses the same "self or owner" pattern as
// tech_locations/time_entries, so a tech can edit their own stock list
// from their profile without owner involvement, and an owner can edit
// anyone's from the Team page.

export async function listParts() {
  const { data, error } = await supabase.from('parts').select('*').order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function createPart(name) {
  const { data, error } = await supabase.from('parts').insert({ name: name.trim() }).select().single()
  if (error) throw error
  return data
}

export async function deletePart(id) {
  const { error } = await supabase.from('parts').delete().eq('id', id)
  if (error) throw error
}

// Map of job_type_id -> [part_id, ...] for every job type in the company.
// Feeds both the Service Catalog's per-job-type parts picker and the Jobs
// board's AssignPicker, which needs to know what a job's job_type
// requires in order to flag understocked techs.
export async function listJobTypePartsMap() {
  const { data, error } = await supabase.from('job_type_parts').select('job_type_id, part_id')
  if (error) throw error
  const map = {}
  for (const row of data) {
    ;(map[row.job_type_id] ||= []).push(row.part_id)
  }
  return map
}

// Full replace of a job type's required parts list - simpler and safer
// than diffing add/remove given this is a small, infrequently-edited set
// per service.
export async function setJobTypeParts(jobTypeId, partIds) {
  const { error: delError } = await supabase.from('job_type_parts').delete().eq('job_type_id', jobTypeId)
  if (delError) throw delError
  if (partIds.length === 0) return
  const { error: insError } = await supabase
    .from('job_type_parts')
    .insert(partIds.map((partId) => ({ job_type_id: jobTypeId, part_id: partId })))
  if (insError) throw insError
}

// Map of tech_id -> { part_id: in_stock } for every tech in the company.
// A tech/part pair with no row simply hasn't been set yet - treated as "in
// stock" by callers (matching tech_part_stock.in_stock's own DB default),
// not as "definitely out."
export async function listTechPartStockMap() {
  const { data, error } = await supabase.from('tech_part_stock').select('tech_id, part_id, in_stock')
  if (error) throw error
  const map = {}
  for (const row of data) {
    ;(map[row.tech_id] ||= {})[row.part_id] = row.in_stock
  }
  return map
}

export async function setTechPartStock(techId, partId, inStock) {
  const { error } = await supabase
    .from('tech_part_stock')
    .upsert({ tech_id: techId, part_id: partId, in_stock: inStock, updated_at: new Date().toISOString() }, { onConflict: 'tech_id,part_id' })
  if (error) throw error
}

// Techs (from techStockMap) who are marked out of stock on at least one
// part the given job type requires. Returns a Map of tech_id -> [missing
// part names] - used to warn in the assign picker, never to block the
// assignment outright, since the owner may still want to send someone out
// for a partial job or a supply run on the way.
export function techsMissingParts(jobTypeId, jobTypePartsMap, techStockMap, partsById) {
  const requiredPartIds = jobTypeId ? jobTypePartsMap[jobTypeId] || [] : []
  const result = new Map()
  if (requiredPartIds.length === 0) return result
  for (const [techId, stock] of Object.entries(techStockMap)) {
    const missing = requiredPartIds
      .filter((partId) => stock[partId] === false)
      .map((partId) => partsById[partId]?.name)
      .filter(Boolean)
    if (missing.length > 0) result.set(techId, missing)
  }
  return result
}
