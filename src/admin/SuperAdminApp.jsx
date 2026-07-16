import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { signOut } from '../lib/auth'
import { isSuperAdmin } from '../lib/admin'
import { AuthShell, LIGHT } from '../auth/ui'
import { ErrorState, LoadingState } from '../dashboard/ui'
import AdminLoginScreen from './AdminLoginScreen'
import AdminShell from './AdminShell'

// Entirely separate auth/state machine from App.jsx - reachable only at
// the /admin path (see main.jsx) and never linked to from anywhere inside
// the regular company dashboard. A session existing here just means
// *some* Supabase Auth user is signed in; isSuperAdmin() (backed by
// is_super_admin(), migration 036) is the actual gate; a regular owner or
// tech account gets NotAuthorizedScreen, never AdminShell, no matter what
// URL they hit.
export default function SuperAdminApp() {
  const [session, setSession] = useState(undefined)
  const [sessionError, setSessionError] = useState('')
  const [isAdmin, setIsAdmin] = useState(undefined)
  const [adminCheckError, setAdminCheckError] = useState('')

  function loadSession() {
    setSessionError('')
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch((err) => setSessionError(err.message || String(err)))
  }

  useEffect(() => {
    loadSession()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  function checkAdmin() {
    if (!session) return
    setAdminCheckError('')
    setIsAdmin(undefined)
    isSuperAdmin()
      .then(setIsAdmin)
      .catch((err) => setAdminCheckError(err.message || String(err)))
  }

  useEffect(() => {
    if (session === undefined) return
    if (!session) {
      setIsAdmin(null)
      return
    }
    checkAdmin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  if (sessionError) {
    return (
      <AuthShell>
        <ErrorState message={`Couldn't check your session: ${sessionError}`} onRetry={loadSession} />
      </AuthShell>
    )
  }

  if (session === undefined || (session && isAdmin === undefined && !adminCheckError)) {
    return (
      <AuthShell>
        <div style={{ paddingTop: 60 }}>
          <LoadingState />
        </div>
      </AuthShell>
    )
  }

  if (session && adminCheckError) {
    return (
      <AuthShell>
        <ErrorState message={`Couldn't verify admin access: ${adminCheckError}`} onRetry={checkAdmin} />
      </AuthShell>
    )
  }

  if (!session) {
    return <AdminLoginScreen />
  }

  if (!isAdmin) {
    return <NotAuthorizedScreen onSignOut={signOut} />
  }

  return <AdminShell session={session} onSignOut={signOut} />
}

function NotAuthorizedScreen({ onSignOut }) {
  const [signingOut, setSigningOut] = useState(false)
  return (
    <AuthShell>
      <div style={{ paddingTop: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: LIGHT.alert, marginBottom: 10 }}>Not authorized</div>
        <div style={{ fontSize: 13.5, color: LIGHT.sub, marginBottom: 24, lineHeight: 1.5 }}>
          This account doesn't have super-admin access. If you're a business owner or technician, use the regular
          sign-in instead - there's nothing for you at this URL.
        </div>
        <button
          className="tap"
          disabled={signingOut}
          onClick={() => { setSigningOut(true); onSignOut() }}
          style={{ background: LIGHT.ink, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 600 }}
        >
          Sign Out
        </button>
      </div>
    </AuthShell>
  )
}
