import { supabase } from './supabaseClient'

// Stats for OwnerHome. Each is a real query against real tables - no
// fabricated numbers. "Calls Today" reads the `calls` table populated by
// receptionist-server; it'll show 0 until that's wired to this project.
export async function getDashboardStats() {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const [unassigned, inMotion, completedToday, callsToday] = await Promise.all([
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'unassigned'),
    supabase.from('jobs').select('price_high').in('status', ['assigned', 'in_progress']),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'done').gte('completed_at', today).lt('completed_at', tomorrow),
    supabase.from('calls').select('id', { count: 'exact', head: true }).gte('started_at', today).lt('started_at', tomorrow),
  ])

  if (unassigned.error) throw unassigned.error
  if (inMotion.error) throw inMotion.error
  if (completedToday.error) throw completedToday.error
  if (callsToday.error) throw callsToday.error

  const inMotionValue = inMotion.data.reduce((sum, j) => sum + (j.price_high || 0), 0)

  return {
    unassignedCount: unassigned.count || 0,
    inMotionCount: inMotion.data.length,
    inMotionValue,
    completedTodayCount: completedToday.count || 0,
    callsTodayCount: callsToday.count || 0,
  }
}

export async function listOpenFeedback() {
  const { data, error } = await supabase
    .from('feedback')
    .select('*, customers(*)')
    .eq('sentiment', 'negative')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
