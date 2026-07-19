import { useState } from 'react'
import { Target, DollarSign, CheckCircle2 } from 'lucide-react'
import { getMonthlyStats } from '../lib/analytics'
import { LIGHT } from '../theme'
import { SectionLabel, StatCard, LoadingState, ErrorState, ErrorBanner, money } from './ui'
import { useAsyncData } from './useAsyncData'

function monthLabel() {
  return new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
}

// New page (app-demo.jsx's charted "Insights" tab isn't ported - recharts
// isn't a dependency of this app yet, and there's no way to verify a new
// dependency's build in this environment, see AUTH.md). This starts lean:
// the monthly goal bar the owner asked for, plus a couple of supporting
// numbers computed from the same query so they never disagree.
export default function AnalyticsPage({ company }) {
  const [stats, setStats] = useState(null)

  async function load() {
    const s = await getMonthlyStats(company)
    setStats(s)
  }
  const { loading, error, hasLoadedOnce, reload } = useAsyncData(load, [company?.id, company?.goal_type, company?.goal_target])

  if (loading) return <LoadingState />
  if (error && !hasLoadedOnce) return <ErrorState message={error} onRetry={reload} />

  const goal = stats?.goal

  return (
    <>
      <SectionLabel>Analytics</SectionLabel>
      <ErrorBanner message={error && hasLoadedOnce ? error : ''} onRetry={reload} />

      <div style={{ background: LIGHT.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Target size={15} color={LIGHT.accent} />
          <div style={{ fontSize: 14, fontWeight: 700, color: LIGHT.ink }}>{monthLabel()} Goal</div>
        </div>

        {goal ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontSize: 13, color: LIGHT.ink }}>
                {goal.type === 'revenue'
                  ? `${money(goal.actual)} of ${money(goal.target)}`
                  : `${goal.actual} of ${goal.target} jobs`}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: goal.pct >= 100 ? LIGHT.success : LIGHT.accent }}>{goal.pct}%</div>
            </div>
            <div style={{ height: 10, background: LIGHT.bg, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${goal.pct}%`, background: goal.pct >= 100 ? LIGHT.success : LIGHT.accent, borderRadius: 6, transition: 'width 0.3s ease' }} />
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12.5, color: LIGHT.sub, lineHeight: 1.4 }}>
            No goal set yet. Set a monthly revenue or job-count target in Settings → Monthly Goal.
          </div>
        )}
      </div>

      <SectionLabel>This Month</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <StatCard icon={CheckCircle2} label="Jobs Completed" value={stats.jobsCompleted} subColor={LIGHT.success} />
        <StatCard icon={DollarSign} label="Revenue" value={money(stats.revenue)} subColor={LIGHT.success} />
        <StatCard icon={DollarSign} label="Avg Job Value" value={stats.avgJobValue != null ? money(stats.avgJobValue) : '—'} />
      </div>
    </>
  )
}
