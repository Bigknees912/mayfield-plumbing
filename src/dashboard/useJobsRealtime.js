import { useTableRealtime } from './useTableRealtime'

// Thin wrapper kept for existing call sites (OwnerHome, JobsBoard) - the
// general form now lives in useTableRealtime.js, also used by ClientsPage
// for the customers table.
export function useJobsRealtime(companyId, onChange) {
  useTableRealtime('jobs', companyId, onChange)
}
