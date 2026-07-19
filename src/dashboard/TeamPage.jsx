import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { LIGHT } from '../theme'
import { SectionLabel, ErrorState, LoadingState, EmptyState, initialsOf } from './ui'
import { listTeamTechs } from '../lib/jobs'
import { listParts, listTechPartStockMap, setTechPartStock } from '../lib/inventory'

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
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  function load() {
    setError('')
    setTechs(undefined)
    Promise.all([listTeamTechs(), listParts(), listTechPartStockMap()])
      .then(([t, p, stock]) => {
        setTechs(t)
        setParts(p)
        setStockMap(stock)
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
