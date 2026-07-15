import { useEffect, useState } from 'react'
import { CheckCircle2, DollarSign, Plus, X, Route } from 'lucide-react'
import { listJobs, listJobTypes, listTeamTechs, listTechLocationsById, assignJob, findOrCreateCustomer, createJob, distanceKm } from '../lib/jobs'
import { LIGHT } from '../theme'
import { SectionLabel, Badge, EmptyState, money, initialsOf, STATUS_META } from './ui'
import { FieldLabel, TextInput, PrimaryButton, ErrorText, usePendingAction } from '../auth/ui'

const COLUMNS = ['unassigned', 'assigned', 'in_progress', 'done']

function depositAmount(high, depositPct) {
  return Math.round((high * (depositPct / 100)) / 5) * 5
}

// Ported from app-demo.jsx's JobsBoard. The "sorted by distance" assign
// picker is real haversine math (lib/jobs.js's distanceKm) instead of the
// demo's fake per-pair hash, but shows "—" until jobs/techs actually have
// lat/lng - there's no geocoding pipeline wired up yet.
export default function JobsBoard({ company }) {
  const [jobs, setJobs] = useState([])
  const [techs, setTechs] = useState([])
  const [techLocations, setTechLocations] = useState({})
  const [jobTypes, setJobTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pickerFor, setPickerFor] = useState(null)
  const [newJobOpen, setNewJobOpen] = useState(false)

  async function reload() {
    const [j, t, locs, jt] = await Promise.all([listJobs(), listTeamTechs(), listTechLocationsById(), listJobTypes()])
    setJobs(j)
    setTechs(t)
    setTechLocations(locs)
    setJobTypes(jt)
  }

  useEffect(() => {
    setLoading(true)
    reload().catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [])

  async function handleAssign(jobId, techId, currentStatus) {
    await assignJob(jobId, techId, currentStatus)
    setPickerFor(null)
    await reload()
  }

  if (loading) return <EmptyState>Loading…</EmptyState>
  if (error) return <EmptyState>{error}</EmptyState>

  const pickerJob = jobs.find((j) => j.id === pickerFor)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionLabel>Job Board</SectionLabel>
        <button className="tap" onClick={() => setNewJobOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: LIGHT.accent, background: LIGHT.accentSoft, borderRadius: 8, padding: '6px 10px' }}>
          <Plus size={13} /> New Job
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {COLUMNS.map((col) => {
          const colJobs = jobs.filter((j) => j.status === col)
          const meta = STATUS_META[col]
          return (
            <div key={col}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Badge bg={meta.bg} fg={meta.fg}>{meta.label}</Badge>
                <span style={{ fontSize: 12, color: LIGHT.sub }}>{colJobs.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colJobs.map((j) => {
                  const tech = j.assigned_tech
                  const needsDeposit = company && j.price_high != null && j.price_high >= company.deposit_threshold
                  const suggested = !tech && techs.length > 0 ? techs[0] : null
                  return (
                    <div key={j.id} style={{ background: LIGHT.card, borderRadius: 14, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: LIGHT.ink }}>{j.description}</div>
                          <div style={{ fontSize: 12, color: LIGHT.sub }}>{j.customers?.name || 'No customer'} · {j.address}</div>
                        </div>
                        {tech && <div style={{ width: 26, height: 26, borderRadius: 13, background: LIGHT.accentSoft, color: LIGHT.accent, fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initialsOf(tech.name)}</div>}
                        {!tech && suggested && (
                          <button className="tap" onClick={() => handleAssign(j.id, suggested.id, j.status)} style={{ fontSize: 11.5, fontWeight: 600, color: '#fff', background: LIGHT.accent, borderRadius: 8, padding: '7px 10px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <CheckCircle2 size={12} /> Assign {suggested.name.split(' ')[0]}
                          </button>
                        )}
                        <button className="tap" onClick={() => setPickerFor(j.id)} style={{ fontSize: 16, color: LIGHT.sub, padding: '4px 6px', flexShrink: 0 }}>⋯</button>
                      </div>
                      {needsDeposit && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${LIGHT.border}`, fontSize: 11, color: LIGHT.sub, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <DollarSign size={11} color={LIGHT.accent} /> Deposit due: {money(depositAmount(j.price_high, company.deposit_pct))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {colJobs.length === 0 && <div style={{ fontSize: 12, color: LIGHT.sub, padding: '6px 2px' }}>Nothing here.</div>}
              </div>
            </div>
          )
        })}
      </div>

      {pickerJob && (
        <AssignPicker
          job={pickerJob}
          techs={techs}
          techLocations={techLocations}
          onAssign={(techId) => handleAssign(pickerJob.id, techId, pickerJob.status)}
          onClose={() => setPickerFor(null)}
        />
      )}
      {newJobOpen && (
        <NewJobModal
          jobTypes={jobTypes}
          onClose={() => setNewJobOpen(false)}
          onCreated={async () => { setNewJobOpen(false); await reload() }}
        />
      )}
    </>
  )
}

function AssignPicker({ job, techs, techLocations, onAssign, onClose }) {
  function distanceTo(tech) {
    const loc = techLocations[tech.id]
    return distanceKm(job.lat, job.lng, loc?.lat, loc?.lng)
  }
  const ranked = [...techs].sort((a, b) => {
    const da = distanceTo(a)
    const db = distanceTo(b)
    if (da == null && db == null) return a.name.localeCompare(b.name)
    if (da == null) return 1
    if (db == null) return -1
    return da - db
  })
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div style={{ background: LIGHT.card, borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, color: LIGHT.ink, marginBottom: 2 }}>Assign to</div>
        <div style={{ fontSize: 11.5, color: LIGHT.sub, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}><Route size={11} /> Sorted by distance where known</div>
        {ranked.map((t) => {
          const d = distanceTo(t)
          return (
            <button key={t.id} className="tap" onClick={() => onAssign(t.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px', textAlign: 'left' }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: LIGHT.accentSoft, color: LIGHT.accent, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initialsOf(t.name)}</div>
              <div style={{ flex: 1 }}><span style={{ fontSize: 14, color: LIGHT.ink }}>{t.name}</span></div>
              <span style={{ fontSize: 12, color: LIGHT.sub }}>{d != null ? `${d.toFixed(1)} km away` : '—'}</span>
            </button>
          )
        })}
        {techs.length === 0 && <div style={{ fontSize: 13, color: LIGHT.sub }}>No team members yet.</div>}
      </div>
    </div>
  )
}

function NewJobModal({ jobTypes, onClose, onCreated }) {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [jobTypeId, setJobTypeId] = useState(jobTypes[0]?.id || '')
  const [urgency, setUrgency] = useState('standard')
  const [priceLow, setPriceLow] = useState('')
  const [priceHigh, setPriceHigh] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledWindow, setScheduledWindow] = useState('')
  const { loading, error, run } = usePendingAction()

  function submit() {
    run(async () => {
      const customer = await findOrCreateCustomer({ name: customerName, phone: customerPhone, address })
      const jobType = jobTypes.find((jt) => jt.id === jobTypeId)
      await createJob({
        customerId: customer.id,
        jobTypeId: jobType?.id || null,
        description: jobType?.label || 'Service call',
        address,
        urgency,
        scheduledDate,
        scheduledWindow,
        priceLow: priceLow ? Number(priceLow) : null,
        priceHigh: priceHigh ? Number(priceHigh) : null,
      })
      onCreated()
    })
  }

  const canSubmit = customerName.trim() && address.trim() && jobTypeId && !loading

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }} onClick={onClose}>
      <div style={{ background: LIGHT.card, borderRadius: 20, padding: 20, maxWidth: 380, width: '100%', maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: LIGHT.ink }}>New Job</div>
          <button className="tap" onClick={onClose}><X size={18} color={LIGHT.sub} /></button>
        </div>

        <FieldLabel>Customer name</FieldLabel>
        <TextInput value={customerName} onChange={setCustomerName} placeholder="Sarah Chen" />
        <FieldLabel>Customer phone</FieldLabel>
        <TextInput value={customerPhone} onChange={setCustomerPhone} placeholder="(403) 555-0119" type="tel" />
        <FieldLabel>Job address</FieldLabel>
        <TextInput value={address} onChange={setAddress} placeholder="412 17 Ave SE" />

        <FieldLabel>Job type</FieldLabel>
        <select value={jobTypeId} onChange={(e) => setJobTypeId(e.target.value)} style={{ width: '100%', background: '#F5F5F7', border: `1px solid ${LIGHT.border}`, borderRadius: 10, fontSize: 14, padding: '11px 13px', marginBottom: 14, color: LIGHT.ink }}>
          {jobTypes.length === 0 && <option value="">No job types set up</option>}
          {jobTypes.map((jt) => <option key={jt.id} value={jt.id}>{jt.label}</option>)}
        </select>

        <FieldLabel>Urgency</FieldLabel>
        <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={{ width: '100%', background: '#F5F5F7', border: `1px solid ${LIGHT.border}`, borderRadius: 10, fontSize: 14, padding: '11px 13px', marginBottom: 14, color: LIGHT.ink }}>
          <option value="standard">Standard</option>
          <option value="sameday">Same-Day</option>
          <option value="emergency">Emergency</option>
        </select>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Price low</FieldLabel>
            <TextInput value={priceLow} onChange={setPriceLow} placeholder="320" type="number" />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Price high</FieldLabel>
            <TextInput value={priceHigh} onChange={setPriceHigh} placeholder="385" type="number" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Date</FieldLabel>
            <TextInput value={scheduledDate} onChange={setScheduledDate} type="date" />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Window</FieldLabel>
            <TextInput value={scheduledWindow} onChange={setScheduledWindow} placeholder="9:00-11:00 AM" />
          </div>
        </div>

        <ErrorText>{error}</ErrorText>
        <PrimaryButton onClick={submit} disabled={!canSubmit}>
          {loading ? 'Creating…' : 'Create Job'}
        </PrimaryButton>
      </div>
    </div>
  )
}
