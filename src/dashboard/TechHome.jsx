import { useEffect, useState } from 'react'
import { Clock, CheckCircle2, Clock3, Navigation, Play, MapPin, ChevronRight, X, Phone, Users, DollarSign } from 'lucide-react'
import { listJobsForTechToday, advanceJobStatus, updateJobNotes } from '../lib/jobs'
import { getOpenTimeEntry, clockIn, clockOut } from '../lib/timeEntries'
import { LIGHT } from '../theme'
import { SectionLabel, Badge, EmptyState, money, URGENCY_STYLE } from './ui'
import { FieldLabel } from '../auth/ui'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Ported from app-demo.jsx's TechHome. The AI job-report generation (a raw
// client-side call to the Anthropic API with no API key/backend proxy) and
// the "on the way" SMS preview (no real SMS backend) are both dropped -
// Mark Complete now just saves the tech's notes directly to jobs.notes.
export default function TechHome({ techId }) {
  const [jobs, setJobs] = useState([])
  const [openEntry, setOpenEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailFor, setDetailFor] = useState(null)
  const [reportFor, setReportFor] = useState(null)

  async function reload() {
    const [j, entry] = await Promise.all([listJobsForTechToday(techId, todayISO()), getOpenTimeEntry(techId)])
    setJobs(j)
    setOpenEntry(entry)
  }

  useEffect(() => {
    setLoading(true)
    reload().catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [techId])

  async function toggleClock() {
    if (openEntry) await clockOut(openEntry.id)
    else await clockIn(techId)
    await reload()
  }

  async function handleStart(job) {
    await advanceJobStatus(job.id, 'in_progress', techId)
    await reload()
  }

  async function handleComplete(jobId, notes) {
    await advanceJobStatus(jobId, 'done', techId, { notes })
    setReportFor(null)
    await reload()
  }

  if (loading) return <EmptyState>Loading…</EmptyState>
  if (error) return <EmptyState>{error}</EmptyState>

  const completedToday = jobs.filter((j) => j.status === 'done').length
  const remaining = jobs.filter((j) => j.status !== 'done').length

  return (
    <>
      <div style={{ background: LIGHT.card, borderRadius: 16, padding: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: openEntry ? LIGHT.successSoft : LIGHT.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Clock size={16} color={openEntry ? LIGHT.success : LIGHT.sub} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: LIGHT.ink }}>{openEntry ? 'On shift' : 'Off shift'}</div>
          <div style={{ fontSize: 11.5, color: LIGHT.sub }}>
            {openEntry ? `Clocked in at ${new Date(openEntry.clock_in).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })}` : 'Not clocked in'}
          </div>
        </div>
        <button className="tap" onClick={toggleClock} style={{ fontSize: 12, fontWeight: 600, color: openEntry ? LIGHT.alert : LIGHT.success, border: `1px solid ${openEntry ? LIGHT.alertSoft : LIGHT.successSoft}`, borderRadius: 8, padding: '7px 12px' }}>
          {openEntry ? 'Clock Out' : 'Clock In'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <MiniStat icon={CheckCircle2} value={completedToday} label="Done Today" />
        <MiniStat icon={Clock3} value={remaining} label="Remaining" />
      </div>

      <SectionLabel>Today's Jobs</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {jobs.map((job) => {
          const u = URGENCY_STYLE[job.urgency]
          const isDone = job.status === 'done'
          const isInProgress = job.status === 'in_progress'
          return (
            <div key={job.id} style={{ background: LIGHT.card, borderRadius: 18, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', opacity: isDone ? 0.55 : 1 }}>
              <button className="tap" onClick={() => setDetailFor(job)} style={{ display: 'block', width: '100%', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: LIGHT.sub, fontWeight: 600 }}>{job.scheduled_window || '—'}</div>
                  <Badge bg={u.bg} fg={u.fg}>{u.label}</Badge>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: LIGHT.ink, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{job.description} <ChevronRight size={15} color={LIGHT.sub} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: LIGHT.sub, marginBottom: 14 }}><MapPin size={13} color={LIGHT.accent} /> {job.address}</div>
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', border: `1px solid ${LIGHT.border}`, borderRadius: 10, padding: '10px 0', fontSize: 13, color: LIGHT.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}><Navigation size={13} /> Navigate</a>
                {!isDone && !isInProgress && <button className="tap" onClick={() => handleStart(job)} style={{ flex: 1, textAlign: 'center', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, background: LIGHT.infoSoft, color: LIGHT.info, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Play size={13} /> Start Job</button>}
                {isInProgress && <button className="tap" onClick={() => setReportFor(job)} style={{ flex: 1, textAlign: 'center', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, background: LIGHT.ink, color: LIGHT.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><CheckCircle2 size={13} /> Mark Complete</button>}
                {isDone && <div style={{ flex: 1, textAlign: 'center', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, background: LIGHT.successSoft, color: LIGHT.success, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><CheckCircle2 size={13} /> Done</div>}
              </div>
            </div>
          )
        })}
        {jobs.length === 0 && <EmptyState>No jobs assigned today.</EmptyState>}
      </div>

      {reportFor && <CompleteJobModal job={reportFor} onClose={() => setReportFor(null)} onComplete={(notes) => handleComplete(reportFor.id, notes)} />}
      {detailFor && (
        <JobDetailModal
          job={detailFor}
          onClose={() => setDetailFor(null)}
          onSaveNotes={async (notes) => { await updateJobNotes(detailFor.id, notes); await reload() }}
        />
      )}
    </>
  )
}

function MiniStat({ icon: Icon, value, label }) {
  return (
    <div style={{ background: LIGHT.card, borderRadius: 14, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', textAlign: 'center' }}>
      <Icon size={15} color={LIGHT.accent} style={{ marginBottom: 5 }} />
      <div style={{ fontSize: 15, fontWeight: 700, color: LIGHT.ink }}>{value}</div>
      <div style={{ fontSize: 9.5, color: LIGHT.sub, fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <Icon size={14} color={LIGHT.accent} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, color: LIGHT.sub, width: 76, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: LIGHT.ink, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function JobDetailModal({ job, onClose, onSaveNotes }) {
  const [notes, setNotes] = useState(job.notes || '')
  const [saved, setSaved] = useState(false)
  const u = URGENCY_STYLE[job.urgency]

  async function save() {
    await onSaveNotes(notes)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 60 }} onClick={onClose}>
      <div style={{ background: LIGHT.card, borderRadius: '20px 20px 0 0', padding: 22, width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <Badge bg={u.bg} fg={u.fg}>{u.label}</Badge>
            <div style={{ fontSize: 19, fontWeight: 700, color: LIGHT.ink, marginTop: 8 }}>{job.description}</div>
          </div>
          <button className="tap" onClick={onClose}><X size={20} color={LIGHT.sub} /></button>
        </div>
        <div style={{ fontSize: 13, color: LIGHT.sub, marginBottom: 18 }}>{job.scheduled_window} · {job.scheduled_date}</div>

        <div style={{ background: LIGHT.bg, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <DetailRow icon={Users} label="Customer" value={job.customers?.name || '—'} />
          <DetailRow icon={MapPin} label="Address" value={job.address} />
          <DetailRow icon={DollarSign} label="Estimated" value={job.price_low != null ? `${money(job.price_low)} - ${money(job.price_high)}` : '—'} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {job.customers?.phone && (
            <a href={`tel:${job.customers.phone.replace(/[^0-9]/g, '')}`} className="tap" style={{ flex: 1, textAlign: 'center', background: LIGHT.success, color: '#fff', borderRadius: 10, padding: '12px 0', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
              <Phone size={14} /> Call {job.customers.name.split(' ')[0]}
            </a>
          )}
          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`} target="_blank" rel="noopener noreferrer" className="tap" style={{ flex: 1, textAlign: 'center', border: `1px solid ${LIGHT.border}`, color: LIGHT.ink, borderRadius: 10, padding: '12px 0', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
            <Navigation size={14} /> Navigate
          </a>
        </div>

        <FieldLabel>Job Notes</FieldLabel>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering about this job or customer, gate code, dog in the yard, parts needed next time..."
          rows={4}
          style={{ width: '100%', background: LIGHT.bg, border: `1px solid ${LIGHT.border}`, borderRadius: 10, fontSize: 13, padding: 12, color: LIGHT.ink, marginBottom: 10, resize: 'none' }}
        />
        <button className="tap" onClick={save} style={{ width: '100%', textAlign: 'center', background: LIGHT.ink, color: LIGHT.bg, border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 600 }}>
          {saved ? 'Saved' : 'Save Notes'}
        </button>
      </div>
    </div>
  )
}

function CompleteJobModal({ job, onClose, onComplete }) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    try {
      await onComplete(notes)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }} onClick={onClose}>
      <div style={{ background: LIGHT.card, borderRadius: 20, padding: 20, maxWidth: 380, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, color: LIGHT.ink, marginBottom: 2 }}>Finish {job.description}</div>
        <div style={{ fontSize: 11.5, color: LIGHT.sub, marginBottom: 14 }}>What did you find and do? This gets saved to the job's file.</div>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. old wax ring failed, replaced ring + bolts, tested flush 3x no leak"
          rows={4}
          style={{ width: '100%', background: LIGHT.bg, border: `1px solid ${LIGHT.border}`, borderRadius: 10, fontSize: 13, padding: 12, color: LIGHT.ink, marginBottom: 14, resize: 'none' }}
        />
        <button className="tap" onClick={submit} disabled={saving} style={{ width: '100%', textAlign: 'center', background: LIGHT.success, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 13.5, fontWeight: 600 }}>
          {saving ? 'Saving…' : 'Confirm & Complete Job'}
        </button>
      </div>
    </div>
  )
}
