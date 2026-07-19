import { supabase } from './supabaseClient'

function startOfMonthISO() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

// Current-calendar-month numbers for the Analytics page: jobs completed,
// revenue (sum of completed jobs' price_high - the same number the rest
// of the app already treats as a job's real value, e.g. JobsBoard's
// deposit calc and dashboard.js's "In Motion" total), average job value,
// and - if companies.goal_type/goal_target is set (Settings > Monthly
// Goal) - progress toward that goal. One query serves both the
// supplementary stat cards and the goal bar so they can never disagree
// with each other about what "this month" contains.
export async function getMonthlyStats(company) {
  const { data, error } = await supabase
    .from('jobs')
    .select('price_high')
    .eq('status', 'done')
    .gte('completed_at', startOfMonthISO())
  if (error) throw error

  const jobsCompleted = data.length
  const revenue = data.reduce((sum, j) => sum + (j.price_high || 0), 0)
  const avgJobValue = jobsCompleted > 0 ? revenue / jobsCompleted : null

  let goal = null
  if (company?.goal_type && company?.goal_target) {
    const actual = company.goal_type === 'jobs' ? jobsCompleted : revenue
    const pct = company.goal_target > 0 ? Math.min(100, Math.round((actual / company.goal_target) * 100)) : 0
    goal = { type: company.goal_type, target: company.goal_target, actual, pct }
  }

  return { jobsCompleted, revenue, avgJobValue, goal }
}

// Per-technician stats for the current calendar month: jobs completed,
// average job value, average time-to-complete (in_progress -> done, read
// from job_status_events). Computed client-side from two small queries
// rather than a DB view/function - the per-company monthly dataset is
// small, and this keeps the aggregation visible without a second SQL
// surface to maintain alongside it.
export async function listTechLeaderboardForMonth() {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, assigned_tech_id, price_high, completed_at')
    .eq('status', 'done')
    .not('assigned_tech_id', 'is', null)
    .gte('completed_at', startOfMonthISO())
  if (error) throw error
  if (jobs.length === 0) return []

  const jobIds = jobs.map((j) => j.id)
  const { data: events, error: eventsError } = await supabase
    .from('job_status_events')
    .select('job_id, created_at')
    .eq('status', 'in_progress')
    .in('job_id', jobIds)
    .order('created_at', { ascending: true })
  if (eventsError) throw eventsError

  // Earliest 'in_progress' event per job - a job only starts once in
  // normal use, but take the first if it was somehow logged twice.
  const startedAtByJob = {}
  for (const e of events) {
    if (!(e.job_id in startedAtByJob)) startedAtByJob[e.job_id] = e.created_at
  }

  const byTech = {}
  for (const j of jobs) {
    const g = (byTech[j.assigned_tech_id] ||= { jobsCompleted: 0, totalValue: 0, valueCount: 0, totalDurationMs: 0, durationCount: 0 })
    g.jobsCompleted += 1
    if (j.price_high != null) {
      g.totalValue += j.price_high
      g.valueCount += 1
    }
    const startedAt = startedAtByJob[j.id]
    if (startedAt && j.completed_at) {
      g.totalDurationMs += new Date(j.completed_at) - new Date(startedAt)
      g.durationCount += 1
    }
  }

  return Object.entries(byTech).map(([techId, g]) => ({
    techId,
    jobsCompleted: g.jobsCompleted,
    avgJobValue: g.valueCount > 0 ? g.totalValue / g.valueCount : null,
    avgDurationMs: g.durationCount > 0 ? g.totalDurationMs / g.durationCount : null,
  }))
}

export function formatDuration(ms) {
  if (ms == null) return '—'
  const hours = ms / (1000 * 60 * 60)
  if (hours < 1) return `${Math.round(ms / 60000)}m`
  if (hours < 10) return `${hours.toFixed(1)}h`
  return `${Math.round(hours)}h`
}
