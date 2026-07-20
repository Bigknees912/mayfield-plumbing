import { MapPin } from 'lucide-react'
import { LIGHT } from '../theme'

// Top-bar dropdown for Fleet-tier ('pro' plan) companies running more than
// one location (migration 056). Owner-only: techs and office admins are
// already pinned to their own location by RLS (jobs_select), so they have
// nothing to switch between. "All Locations" is the combined view - every
// job across the company, same as before this feature existed.
export default function LocationSwitcher({ locations, value, onChange }) {
  if (!locations || locations.length < 2) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: LIGHT.card, borderRadius: 10, padding: '6px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
      <MapPin size={14} color={LIGHT.accent} />
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ border: 'none', background: 'transparent', color: LIGHT.ink, fontSize: 12.5, fontWeight: 600, outline: 'none' }}
      >
        <option value="">All Locations</option>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>{loc.name}</option>
        ))}
      </select>
    </div>
  )
}
