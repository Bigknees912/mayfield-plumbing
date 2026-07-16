import { supabase } from './supabaseClient'

// Mirrors automations' check constraints (migration 021_automations_schema).
export const TRIGGER_TYPES = [
  { key: 'job_status_changed', label: 'A job’s status changes to' },
  { key: 'pipeline_stage_changed', label: 'A contact moves to pipeline stage' },
  { key: 'tag_added', label: 'A tag is added to a contact' },
]

export const JOB_STATUSES = [
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

export const ACTION_TYPES = [
  { key: 'send_sms', label: 'Send a text message' },
  { key: 'add_tag', label: 'Add a tag' },
  { key: 'change_stage', label: 'Move to pipeline stage' },
  { key: 'add_note', label: 'Log a note' },
]

// Template variables run_due_automations() (migration
// 023_automation_scheduler) substitutes into a send_sms message. Keep in
// sync with that function's `replace(...)` chain.
export const SMS_VARIABLES = ['{{first_name}}', '{{name}}', '{{company_name}}', '{{job_description}}', '{{job_address}}', '{{review_link}}']

export async function listAutomations() {
  const { data, error } = await supabase.from('automations').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createAutomation(fields) {
  const { data, error } = await supabase.from('automations').insert(fields).select().single()
  if (error) throw error
  return data
}

export async function updateAutomation(id, patch) {
  const { error } = await supabase.from('automations').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteAutomation(id) {
  const { error } = await supabase.from('automations').delete().eq('id', id)
  if (error) throw error
}

// Plain-English summary for the rule list, e.g. "When a job's status
// changes to Completed, wait 24 hours, then send a text message."
export function describeAutomation(automation, pipelineStageLabel) {
  const trigger = TRIGGER_TYPES.find((t) => t.key === automation.trigger_type)?.label || automation.trigger_type
  let triggerValue = ''
  if (automation.trigger_type === 'job_status_changed') {
    triggerValue = JOB_STATUSES.find((s) => s.key === automation.trigger_config?.status)?.label || automation.trigger_config?.status
  } else if (automation.trigger_type === 'pipeline_stage_changed') {
    triggerValue = pipelineStageLabel(automation.trigger_config?.stage) || automation.trigger_config?.stage
  } else if (automation.trigger_type === 'tag_added') {
    triggerValue = `"${automation.trigger_config?.tag}"`
  }

  const delay = describeDelay(automation.delay_minutes)
  const action = ACTION_TYPES.find((a) => a.key === automation.action_type)?.label || automation.action_type
  let actionDetail = ''
  if (automation.action_type === 'add_tag') actionDetail = `: "${automation.action_config?.tag}"`
  else if (automation.action_type === 'change_stage') actionDetail = `: ${pipelineStageLabel(automation.action_config?.stage) || automation.action_config?.stage}`

  return `When ${trigger} ${triggerValue}, ${delay}${action.toLowerCase()}${actionDetail}.`
}

function describeDelay(minutes) {
  if (!minutes) return 'immediately '
  if (minutes % 1440 === 0) return `wait ${minutes / 1440} day${minutes / 1440 === 1 ? '' : 's'}, then `
  if (minutes % 60 === 0) return `wait ${minutes / 60} hour${minutes / 60 === 1 ? '' : 's'}, then `
  return `wait ${minutes} minute${minutes === 1 ? '' : 's'}, then `
}
