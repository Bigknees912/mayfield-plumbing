import { Mail } from 'lucide-react'
import { AuthShell, LIGHT } from './ui'

export default function CheckEmailScreen({ email, onBack }) {
  return (
    <AuthShell>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: LIGHT.infoSoft, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mail size={24} color={LIGHT.info} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: LIGHT.ink, marginBottom: 8 }}>Check your email</h1>
        <div style={{ fontSize: 14, color: LIGHT.sub, lineHeight: 1.5, marginBottom: 24 }}>
          We sent a confirmation link to <strong style={{ color: LIGHT.ink }}>{email}</strong>. Click it, then come back here and sign in.
        </div>
        <button className="tap" onClick={onBack} style={{ background: LIGHT.ink, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600 }}>
          Back to Sign In
        </button>
      </div>
    </AuthShell>
  )
}
