import { useState } from 'react'
import { joinCompany } from '../lib/auth'
import { AuthShell, BackRow, FieldLabel, TextInput, PrimaryButton, ErrorText, LIGHT, usePendingAction } from './ui'

// Ported from app-demo.jsx's EmployeeSignup, minus the email/password
// fields (already collected on SignupScreen pre-auth). Wired to the real
// join_company_as_tech RPC - an invalid code surfaces the same "doesn't
// match any company" message the demo showed for its local-state check.
export default function EmployeeJoinScreen({ onBack, onDone }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const { loading, error, run, setError } = usePendingAction()

  function submit() {
    if (!name.trim()) return setError('Enter your name.')
    if (!code.trim()) return setError('Enter your company join code.')
    run(async () => {
      try {
        await joinCompany({ joinCode: code, name })
        onDone()
      } catch (err) {
        if (err.message.includes('invalid join code')) {
          throw new Error("That join code doesn't match any company. Double-check with your employer.")
        }
        if (err.message.includes('seat_limit_reached')) {
          throw new Error("This company's plan is at its team-member limit. Ask your employer to upgrade their plan before you can join.")
        }
        throw err
      }
    })
  }

  return (
    <AuthShell>
      <BackRow onBack={onBack} />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: LIGHT.ink, marginBottom: 20 }}>Join your team</h1>
      <div style={{ background: LIGHT.card, borderRadius: 20, padding: 22, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <FieldLabel>Your name</FieldLabel>
        <TextInput value={name} onChange={setName} placeholder="Dave Martinez" />
        <FieldLabel>Company join code</FieldLabel>
        <TextInput value={code} onChange={setCode} placeholder="A1B2-C3D4" />
        <ErrorText>{error}</ErrorText>
        <PrimaryButton onClick={submit} disabled={loading}>
          {loading ? 'Joining…' : 'Join Company'}
        </PrimaryButton>
      </div>
    </AuthShell>
  )
}
