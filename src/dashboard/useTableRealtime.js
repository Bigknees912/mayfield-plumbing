import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// Subscribes to any INSERT/UPDATE/DELETE on a company-scoped table and
// calls onChange - the general form of what useJobsRealtime.js started as.
// Realtime still enforces that table's own RLS select policy per connected
// client, so this doesn't expose anything a refetch wouldn't already show.
export function useTableRealtime(table, companyId, onChange) {
  useEffect(() => {
    if (!companyId) return
    const channel = supabase
      .channel(`${table}-changes-${companyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `company_id=eq.${companyId}` },
        onChange
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, companyId])
}
