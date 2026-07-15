import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { listJobsInRange } from '../lib/jobs'
import { LIGHT } from '../theme'
import { SectionLabel, Badge, LoadingState, ErrorState, EmptyState, STATUS_META } from './ui'
import { useAsyncData } from './useAsyncData'

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Ported from app-demo.jsx's CalendarPage. The confirmation-SMS
// simulate-yes/simulate-reschedule buttons are dropped - there's no real
// SMS backend behind them, and this task is specifically about screens
// backed by real, persisted data.
export default function CalendarPage({ myTechId }) {
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [jobs, setJobs] = useState([])

  const y = viewMonth.getFullYear()
  const m = viewMonth.getMonth()
  const rangeStart = toISO(y, m, 1)
  const rangeEnd = toISO(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1, 1)

  async function load() {
    const data = await listJobsInRange(rangeStart, rangeEnd, myTechId ? { techId: myTechId } : {})
    setJobs(data)
  }

  const { loading, error, reload } = useAsyncData(load, [rangeStart, rangeEnd, myTechId])

  const jobCountByDate = useMemo(() => {
    const map = {}
    jobs.forEach((j) => { map[j.scheduled_date] = (map[j.scheduled_date] || 0) + 1 })
    return map
  }, [jobs])

  const gridCells = useMemo(() => {
    const firstDow = new Date(y, m, 1).getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(y, m, d))
    return cells
  }, [y, m])

  function changeMonth(delta) {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1))
  }

  const dayJobs = jobs
    .filter((j) => j.scheduled_date === selectedDate)
    .sort((a, b) => (a.scheduled_window || '').localeCompare(b.scheduled_window || ''))

  // The month grid + nav always render, even on a failed fetch - only the
  // day list below it is replaced by the error, so the user can still
  // change months (which retries with a different range) or hit Retry
  // instead of being stuck looking at a blank page.
  return (
    <>
      <SectionLabel>Calendar</SectionLabel>
      <div style={{ background: LIGHT.card, borderRadius: 16, padding: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button className="tap" onClick={() => changeMonth(-1)} style={{ width: 30, height: 30, borderRadius: 8, background: LIGHT.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={16} color={LIGHT.ink} /></button>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: LIGHT.ink }}>{viewMonth.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}</div>
          <button className="tap" onClick={() => changeMonth(1)} style={{ width: 30, height: 30, borderRadius: 8, background: LIGHT.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={16} color={LIGHT.ink} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: LIGHT.sub, padding: '4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {gridCells.map((iso, i) => {
            if (!iso) return <div key={i} />
            const dayNum = parseInt(iso.slice(-2), 10)
            const count = jobCountByDate[iso] || 0
            const isSelected = iso === selectedDate
            const isToday = iso === todayISO()
            return (
              <button key={i} className="tap" onClick={() => setSelectedDate(iso)} style={{
                aspectRatio: '1', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                background: isSelected ? LIGHT.ink : 'transparent', border: isToday && !isSelected ? `1.5px solid ${LIGHT.accent}` : '1.5px solid transparent',
              }}>
                <span style={{ fontSize: 12.5, fontWeight: isSelected ? 700 : 500, color: isSelected ? LIGHT.bg : LIGHT.ink }}>{dayNum}</span>
                {count > 0 && <div style={{ width: 4, height: 4, borderRadius: 2, background: isSelected ? LIGHT.accentSoft : LIGHT.accent }} />}
              </button>
            )
          })}
        </div>
      </div>

      <SectionLabel>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}</SectionLabel>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dayJobs.map((j) => {
            const s = STATUS_META[j.status]
            return (
              <div key={j.id} style={{ background: LIGHT.card, borderRadius: 16, padding: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 54, flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: LIGHT.sub, lineHeight: 1.3 }}>{j.scheduled_window || '—'}</div>
                <div style={{ width: 1, alignSelf: 'stretch', background: LIGHT.border }} />
                <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: LIGHT.ink }}>{j.description}</div>
                  <div style={{ fontSize: 12, color: LIGHT.sub }}>{j.customers?.name || 'No customer'} · {j.assigned_tech ? j.assigned_tech.name : 'Unassigned'}</div>
                </div>
                <Badge bg={s.bg} fg={s.fg}>{s.label}</Badge>
              </div>
            )
          })}
          {dayJobs.length === 0 && <EmptyState>Nothing booked this day.</EmptyState>}
        </div>
      )}
    </>
  )
}
