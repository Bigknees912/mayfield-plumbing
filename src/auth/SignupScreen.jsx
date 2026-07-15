import { useState } from 'react'
import { signUpWithPassword, signInWithGoogle } from '../lib/auth'
import { AuthShell, BackRow, GoogleG, FieldLabel, TextInput, PrimaryButton, ErrorText, LIGHT, usePendingAction } from './ui'

// Generic account-creation screen - no owner/employee distinction here.
// That choice (and the business/join-code details) is collected on
// RoleChoiceScreen right after auth succeeds, because a real signUp() may
// need email confirmation before a session exists, so we can't reliably
// carry pre-auth form state across that gap (see AUTH.md).
export default function SignupScreen({ onBack, onNeedsConfirmation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { loading, error, run } = usePendingAction()

  function submit() {
    run(async () => {
      const data = await signUpWithPassword(email, password)
      if (!data.session) onNeedsConfirmation(email)
      // else: App.jsx's onAuthStateChange listener picks up the session.
    })
  }

  return (
    <AuthShell>
      <BackRow onBack={onBack} />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: LIGHT.ink, marginBottom: 20 }}>Create your account</h1>
      <div style={{ background: LIGHT.card, borderRadius: 20, padding: 22, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <button className="tap" onClick={() => run(signInWithGoogle)} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: `1px solid ${LIGHT.border}`, borderRadius: 12, padding: '12px 0', marginBottom: 16, fontSize: 14.5, fontWeight: 600, color: LIGHT.ink, background: '#fff' }}>
          <GoogleG /> Continue with Google
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}><div style={{ flex: 1, height: 1, background: LIGHT.border }} /><span style={{ fontSize: 12, color: LIGHT.sub }}>or</span><div style={{ flex: 1, height: 1, background: LIGHT.border }} /></div>

        <FieldLabel>Email</FieldLabel>
        <TextInput value={email} onChange={setEmail} placeholder="you@company.com" type="email" autoComplete="email" />
        <FieldLabel>Password</FieldLabel>
        <TextInput value={password} onChange={setPassword} placeholder="At least 6 characters" type="password" autoComplete="new-password" />
        <ErrorText>{error}</ErrorText>
        <PrimaryButton onClick={submit} disabled={loading || !email || password.length < 6}>
          {loading ? 'Creating account…' : 'Continue'}
        </PrimaryButton>
      </div>
      <div style={{ fontSize: 12, color: LIGHT.sub, marginTop: 14, textAlign: 'center' }}>Next, we'll ask if you're starting a business or joining a team.</div>
    </AuthShell>
  )
}
