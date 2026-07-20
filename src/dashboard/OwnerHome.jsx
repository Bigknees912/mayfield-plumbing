import { useState } from 'react'
import { PhoneIncoming, CalendarCheck, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react'
import { getDashboardStats, listOpenFeedback } from '../lib/dashboard'
import { listRecentJobs } from '../lib/jobs'
import { getLocationTotals } from '../lib/locations'
import { LIGHT } from '../theme'
import { StatCard, SectionLabel, Badge, LoadingState, ErrorState, ErrorBanner, EmptyState, money, STATUS_META, URGENCY_STYLE } from './ui'
import { useJobsRealtime } from './useJobsRealtime'
import { useAsyncData } from './useAsyncData'

// Ported from app-demo.jsx's OwnerHome. Weather-alert banner dropped - it
// read a hardcoded Calgary forecast with no real data source. "Recovered"
// stat (calls saved from voicemail) dropped for the same reason; replaced
// with "Completed Today", which is a real, queryable number.
export default function OwnerHome({ businessProfile, locations = [] }) {
  const [data, setData] = useState({ stats: null, jobs: [], feedback: [], locationTotals: [] })

  async function load() {
    const [stats, jobs, feedback, locationTotals] = await Promise.all([
      getDashboardStats(), listRecentJobs(6), listOpenFeedback(),
      locations.length > 0 ? getLocationTotals() : Promise.resolve([]),
    ])
    setData({ stats, jobs, feedback, locationTotals })
  }

  const { loading, error, hasLoadedOnce, reload } = useAsyncData(load, [locations.length])

  // Picks up a job Alex books over the phone (or any other change) live,
  // without a manual refresh. A failed background refresh here shows a
  // dismissible banner rather than replacing the whole screen - the
  // stats/jobs already on screen stay visible and correct.
  useJobsRealtime(businessProfile?.id, reload)

  if (loading) return <LoadingState />
  if (error && !hasLoadedOnce) return <ErrorState message={error} onRetry={reload} />

  const { stats, jobs, feedback, locationTotals } = data

  return (
    <>
      <ErrorBanner message={error} onRetry={reload} />

      {locationTotals.length > 0 && (
        <div style={{ background: LIGHT.card, borderRadius: 16, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: LIGHT.ink, marginBottom: 10 }}>
            <MapPin size={13} color={LIGHT.accent} /> All Locations — Combined
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {locationTotals.map((loc) => (
              <div key={loc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: LIGHT.ink }}>{loc.name}</span>
                <span style={{ fontSize: 12, color: LIGHT.sub }}>{loc.openJobs} open · {money(loc.openValue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
        <StatCard icon={PhoneIncoming} label="Calls Today" value={stats.callsTodayCount} sub="from PickUp" />
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
