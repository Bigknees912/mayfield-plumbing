import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// Subscribes to any INSERT/UPDATE/DELETE on this company's jobs and calls
// onChange - so a job Alex books over the phone (or any other write) shows
// up on JobsBoard/OwnerHome without the owner manually refreshing. Requires
// `jobs` to be added to the supabase_realtime publication (migration
// 013_enable_realtime_on_jobs) - Realtime still enforces the jobs_select
// RLS policy per connected client, so this doesn't expose anything a
// refetch wouldn't already show them.
export function useJobsRealtime(companyId, onChange) {
  useEffect(() => {
    if (!companyId) return
    const channel = supabase
      .channel(`jobs-changes-${companyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs', filter: `company_id=eq.${companyId}` },
        onChange
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])
}
