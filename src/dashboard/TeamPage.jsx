import { useEffect, useState } from 'react'
import { Package, Trophy } from 'lucide-react'
import { LIGHT } from '../theme'
import { SectionLabel, ErrorState, LoadingState, EmptyState, initialsOf, money } from './ui'
import { listTeamTechs } from '../lib/jobs'
import { listParts, listTechPartStockMap, setTechPartStock } from '../lib/inventory'
import { listTechLeaderboardForMonth, formatDuration } from '../lib/analytics'

// Owner-only (matches every other AppShell tab besides Home/Calendar).
// Each tech's card expands into their rough parts stock list - RLS
// (tech_part_stock, migration 052) also lets a tech edit their own row,
// but there's no tech-facing profile screen yet (TECH_TABS is just Home +
// Calendar), so for now this owner view is the only place stock gets
// edited. The Jobs board's assign picker reads the same tech_part_stock
// table to flag (never block) an assignment.
export default function TeamPage() {
  const [techs, setTechs] = useState(undefined)
  const [parts, setParts] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  function load() {
    setError('')
    setTechs(undefined)
    Promise.all([listTeamTechs(), listParts(), listTechPartStockMap(), listTechLeaderboardForMonth()])
      .then(([t, p, stock, board]) => {
        setTechs(t)
        setParts(p)
        setStockMap(stock)
        setLeaderboard(board)
      })
      .catch((err) => setError(err.message || String(err)))
  }
  useEffect(load, [])

  // Optimistic toggle, reverted on failure - same pattern as ClientsPage's
  // tag/consent edits.
  async function toggle(techId, partId, current) {
    const next = !current
    setStockMap((m) => ({ ...m, [techId]: { ...m[techId], [partId]: next } }))
    try {
      await setTechPartStock(techId, partId, next)
    } catch (err) {
      setStockMap((m) => ({ ...m, [techId]: { ...m[techId], [partId]: current } }))
      setError(err.message || String(err))
    }
  }

  return (
    <div>
      <SectionLabel>Team</SectionLabel>
      <div style={{ fontSize: 12, color: LIGHT.sub, marginBottom: 16, lineHeight: 1.4 }}>
        Each tech's rough parts stock. The Jobs board flags an assignment if a job
        needs something they're marked out of.
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && techs === undefined && <LoadingState>Loading team…</LoadingState>}
      {techs && techs.length === 0 && <EmptyState>No team members yet. Share your join code to invite one.</EmptyState>}

      {techs && techs.length > 0 && <Leaderboard techs={techs} leaderboard={leaderboard} />}

      {techs && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {techs.map((t) => {
            const stock = stockMap[t.id] || {}
            const outCount = parts.filter((p) => stock[p.id] === false).length
            const isOpen = expandedId === t.id
            return (
              <div key={t.id} style={{ background: LIGHT.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div className="tap" onClick={() => setExpandedId(isOpen ? null : t.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 17, background: LIGHT.accentSoft, color: LIGHT.accent, fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {initialsOf(t.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: LIGHT.ink }}>{t.name}</div>
                    <div style={{ fontSize: 11.5, color: LIGHT.sub }}>{t.phone || t.email || 'Technician'}</div>
                  </div>
                  {outCount > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: LIGHT.alert, background: LIGHT.alertSoft, borderRadius: 20, padding: '4px 9px', flexShrink: 0 }}>
                      <Package size={11} /> {outCount} out
                    </span>
                  )}
                </div>

                {isOpen && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${LIGHT.border}` }}>
                    {parts.length === 0 && (
                      <div style={{ fontSize: 12, color: LIGHT.sub }}>Add parts in the Services tab's Parts Catalog first.</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {parts.map((p) => {
                        const inStock = stock[p.id] !== false
                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, color: LIGHT.ink }}>{p.name}</span>
                            <button
                              className="tap"
                              onClick={() => toggle(t.id, p.id, inStock)}
                              style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 20, padding: '5px 12px', background: inStock ? LIGHT.successSoft : LIGHT.alertSoft, color: inStock ? LIGHT.success : LIGHT.alert }}
                            >
                              {inStock ? 'In Stock' : 'Out of Stock'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Jobs completed, average job value, and average time-to-complete
// (in_progress -> done, from job_status_events) per technician, for the
// current calendar month - see listTechLeaderboardForMonth() in
// lib/analytics.js. Ranked by jobs completed; a tech with zero completed
// jobs this month still shows (all zeros/dashes) rather than being
// dropped, so the list always matches the team roster above it.
function Leaderboard({ techs, leaderboard }) {
  const statsByTech = Object.fromEntries(leaderboard.map((row) => [row.techId, row]))
  const ranked = [...techs].sort((a, b) => (statsByTech[b.id]?.jobsCompleted || 0) - (statsByTech[a.id]?.jobsCompleted || 0))

  return (
    <div style={{ background: LIGHT.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: LIGHT.ink, marginBottom: 12 }}>
        <Trophy size={14} color={LIGHT.accent} /> This Month's Leaderboard
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ranked.map((t, i) => {
          const s = statsByTech[t.id]
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 18, fontSize: 12, fontWeight: 700, color: LIGHT.sub, textAlign: 'center', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ width: 30, height: 30, borderRadius: 15, background: LIGHT.accentSoft, color: LIGHT.accent, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initialsOf(t.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: LIGHT.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: LIGHT.ink }}>{s?.jobsCompleted || 0} jobs</div>
                <div style={{ fontSize: 10.5, color: LIGHT.sub }}>
                  {s?.avgJobValue != null ? money(s.avgJobValue) : '—'} avg · {formatDuration(s?.avgDurationMs)} avg time
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
