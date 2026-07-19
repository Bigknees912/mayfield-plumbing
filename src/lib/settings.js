import { supabase } from './supabaseClient'

// Owner-only (companies_update_owner RLS: id = current_company_id() AND
// current_role() = 'owner') - writes directly against the companies row,
// same table JobsBoard/EstimatesPage already read pricing defaults from.
export async function updateCompanySettings(companyId, patch) {
  const { data, error } = await supabase.from('companies').update(patch).eq('id', companyId).select().single()
  if (error) throw error
  return data
}
