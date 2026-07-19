import { useState } from 'react'
import { updateCompanySettings } from '../lib/settings'
import { LIGHT } from '../theme'
import { SectionLabel } from './ui'
import { FieldLabel, TextInput, PrimaryButton, ErrorText, Checkbox, usePendingAction } from '../auth/ui'

// Owner-only settings. Starts with just Pricing & Revenue - the numbers
// companies.base_fee/hourly_rate/etc already drove job pricing and Alex's
// (PickUp's) quotes with zero UI to edit them until now. Team/General/
// Integrations sections aren't built yet (see AUTH.md "Not built yet").
export default function SettingsPage({ company, onSaved }) {
  return (
    <>
      <SectionLabel>Settings</SectionLabel>
      <PricingRevenueSection company={company} onSaved={onSaved} />
      <GoalsSection company={company} onSaved={onSaved} />
    </>
  )
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function PricingRevenueSection({ company, onSaved }) {
  const [baseFee, setBaseFee] = useState(String(company?.base_fee ?? ''))
  const [hourlyRate, setHourlyRate] = useState(String(company?.hourly_rate ?? ''))
  const [samedayMultiplier, setSamedayMultiplier] = useState(String(company?.sameday_multiplier ?? ''))
  const [emergencyMultiplier, setEmergencyMultiplier] = useState(String(company?.emergency_multiplier ?? ''))
  const [depositThreshold, setDepositThreshold] = useState(String(company?.deposit_threshold ?? ''))
  const [depositPct, setDepositPct] = useState(String(company?.deposit_pct ?? ''))
  const [commissionPct, setCommissionPct] = useState(String(company?.commission_pct ?? ''))

  const [financingEnabled, setFinancingEnabled] = useState(!!company?.financing_enabled)
  const [financingThreshold, setFinancingThreshold] = useState(String(company?.financing_threshold ?? '1500'))
  const [financingPartnerUrl, setFinancingPartnerUrl] = useState(company?.financing_partner_url || '')

  const { loading, error, run, setError } = usePendingAction()
  const [saved, setSaved] = useState(false)

  function save() {
    const patch = {
      base_fee: num(baseFee),
      hourly_rate: num(hourlyRate),
      sameday_multiplier: num(samedayMultiplier),
      emergency_multiplier: num(emergencyMultiplier),
      deposit_threshold: num(depositThreshold),
      deposit_pct: num(depositPct),
      commission_pct: num(commissionPct),
      financing_enabled: financingEnabled,
      financing_threshold: num(financingThreshold) ?? 1500,
      financing_partner_url: financingPartnerUrl.trim() || null,
    }
    if (Object.entries(patch).some(([k, v]) => v === null && k !== 'financing_partner_url')) {
      return setError('Enter valid numbers for every field.')
    }
    if (financingEnabled && !financingPartnerUrl.trim()) {
      return setError('Add your financing partner link before turning financing on.')
    }
    setSaved(false)
    run(async () => {
      const updated = await updateCompanySettings(company.id, patch)
      setSaved(true)
      onSaved?.(updated)
    })
  }

  return (
    <div style={{ background: LIGHT.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: LIGHT.ink, marginBottom: 4 }}>Pricing &amp; Revenue</div>
      <div style={{ fontSize: 12, color: LIGHT.sub, marginBottom: 18, lineHeight: 1.4 }}>
        These numbers drive job pricing and PickUp's quotes company-wide. A service's own rate
        (Services tab) overrides the hourly rate below when it's set.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <FieldLabel>Base fee ($)</FieldLabel>
          <TextInput value={baseFee} onChange={setBaseFee} placeholder="149" />
        </div>
        <div>
          <FieldLabel>Default hourly rate ($)</FieldLabel>
          <TextInput value={hourlyRate} onChange={setHourlyRate} placeholder="135" />
        </div>
        <div>
          <FieldLabel>Same-day multiplier</FieldLabel>
          <TextInput value={samedayMultiplier} onChange={setSamedayMultiplier} placeholder="1.25" />
        </div>
        <div>
          <FieldLabel>Emergency multiplier</FieldLabel>
          <TextInput value={emergencyMultiplier} onChange={setEmergencyMultiplier} placeholder="1.75" />
        </div>
        <div>
          <FieldLabel>Deposit threshold ($)</FieldLabel>
          <TextInput value={depositThreshold} onChange={setDepositThreshold} placeholder="800" />
        </div>
        <div>
          <FieldLabel>Deposit (%)</FieldLabel>
          <TextInput value={depositPct} onChange={setDepositPct} placeholder="20" />
        </div>
        <div>
          <FieldLabel>Tech commission (%)</FieldLabel>
          <TextInput value={commissionPct} onChange={setCommissionPct} placeholder="15" />
        </div>
      </div>

      <div style={{ height: 1, background: LIGHT.border, margin: '18px 0' }} />

      <div style={{ fontSize: 13.5, fontWeight: 700, color: LIGHT.ink, marginBottom: 10 }}>Financing</div>
      <Checkbox
        checked={financingEnabled}
        onChange={setFinancingEnabled}
        label="Offer financing on larger jobs"
        hint="Shows an 'Ask about financing' note on any estimate at or above the threshold, linking out to your financing partner (e.g. Wisetack, Affirm)."
      />
      {financingEnabled && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 4 }}>
          <div>
            <FieldLabel>Threshold ($)</FieldLabel>
            <TextInput value={financingThreshold} onChange={setFinancingThreshold} placeholder="1500" />
          </div>
          <div>
            <FieldLabel>Financing partner link</FieldLabel>
            <TextInput value={financingPartnerUrl} onChange={setFinancingPartnerUrl} placeholder="https://www.wisetack.com/apply/..." />
          </div>
        </div>
      )}

      <ErrorText>{error}</ErrorText>
      {saved && !error && <div style={{ fontSize: 12, color: LIGHT.success, marginBottom: 10 }}>Saved.</div>}
      <PrimaryButton onClick={save} disabled={loading} style={{ marginTop: 4 }}>{loading ? 'Saving…' : 'Save Changes'}</PrimaryButton>
    </div>
  )
}

// Read by AnalyticsPage.jsx's progress bar. One goal at a time - picking
// "No goal" clears both columns rather than leaving a stale target
// sitting around unused.
function GoalsSection({ company, onSaved }) {
  const [goalType, setGoalType] = useState(company?.goal_type || 'none')
  const [goalTarget, setGoalTarget] = useState(company?.goal_target != null ? String(company.goal_target) : '')
  const { loading, error, run, setError } = usePendingAction()
  const [saved, setSaved] = useState(false)

  function save() {
    setSaved(false)
    if (goalType === 'none') {
      return run(async () => {
        const updated = await updateCompanySettings(company.id, { goal_type: null, goal_target: null })
        setSaved(true)
        onSaved?.(updated)
      })
    }
    const targetNum = num(goalTarget)
    if (targetNum === null || targetNum <= 0) return setError('Enter a target greater than 0.')
    run(async () => {
      const updated = await updateCompanySettings(company.id, { goal_type: goalType, goal_target: targetNum })
      setSaved(true)
      onSaved?.(updated)
    })
  }

  return (
    <div style={{ background: LIGHT.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', marginTop: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: LIGHT.ink, marginBottom: 4 }}>Monthly Goal</div>
      <div style={{ fontSize: 12, color: LIGHT.sub, marginBottom: 16, lineHeight: 1.4 }}>
        Shown as a progress bar on the Analytics tab. Pick one - revenue or job count, not both at once.
      </div>

      <FieldLabel>Goal type</FieldLabel>
      <select
        value={goalType}
        onChange={(e) => setGoalType(e.target.value)}
        style={{ width: '100%', background: '#F5F5F7', border: `1px solid ${LIGHT.border}`, borderRadius: 10, fontSize: 14, padding: '11px 13px', marginBottom: 14, color: LIGHT.ink }}
      >
        <option value="none">No goal</option>
        <option value="revenue">Monthly revenue</option>
        <option value="jobs">Monthly jobs completed</option>
      </select>

      {goalType !== 'none' && (
        <div style={{ marginBottom: 4 }}>
          <FieldLabel>{goalType === 'revenue' ? 'Target revenue ($)' : 'Target job count'}</FieldLabel>
          <TextInput value={goalTarget} onChange={setGoalTarget} placeholder={goalType === 'revenue' ? '40000' : '60'} />
        </div>
      )}

      <ErrorText>{error}</ErrorText>
      {saved && !error && <div style={{ fontSize: 12, color: LIGHT.success, marginBottom: 10 }}>Saved.</div>}
      <PrimaryButton onClick={save} disabled={loading} style={{ marginTop: 4 }}>{loading ? 'Saving…' : 'Save Goal'}</PrimaryButton>
    </div>
  )
}
