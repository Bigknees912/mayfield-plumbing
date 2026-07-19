import { supabase } from './supabaseClient'

// Recurring maintenance contracts (migration 052) - e.g. an annual furnace
// tune-up tied to a customer, with automatic renewal reminders sent via
// the same run-automation-sms/SMS-consent pipeline as Winback (see
// send_contract_reminders() in the migration). Owner-only writes,
// company-scoped reads, FK-hardened to the caller's own customers.

export async function listContractsForCustomer(customerId) {
  const { data, error } = await supabase
    .from('service_contracts')
    .select('*')
    .eq('customer_id', customerId)
    .order('next_due_date', { ascending: true })
  if (error) throw error
  return data
}

// Keyed by customer_id -> [contracts], active only - lets the Clients
// board show each customer's next-due date without a per-card round trip.
export async function listActiveContractsByCustomer() {
  const { data, error } = await supabase
    .from('service_contracts')
    .select('*')
    .eq('status', 'active')
    .order('next_due_date', { ascending: true })
  if (error) throw error
  const map = {}
  for (const row of data) {
    ;(map[row.customer_id] ||= []).push(row)
  }
  return map
}

export async function createContract({ customerId, name, frequencyMonths, price, nextDueDate, reminderLeadDays }) {
  const { data, error } = await supabase
    .from('service_contracts')
    .insert({
      customer_id: customerId,
      name: name.trim(),
      frequency_months: frequencyMonths,
      price,
      next_due_date: nextDueDate,
      reminder_lead_days: reminderLeadDays ?? 14,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function cancelContract(id) {
  const { error } = await supabase.from('service_contracts').update({ status: 'cancelled' }).eq('id', id)
  if (error) throw error
}

// Rolls next_due_date forward by frequency_months and clears the reminder
// throttle - see mark_contract_serviced() in migration 052, owner-only.
export async function markContractServiced(id) {
  const { data, error } = await supabase.rpc('mark_contract_serviced', { p_contract_id: id })
  if (error) throw error
  return data
}

const DUE_SOON_DAYS = 14

export function isDueSoon(contract) {
  if (contract.status !== 'active') return false
  const daysUntil = (new Date(contract.next_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return daysUntil <= DUE_SOON_DAYS
}

export function isOverdue(contract) {
  return contract.status === 'active' && new Date(contract.next_due_date).getTime() < Date.now()
}
