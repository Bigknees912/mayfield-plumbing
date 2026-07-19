import { supabase } from './supabaseClient'
import { addInteraction } from './crm'

const PHOTOS_BUCKET = 'job-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60

// Everything that makes up a customer's Document Vault (ClientsPage's
// DocumentVaultModal): invoices, job photos, and warranty/workmanship
// notes. Photos live in a private Storage bucket (migration 053) - every
// read goes through a signed URL, never a public one, and RLS on
// storage.objects mirrors job_photos' own RLS (company-scoped, tech
// uploads restricted to jobs they're assigned to).

export async function listInvoicesForCustomer(customerId) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('customer_id', customerId)
    .order('sent_at', { ascending: false })
  if (error) throw error
  return data
}

// Warranty/workmanship notes reuse customer_interactions (type='warranty',
// migration 053 widened the check constraint) rather than a new table -
// same shape as the general note/call timeline in ContactDetailModal,
// just filtered to the type that belongs in the vault.
export async function listWarrantyNotesForCustomer(customerId) {
  const { data, error } = await supabase
    .from('customer_interactions')
    .select('*, created_by:profiles(name)')
    .eq('customer_id', customerId)
    .eq('type', 'warranty')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addWarrantyNote({ customerId, body }) {
  return addInteraction({ customerId, type: 'warranty', body })
}

async function withSignedUrls(rows) {
  if (rows.length === 0) return []
  const { data: signed, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), SIGNED_URL_TTL_SECONDS)
  if (error) throw error
  const urlByPath = Object.fromEntries(signed.map((s) => [s.path, s.signedUrl]))
  return rows.map((r) => ({ ...r, url: urlByPath[r.storage_path] || null }))
}

export async function listPhotosForCustomer(customerId) {
  const { data, error } = await supabase
    .from('job_photos')
    .select('*, jobs(description)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return withSignedUrls(data)
}

export async function listPhotosForJob(jobId) {
  const { data, error } = await supabase
    .from('job_photos')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return withSignedUrls(data)
}

function extOf(filename) {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot) : ''
}

// Path convention the storage RLS policies key off of - company_id first,
// job_id second (see migration 053's job_photos_storage_* policies, which
// read these via storage.foldername(name)). `job` must carry company_id
// and id (any '*'-selected row from lib/jobs.js already does).
export async function uploadJobPhoto({ job, customerId, file, caption }) {
  const path = `${job.company_id}/${job.id}/${crypto.randomUUID()}${extOf(file.name)}`
  const { error: uploadError } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, file)
  if (uploadError) throw uploadError
  const { data, error } = await supabase
    .from('job_photos')
    .insert({ job_id: job.id, customer_id: customerId || null, storage_path: path, caption: caption || null })
    .select()
    .single()
  if (error) throw error
  return data
}

// DB row first, storage object second - if the storage remove fails after
// the row is gone, the result is an orphaned file (harmless, just wasted
// storage), never a DB row pointing at a file that no longer resolves.
export async function deleteJobPhoto(photo) {
  const { error: dbError } = await supabase.from('job_photos').delete().eq('id', photo.id)
  if (dbError) throw dbError
  const { error: storageError } = await supabase.storage.from(PHOTOS_BUCKET).remove([photo.storage_path])
  if (storageError) throw storageError
}
