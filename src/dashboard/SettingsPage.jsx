import { useEffect, useState } from 'react'
import { Trash2, Plus, Download, CreditCard } from 'lucide-react'
import { updateCompanySettings } from '../lib/settings'
import { getMyPlan, getMySubscriptionDetail, cancelMySubscription } from '../lib/plans'
import { listLocations, createLocation, deleteLocation } from '../lib/locations'
import { downloadCompanyExport } from '../lib/dataExport'
import { LIGHT } from '../theme'
import { SectionLabel, EmptyState, ConfirmDialog } from './ui'
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
      <LocationsSection />
      <BillingSection />
      <DataExportSection company={company} />
    </>
  )
}

// The follow-through on "no lock-in, cancel anytime" - the plan and price
// alone (getMyPlan) don't answer "what happens if I cancel", so this shows
// the real Stripe-backed state and puts the cancel action behind a
// confirmation that says exactly that.
function BillingSection() {
  const [sub, setSub] = useState(undefined)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function load() {
    getMySubscriptionDetail().then(setSub).catch((err) => setError(err.message || String(err)))
  }
  useEffect(load, [])

  async function confirmCancel() {
    setBusy(true)
    setError('')
    try {
      await cancelMySubscription()
      setConfirming(false)
      load()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  if (sub === undefined) return null
  // Free/starter company with no Stripe subscription yet - nothing to bill
  // or cancel, so there's nothing useful to show here.
  if (!sub || !sub.stripe_subscription_id) return null

  const periodEndLabel = sub.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div style={{ marginTop: 28 }}>
      <SectionLabel>Billing</SectionLabel>
      <div style={{ background: LIGHT.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sub.cancel_at_period_end ? 12 : 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: LIGHT.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CreditCard size={16} color={LIGHT.accent} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: LIGHT.ink, textTransform: 'capitalize' }}>{sub.plan} plan</div>
            <div style={{ fontSize: 11.5, color: LIGHT.sub }}>
              {sub.cancel_at_period_end
                ? periodEndLabel ? `Cancels on ${periodEndLabel} - you keep full access until then.` : 'Scheduled to cancel at the end of this billing period.'
                : periodEndLabel ? `Renews ${periodEndLabel}.` : 'Active.'}
            </div>
          </div>
        </div>
        <ErrorText>{error}</ErrorText>
        {!sub.cancel_at_period_end && (
          <button
            className="tap"
            onClick={() => setConfirming(true)}
            style={{ fontSize: 12, fontWeight: 600, color: LIGHT.alert }}
          >
            Cancel Subscription
          </button>
        )}
      </div>
      {confirming && (
        <ConfirmDialog
          title="Cancel your subscription?"
          message={`You'll keep full access through the end of your current billing period${periodEndLabel ? ` (${periodEndLabel})` : ''}. After that, your dashboard access will be paused and no further charges will be made. You can export your data any time before or after - see below.`}
          confirmLabel="Cancel Subscription"
          busy={busy}
          error={error}
          onConfirm={confirmCancel}
          onCancel={() => { if (!busy) { setConfirming(false); setError('') } }}
        />
      )}
    </div>
  )
}

// The literal follow-through on the pricing page's "no lock-in" line - a
// real downloadable file, not a "contact support" promise. Pure client-side
// read + Blob download (see lib/dataExport.js), so there's no server-side
// export job to track, expire, or clean up.
function DataExportSection({ company }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleExport() {
    setBusy(true)
    setError('')
    try {
      await downloadCompanyExport(company)
      setDone(true)
      setTimeout(() => setDone(false), 2500)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 28 }}>
      <SectionLabel>Your Data</SectionLabel>
      <div style={{ background: LIGHT.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 13, color: LIGHT.ink, fontWeight: 700, marginBottom: 4 }}>Export Your Data</div>
        <div style={{ fontSize: 12, color: LIGHT.sub, lineHeight: 1.5, marginBottom: 14 }}>
          Downloads every job and client record for your company as one file. It's yours - no
          lock-in, no waiting on a support request.
        </div>
        <ErrorText>{error}</ErrorText>
        <button
          className="tap"
          onClick={handleExport}
          disabled={busy}
          style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: LIGHT.ink, background: LIGHT.bg, border: `1px solid ${LIGHT.border}`, borderRadius: 10, padding: '9px 14px' }}
        >
          <Download size={14} /> {busy ? 'Preparing…' : done ? 'Downloaded' : 'Export Your Data'}
        </button>
      </div>
    </div>
  )
}

// Fleet-tier ('pro' plan) only - migration 056. Hidden entirely on
// Starter/Growth rather than shown-and-disabled, since a company on a
// lower tier has no locations table entries to manage yet anyway.
function LocationsSection() {
  const [allowed, setAllowed] = useState(false)
  const [locations, setLocations] = useState(undefined)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const { loading, error, run, setError } = usePendingAction()

  function load() {
    listLocations().then(setLocations).catch((err) => setError(err.message || String(err)))
  }
  useEffect(() => {
    getMyPlan().then((plan) => {
      setAllowed(plan === 'pro')
      if (plan === 'pro') load()
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!allowed) return null

  function add() {
    if (!name.trim()) return setError('Enter a location name.')
    run(async () => {
      await createLocation({ name: name.trim(), address: address.trim() })
      setName('')
      setAddress('')
      load()
    })
  }

  async function remove(id) {
    setError('')
    try {
      await deleteLocation(id)
      load()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <SectionLabel>Locations</SectionLabel>
      <div style={{ fontSize: 12, color: LIGHT.sub, marginBottom: 12, lineHeight: 1.4 }}>
        Each location gets its own jobs, calendar, and team - assign a tech or office
        admin to one from the Team tab. Leave someone unassigned and they see every job
        company-wide, same as before this feature existed.
      </div>
      <div style={{ background: LIGHT.card, borderRadius: 16, padding: 16, marginBottom: 12 }}>
        {locations === undefined && <div style={{ fontSize: 12, color: LIGHT.sub }}>Loading…</div>}
        {locations && locations.length === 0 && <EmptyState>No locations yet - add your first one below.</EmptyState>}
        {locations && locations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: locations.length ? 4 : 0 }}>
            {locations.map((loc) => (
              <div key={loc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: LIGHT.ink }}>{loc.name}</div>
                  {loc.address && <div style={{ fontSize: 11.5, color: LIGHT.sub }}>{loc.address}</div>}
                </div>
                <button className="tap" onClick={() => remove(loc.id)} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 15, background: LIGHT.alertSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={13} color={LIGHT.alert} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ background: LIGHT.card, borderRadius: 16, padding: 16 }}>
        <FieldLabel htmlFor="field-location-name-1">Location name</FieldLabel>
        <TextInput id="field-location-name-1" value={name} onChange={setName} placeholder="Downtown Shop" />
        <FieldLabel htmlFor="field-address-optional-1">Address (optional)</FieldLabel>
        <TextInput id="field-address-optional-1" value={address} onChange={setAddress} placeholder="123 Main St" />
        <ErrorText>{error}</ErrorText>
        <PrimaryButton onClick={add} disabled={loading}>
          <Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} /> {loading ? 'Adding…' : 'Add Location'}
        </PrimaryButton>
      </div>
    </div>
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
          <FieldLabel htmlFor="field-base-fee-1">Base fee ($)</FieldLabel>
          <TextInput id="field-base-fee-1" value={baseFee} onChange={setBaseFee} placeholder="149" />
        </div>
        <div>
          <FieldLabel htmlFor="field-default-hourly-rate-1">Default hourly rate ($)</FieldLabel>
          <TextInput id="field-default-hourly-rate-1" value={hourlyRate} onChange={setHourlyRate} placeholder="135" />
        </div>
        <div>
          <FieldLabel htmlFor="field-same-day-multiplier-1">Same-day multiplier</FieldLabel>
          <TextInput id="field-same-day-multiplier-1" value={samedayMultiplier} onChange={setSamedayMultiplier} placeholder="1.25" />
        </div>
        <div>
          <FieldLabel htmlFor="field-emergency-multiplier-1">Emergency multiplier</FieldLabel>
          <TextInput id="field-emergency-multiplier-1" value={emergencyMultiplier} onChange={setEmergencyMultiplier} placeholder="1.75" />
        </div>
        <div>
          <FieldLabel htmlFor="field-deposit-threshold-1">Deposit threshold ($)</FieldLabel>
          <TextInput id="field-deposit-threshold-1" value={depositThreshold} onChange={setDepositThreshold} placeholder="800" />
        </div>
        <div>
          <FieldLabel htmlFor="field-deposit-1">Deposit (%)</FieldLabel>
          <TextInput id="field-deposit-1" value={depositPct} onChange={setDepositPct} placeholder="20" />
        </div>
        <div>
          <FieldLabel htmlFor="field-tech-commission-1">Tech commission (%)</FieldLabel>
          <TextInput id="field-tech-commission-1" value={commissionPct} onChange={setCommissionPct} placeholder="15" />
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
            <FieldLabel htmlFor="field-threshold-1">Threshold ($)</FieldLabel>
            <TextInput id="field-threshold-1" value={financingThreshold} onChange={setFinancingThreshold} placeholder="1500" />
          </div>
          <div>
            <FieldLabel htmlFor="field-financing-partner-link-1">Financing partner link</FieldLabel>
            <TextInput id="field-financing-partner-link-1" value={financingPartnerUrl} onChange={setFinancingPartnerUrl} placeholder="https://www.wisetack.com/apply/..." />
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
          <FieldLabel htmlFor="field-goaltype-revenue-target-revenue-target-job-count-1">{goalType === 'revenue' ? 'Target revenue ($)' : 'Target job count'}</FieldLabel>
          <TextInput id="field-goaltype-revenue-target-revenue-target-job-count-1" value={goalTarget} onChange={setGoalTarget} placeholder={goalType === 'revenue' ? '40000' : '60'} />
        </div>
      )}

      <ErrorText>{error}</ErrorText>
      {saved && !error && <div style={{ fontSize: 12, color: LIGHT.success, marginBottom: 10 }}>Saved.</div>}
      <PrimaryButton onClick={save} disabled={loading} style={{ marginTop: 4 }}>{loading ? 'Saving…' : 'Save Goal'}</PrimaryButton>
    </div>
  )
}
