import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { LIGHT } from '../theme'
import { SectionLabel, ErrorState, LoadingState, EmptyState, Badge, money } from './ui'
import { FieldLabel, TextInput, PrimaryButton, ErrorText, usePendingAction } from '../auth/ui'
import { listAllJobTypes, createJobType, updateJobType, setJobTypeActive } from '../lib/jobTypes'

// The service catalog (job_types) pre-fills from a trade starter template
// at signup (see create_company_and_owner, migration 044) but from here on
// it's entirely this company's own data - add, edit, retire, or reprice
// anything, independent of what trade was picked during onboarding. This
// same table also drives the Jobs board's job-type picker and the AI
// receptionist's dynamically-generated script (see AUTH.md "Trade-agnostic
// service catalog"), so a change here reaches both automatically.
export default function ServiceCatalogPage({ company }) {
  const [jobTypes, setJobTypes] = useState(undefined)
  const [error, setError] = useState('')
  const [addingNew, setAddingNew] = useState(false)

  function load() {
    setError('')
    setJobTypes(undefined)
    listAllJobTypes().then(setJobTypes).catch((err) => setError(err.message || String(err)))
  }
  useEffect(load, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionLabel>Service Catalog</SectionLabel>
        {!addingNew && (
          <button className="tap" onClick={() => setAddingNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: LIGHT.accent, background: LIGHT.accentSoft, borderRadius: 8, padding: '6px 10px' }}>
            <Plus size={13} /> Add Service
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: LIGHT.sub, marginBottom: 16, lineHeight: 1.4 }}>
        These services show up when creating a job and drive the AI receptionist's quotes, if it's on your plan.
        Leave hourly rate blank to use your company default ({money(company?.hourly_rate)}/hr).
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && jobTypes === undefined && <LoadingState>Loading catalog…</LoadingState>}
      {jobTypes && jobTypes.length === 0 && !addingNew && <EmptyState>No services yet. Add your first one.</EmptyState>}

      {jobTypes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {jobTypes.map((jt) => (
            <JobTypeCard key={jt.id} jobType={jt} company={company} onSaved={load} />
          ))}
        </div>
      )}

      {addingNew && (
        <JobTypeCard isNew company={company} onSaved={() => { setAddingNew(false); load() }} onCancel={() => setAddingNew(false)} />
      )}
    </div>
  )
}

function JobTypeCard({ jobType, isNew, company, onSaved, onCancel }) {
  const [label, setLabel] = useState(jobType?.label || '')
  const [baseHours, setBaseHours] = useState(jobType ? String(jobType.base_hours) : '1')
  const [hourlyRate, setHourlyRate] = useState(jobType?.hourly_rate_override != null ? String(jobType.hourly_rate_override) : '')
  const [partsCost, setPartsCost] = useState(jobType ? String(jobType.parts_cost) : '0')
  const { loading, error, run, setError } = usePendingAction()
  const [toggleError, setToggleError] = useState('')
  const [togglingActive, setTogglingActive] = useState(false)

  function save() {
    if (!label.trim()) return setError('Service name is required.')
    const hoursNum = Number(baseHours)
    if (Number.isNaN(hoursNum) || hoursNum <= 0) return setError('Enter a valid number of hours.')
    const partsNum = Number(partsCost) || 0
    const rateNum = hourlyRate.trim() === '' ? null : Number(hourlyRate)
    if (rateNum !== null && (Number.isNaN(rateNum) || rateNum < 0)) return setError('Enter a valid hourly rate, or leave it blank.')

    run(async () => {
      if (isNew) {
        await createJobType({ companyId: company.id, label, baseHours: hoursNum, hourlyRateOverride: rateNum, partsCost: partsNum })
      } else {
        await updateJobType(jobType.id, { label: label.trim(), base_hours: hoursNum, hourly_rate_override: rateNum, parts_cost: partsNum })
      }
      onSaved()
    })
  }

  async function toggleActive() {
    setTogglingActive(true)
    setToggleError('')
    try {
      await setJobTypeActive(jobType.id, !jobType.active)
      onSaved()
    } catch (err) {
      setToggleError(err.message || String(err))
    } finally {
      setTogglingActive(false)
    }
  }

  return (
    <div style={{ background: LIGHT.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <FieldLabel>Service name</FieldLabel>
          <TextInput value={label} onChange={setLabel} placeholder="Drain Cleaning" />
        </div>
        <div>
          <FieldLabel>Est. hours</FieldLabel>
          <TextInput value={baseHours} onChange={setBaseHours} placeholder="1.5" />
        </div>
        <div>
          <FieldLabel>Hourly rate ($, blank = default)</FieldLabel>
          <TextInput value={hourlyRate} onChange={setHourlyRate} placeholder={String(company?.hourly_rate ?? '')} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <FieldLabel>Typical parts cost ($)</FieldLabel>
          <TextInput value={partsCost} onChange={setPartsCost} placeholder="80" />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {!isNew && <Badge bg={jobType.active ? LIGHT.successSoft : LIGHT.border} fg={jobType.active ? LIGHT.success : LIGHT.sub}>{jobType.active ? 'Active' : 'Inactive'}</Badge>}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {!isNew && (
            <button className="tap" onClick={toggleActive} disabled={togglingActive} style={{ fontSize: 12, fontWeight: 600, color: jobType.active ? LIGHT.alert : LIGHT.success }}>
              {togglingActive ? 'Saving…' : jobType.active ? 'Retire' : 'Reactivate'}
            </button>
          )}
          {isNew && onCancel && <button className="tap" onClick={onCancel} style={{ fontSize: 12, color: LIGHT.sub, fontWeight: 600 }}>Cancel</button>}
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <ErrorText>{toggleError}</ErrorText>
      <PrimaryButton onClick={save} disabled={loading} style={{ marginTop: 4 }}>{loading ? 'Saving…' : isNew ? 'Add Service' : 'Save Changes'}</PrimaryButton>
    </div>
  )
}
