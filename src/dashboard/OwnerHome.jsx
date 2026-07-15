import { useEffect, useState } from 'react'
import { PhoneIncoming, CalendarCheck, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { getDashboardStats, listOpenFeedback } from '../lib/dashboard'
import { listRecentJobs } from '../lib/jobs'
import { LIGHT } from '../theme'
import { StatCard, SectionLabel, Badge, EmptyState, money, STATUS_META, URGENCY_STYLE } from './ui'

// Ported from app-demo.jsx's OwnerHome. Weather-alert banner dropped - it
// read a hardcoded Calgary forecast with no real data source. "Recovered"
// stat (calls saved from voicemail) dropped for the same reason; replaced
// with "Completed Today", which is a real, queryable number.
export default function OwnerHome({ businessProfile }) {
  const [stats, setStats] = useState(null)
  const [jobs, setJobs] = useState([])
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getDashboardStats(), listRecentJobs(6), listOpenFeedback()])
      .then(([s, j, f]) => {
        if (cancelled) return
        setStats(s)
        setJobs(j)
        setFeedback(f)
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  if (loading) return <EmptyState>Loading…</EmptyState>
  if (error) return <EmptyState>{error}</EmptyState>

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: LIGHT.successSoft, color: LIGHT.success, borderRadius: 20, padding: '4px 10px', fontSize: 10.5, fontWeight: 700, marginBottom: 14 }}>
        <ShieldCheck size={12} /> Licensed &amp; Insured — Alberta
      </div>
      <div style={{ fontSize: 12.5, color: LIGHT.sub, marginBottom: 14 }}>{businessProfile?.service_area}</div>

      {feedback.length > 0 && (
        <div style={{ background: LIGHT.alertSoft, borderRadius: 16, padding: 14, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feedback.map((f) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: LIGHT.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AlertTriangle size={17} color={LIGHT.alert} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: LIGHT.ink }}>Negative feedback from {f.customers?.name || 'a customer'}</div>
                <div style={{ fontSize: 11.5, color: LIGHT.sub }}>"{f.note}"</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <StatCard icon={PhoneIncoming} label="Calls Today" value={stats.callsTodayCount} sub="from the AI receptionist" />
        <StatCard icon={CheckCircle2} label="Completed Today" value={stats.completedTodayCount} subColor={LIGHT.success} />
        <StatCard icon={CalendarCheck} label="In Motion" value={stats.inMotionCount} sub={money(stats.inMotionValue)} subColor={LIGHT.success} />
        <StatCard icon={TrendingUp} label="Needs Assignment" value={stats.unassignedCount} sub={stats.unassignedCount > 0 ? 'tap Jobs to assign' : undefined} subColor={LIGHT.alert} />
      </div>

      <SectionLabel>Recent Jobs</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {jobs.map((j) => {
          const u = URGENCY_STYLE[j.urgency]
          const s = STATUS_META[j.status]
          return (
            <div key={j.id} style={{ background: LIGHT.card, borderRadius: 16, padding: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: u.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {j.urgency === 'emergency' ? <AlertTriangle size={18} color={u.fg} /> : <CalendarCheck size={18} color={u.fg} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: LIGHT.ink }}>{j.description}</div>
                <div style={{ fontSize: 12.5, color: LIGHT.sub }}>{j.customers?.name || 'No customer'} · {j.assigned_tech ? j.assigned_tech.name : 'Unassigned'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: LIGHT.ink, marginBottom: 4 }}>
                  {j.price_low != null ? `${money(j.price_low)}–${money(j.price_high)}` : '—'}
                </div>
                <Badge bg={s.bg} fg={s.fg}>{s.label}</Badge>
              </div>
            </div>
          )
        })}
        {jobs.length === 0 && <EmptyState>No jobs yet. Add one from the Jobs tab.</EmptyState>}
      </div>
    </>
  )
}
