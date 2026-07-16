import { useEffect, useState } from 'react'
import { AlertTriangle, DollarSign, Layers } from 'lucide-react'
import { LIGHT } from '../theme'
import { ErrorState, LoadingState, EmptyState, StatCard, SectionLabel, money } from '../dashboard/ui'
import { revenueOverview } from '../lib/admin'

export default function RevenuePage() {
  const [data, setData] = useState(undefined)
  const [error, setError] = useState('')

  function load() {
    setError('')
    setData(undefined)
    revenueOverview().then(setData).catch((err) => setError(err.message || String(err)))
  }
  useEffect(load, [])

  if (error) return <ErrorState message={error} onRetry={load} />
  if (data === undefined) return <LoadingState>Loading revenue…</LoadingState>

  const breakdownEntries = Object.entries(data.breakdown || {})

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
        <StatCard icon={DollarSign} label="Total MRR (all companies)" value={money(data.mrr)} />
        <StatCard icon={Layers} label="Plan Tiers Generating Revenue" value={breakdownEntries.length} />
      </div>

      <SectionLabel>MRR by Plan</SectionLabel>
      {breakdownEntries.length === 0 && <EmptyState>No active paying companies yet.</EmptyState>}
      {breakdownEntries.length > 0 && (
        <div style={{ background: LIGHT.card, borderRadius: 16, padding: 16, marginBottom: 22, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
          {breakdownEntries.map(([plan, total]) => {
            const pct = data.mrr > 0 ? (Number(total) / Number(data.mrr)) * 100 : 0
            return (
              <div key={plan} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ color: LIGHT.ink, fontWeight: 600, textTransform: 'capitalize' }}>{plan}</span>
                  <span style={{ color: LIGHT.sub }}>{money(total)}/mo</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: LIGHT.border, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: LIGHT.accent, borderRadius: 4 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <SectionLabel>Revenue Over Time</SectionLabel>
      <div style={{ background: LIGHT.card, borderRadius: 16, padding: 16, marginBottom: 22, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <RevenueChart history={data.history || []} />
      </div>

      <SectionLabel>Payment Issues</SectionLabel>
      {(!data.at_risk || data.at_risk.length === 0) && <EmptyState>No companies with failed or overdue payments.</EmptyState>}
      {data.at_risk && data.at_risk.length > 0 && (
        <div style={{ background: LIGHT.alertSoft, borderRadius: 16, padding: 4 }}>
          {data.at_risk.map((c) => (
            <div key={c.company_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
              <AlertTriangle size={15} color={LIGHT.alert} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: LIGHT.ink }}>{c.name}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: LIGHT.alert, textTransform: 'uppercase' }}>{c.subscription_status.replace('_', ' ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Dependency-free inline line chart (no charting library in package.json) -
// a daily snapshot table (revenue_snapshots, migration 039) feeds this, so
// it starts as a single point on day one and builds real history as the
// business grows.
function RevenueChart({ history }) {
  if (history.length === 0) return <EmptyState>Revenue history will appear here starting tomorrow.</EmptyState>
  if (history.length === 1) {
    return <div style={{ fontSize: 13, color: LIGHT.sub }}>{history[0].date}: {money(history[0].total)}/mo — check back tomorrow for a trend line.</div>
  }

  const width = 600
  const height = 160
  const pad = 24
  const totals = history.map((h) => Number(h.total))
  const max = Math.max(...totals, 1)
  const min = Math.min(...totals, 0)
  const range = max - min || 1
  const stepX = (width - pad * 2) / (history.length - 1)

  const points = history.map((h, i) => {
    const x = pad + i * stepX
    const y = pad + (1 - (Number(h.total) - min) / range) * (height - pad * 2)
    return `${x},${y}`
  })

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
      <polyline points={points.join(' ')} fill="none" stroke={LIGHT.accent} strokeWidth="2.5" />
      {points.map((p, i) => {
        const [x, y] = p.split(',')
        return <circle key={i} cx={x} cy={y} r="3" fill={LIGHT.accent} />
      })}
      <text x={pad} y={height - 4} fontSize="10" fill={LIGHT.sub}>{history[0].date}</text>
      <text x={width - pad} y={height - 4} fontSize="10" fill={LIGHT.sub} textAnchor="end">{history[history.length - 1].date}</text>
    </svg>
  )
}
