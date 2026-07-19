import { supabase } from './supabaseClient'
import { createJob } from './jobs'

const ESTIMATE_SELECT = '*, customers(*), job_types(*)'

// Owner-only (see estimates_select/_insert/_update RLS, migration 051) -
// every quote PickUp (the AI receptionist) gives, plus anything entered
// manually, tracked separately from a live job ticket so a quote that
// never turns into a job doesn't just disappear. AI-sourced rows are
// written by receptionist-server (recordQuote/createBooking in
// lib/booking.js); this file only ever reads those and handles the
// manual-entry + status-management side.
export async function listEstimates() {
  const { data, error } = await supabase
    .from('estimates')
    .select(ESTIMATE_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createEstimate({ customerId, customerName, customerPhone, jobTypeId, description, priceLow, priceHigh }) {
  const { data, error } = await supabase
    .from('estimates')
    .insert({
      customer_id: customerId || null,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      job_type_id: jobTypeId || null,
      description,
      price_low: priceLow || null,
      price_high: priceHigh || null,
      source: 'manual',
      status: 'sent',
    })
    .select(ESTIMATE_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updateEstimateStatus(id, status) {
  const { data, error } = await supabase
    .from('estimates')
    .update({ status, status_changed_at: new Date().toISOString() })
    .eq('id', id)
    .select(ESTIMATE_SELECT)
    .single()
  if (error) throw error
  return data
}

// Turns an accepted estimate into a real job. Reuses lib/jobs.js's
// createJob directly rather than duplicating the insert - an estimate
// converting to a job is not a different kind of job, it's the same
// jobs-table row any other booking produces, just pre-filled from the
// estimate's price/job type/customer instead of a blank form.
export async function convertEstimateToJob(estimate, { customerId, address, urgency = 'standard', scheduledDate, scheduledWindow } = {}) {
  const resolvedCustomerId = customerId || estimate.customer_id
  if (!resolvedCustomerId) {
    throw new Error('This estimate has no linked customer yet - add one before converting it to a job.')
  }
  const job = await createJob({
    customerId: resolvedCustomerId,
    jobTypeId: estimate.job_type_id,
    description: estimate.description || estimate.job_types?.label || 'Service call',
    address: address || estimate.customers?.address || '',
    urgency,
    scheduledDate,
    scheduledWindow,
    priceLow: estimate.price_low,
    priceHigh: estimate.price_high,
  })
  const { error } = await supabase
    .from('estimates')
    .update({ job_id: job.id, status: 'accepted', status_changed_at: new Date().toISOString() })
    .eq('id', estimate.id)
  if (error) throw error
  return job
}

const STALE_HOURS = 48

// An estimate is worth a Follow Up prompt only while it's still sitting
// at "sent" - once it's been marked viewed/accepted/declined, someone has
// already dealt with it, so it drops off regardless of age.
export function isStale(estimate) {
  if (estimate.status !== 'sent') return false
  const ageMs = Date.now() - new Date(estimate.created_at).getTime()
  return ageMs > STALE_HOURS * 60 * 60 * 1000
}

export function callHref(phone) {
  return phone ? `tel:${phone}` : null
}

// No prefilled body - iOS and Android disagree on whether that's `?body=`
// or `&body=`, and getting it wrong silently drops the param on one
// platform. Opening the compose screen already saves the one-tap trip to
// find the right conversation, which is the actual value here.
export function textHref(phone) {
  return phone ? `sms:${phone}` : null
}

// Financing is a per-company toggle + threshold (Settings > Pricing &
// Revenue) - shows an "Ask about financing" note + outbound link on any
// estimate whose high end clears the threshold. This is a link-out to
// whatever partner (Wisetack, Affirm, etc.) the owner already has an
// account with, not a real payment integration.
export function financingApplies(estimate, company) {
  if (!company?.financing_enabled) return false
  const amount = estimate.price_high ?? estimate.price_low
  if (amount == null) return false
  return amount >= Number(company.financing_threshold ?? 1500)
}
