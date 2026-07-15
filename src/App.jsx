import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { fetchProfile, signOut } from './lib/auth'
import LoginScreen from './auth/LoginScreen'
import SignupScreen from './auth/SignupScreen'
import CheckEmailScreen from './auth/CheckEmailScreen'
import RoleChoiceScreen from './auth/RoleChoiceScreen'
import OwnerOnboardingScreen from './auth/OwnerOnboardingScreen'
import EmployeeJoinScreen from './auth/EmployeeJoinScreen'
import { AuthShell, LIGHT } from './auth/ui'
import AppShell from './dashboard/AppShell'

// State machine (see AUTH.md "Frontend implementation" for the reasoning):
//   session === undefined         -> still checking for an existing session
//   session === null              -> signed out: render pre-auth screens
//   session set, profile undefined -> fetching the profile row
//   session set, profile null      -> authenticated but no company yet:
//                                      render post-auth setup screens
//   session set, profile set       -> fully signed in
export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(undefined)
  const [preAuthScreen, setPreAuthScreen] = useState('login') // login | signup | check-email
  const [pendingEmail, setPendingEmail] = useState('')
  const [postAuthScreen, setPostAuthScreen] = useState('role-choice') // role-choice | owner-onboarding | employee-join

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setPostAuthScreen('role-choice')
      if (!newSession) setPreAuthScreen('login')
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (!session) {
      setProfile(null)
      return
    }
    setProfile(undefined)
    fetchProfile(session.user.id)
      .then(setProfile)
      .catch((err) => {
        console.error('Failed to load profile:', err)
        setProfile(null)
      })
  }, [session])

  function refreshProfile() {
    if (!session) return
    fetchProfile(session.user.id).then(setProfile).catch(console.error)
  }

  if (session === undefined || (session && profile === undefined)) {
    return <LoadingScreen />
  }

  if (!session) {
    if (preAuthScreen === 'signup') {
      return (
        <SignupScreen
          onBack={() => setPreAuthScreen('login')}
          onNeedsConfirmation={(email) => {
            setPendingEmail(email)
            setPreAuthScreen('check-email')
          }}
        />
      )
    }
    if (preAuthScreen === 'check-email') {
      return <CheckEmailScreen email={pendingEmail} onBack={() => setPreAuthScreen('login')} />
    }
    return <LoginScreen onSignup={() => setPreAuthScreen('signup')} />
  }

  if (!profile) {
    if (postAuthScreen === 'owner-onboarding') {
      return <OwnerOnboardingScreen onBack={() => setPostAuthScreen('role-choice')} onDone={refreshProfile} />
    }
    if (postAuthScreen === 'employee-join') {
      return <EmployeeJoinScreen onBack={() => setPostAuthScreen('role-choice')} onDone={refreshProfile} />
    }
    return (
      <RoleChoiceScreen
        userEmail={session.user.email}
        onPickOwner={() => setPostAuthScreen('owner-onboarding')}
        onPickEmployee={() => setPostAuthScreen('employee-join')}
      />
    )
  }

  return <AppShell session={session} profile={profile} onSignOut={signOut} />
}

function LoadingScreen() {
  return (
    <AuthShell>
      <div style={{ textAlign: 'center', color: LIGHT.sub, fontSize: 14, paddingTop: 60 }}>Loading…</div>
    </AuthShell>
  )
}
