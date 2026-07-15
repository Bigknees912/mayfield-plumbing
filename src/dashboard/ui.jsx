import { LIGHT } from '../theme'

export function money(n) {
  return (n || 0).toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
}

export function initialsOf(name) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export const URGENCY_STYLE = {
  emergency: { label: 'Emergency', bg: LIGHT.alertSoft, fg: LIGHT.alert },
  sameday: { label: 'Same-Day', bg: LIGHT.accentSoft, fg: LIGHT.accent },
  standard: { label: 'Standard', bg: LIGHT.border, fg: LIGHT.sub },
}

export const STATUS_META = {
  unassigned: { label: 'Unassigned', bg: LIGHT.border, fg: LIGHT.sub },
  assigned: { label: 'Assigned', bg: LIGHT.infoSoft, fg: LIGHT.info },
  in_progress: { label: 'In Progress', bg: LIGHT.accentSoft, fg: LIGHT.accent },
  done: { label: 'Completed', bg: LIGHT.successSoft, fg: LIGHT.success },
  cancelled: { label: 'Cancelled', bg: LIGHT.border, fg: LIGHT.sub },
}

export function SectionLabel({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: LIGHT.sub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 2 }}>{children}</div>
}

export function Badge({ children, bg, fg }) {
  return <span style={{ background: bg, color: fg, padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>
}

export function StatCard({ icon: Icon, label, value, sub, subColor }) {
  return (
    <div style={{ background: LIGHT.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
      <Icon size={16} color={LIGHT.accent} style={{ marginBottom: 8 }} />
      <div style={{ fontSize: 22, fontWeight: 700, color: LIGHT.ink, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: LIGHT.sub, marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || LIGHT.sub, fontWeight: 600 }}>{sub}</div>}
    </div>
  )
}

export function EmptyState({ children }) {
  return <div style={{ fontSize: 13, color: LIGHT.sub, textAlign: 'center', padding: '30px 0' }}>{children}</div>
}
