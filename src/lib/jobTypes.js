import { supabase } from './supabaseClient'

// Management CRUD for a company's own service catalog (job_types), used by
// the Settings > Service Catalog page. Distinct from lib/jobs.js's
// listJobTypes() (active-only, ordered for the Jobs board's picker) - this
// one returns every row, active or not, so an owner can see and
// re-activate a retired service. RLS (job_types_insert/_update/_delete)
// already restricts writes to the caller's own company and 'owner' role -
// see AUTH.md "Trade-agnostic service catalog".

export async function listAllJobTypes() {
  const { data, error } = await supabase
    .from('job_types')
    .select('*')
    .order('label', { ascending: true })
  if (error) throw error
  return data
}

function slugify(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export async function createJobType({ companyId, label, baseHours, hourlyRateOverride, partsCost }) {
  const { data, error } = await supabase
    .from('job_types')
    .insert({
      company_id: companyId,
      key: slugify(label),
      label: label.trim(),
      base_hours: baseHours,
      hourly_rate_override: hourlyRateOverride || null,
      parts_cost: partsCost || 0,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateJobType(id, patch) {
  const { data, error } = await supabase.from('job_types').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function setJobTypeActive(id, active) {
  return updateJobType(id, { active })
}
