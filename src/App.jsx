import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { fetchProfile, signOut } from './lib/auth'
import LoginScreen from './auth/LoginScreen'
import SignupScreen from './auth/SignupScreen'
import CheckEmailScreen from './auth/CheckEmailScreen'
import RoleChoiceScreen from './auth/RoleChoiceScreen'
import PlanSelectionScreen from './auth/PlanSelectionScreen'
import OwnerOnboardingScreen from './auth/OwnerOnboardingScreen'
import EmployeeJoinScreen from './auth/EmployeeJoinScreen'
import { AuthShell, LIGHT } from './auth/ui'
import { ErrorState, ErrorBanner, LoadingState } from './dashboard/ui'
import AppShell from './dashboard/AppShell'

// State machine (see AUTH.md "Frontend implementation" for the reasoning):
//   session === undefined         -> still checking for an existing session
//   sessionError set              -> that check failed outright (network, etc.)
//   session === null              -> signed out: render pre-auth screens
//   session set, profile undefined, no profileError -> fetching the profile row
//   profileError set              -> the fetch itself failed - NOT the same as
//                                     "confirmed no profile", so this must not
//                                     fall through to the signup flow
//   session set, profile null      -> authenticated but no company yet:
//                                      render post-auth setup screens
//   session set, profile set       -> fully signed in
export default function App() {
  const [session, setSession] = useState(undefined)
  const [sessionError, setSessionError] = useState('')
  const [profile, setProfile] = useState(undefined)
  const [profileError, setProfileError] = useState('')
  const [refreshError, setRefreshError] = useState('')
  const [preAuthScreen, setPreAuthScreen] = useState('login') // login | signup | check-email
  const [pendingEmail, setPendingEmail] = useState('')
  const [postAuthScreen, setPostAuthScreen] = useState('role-choice') // role-choice | plan-selection | owner-onboarding | employee-join
  const [selectedPlan, setSelectedPlan] = useState('starter')

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
      setPostAuthScreen('role-choice')
      setSelectedPlan('starter')
      if (!newSession) setPreAuthScreen('login')
    })
    return () => listener.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function loadProfile() {
    if (!session) return
    setProfileError('')
    setProfile(undefined)
    fetchProfile(session.user.id)
      .then(setProfile)
      .catch((err) => setProfileError(err.message || String(err)))
  }

  useEffect(() => {
    if (session === undefined) return
    if (!session) {
      setProfile(null)
      return
    }
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  function refreshProfile() {
    if (!session) return
    setRefreshError('')
    fetchProfile(session.user.id)
      .then(setProfile)
      .catch((err) => setRefreshError(err.message || String(err)))
  }

  if (sessionError) {
    return (
      <AuthShell>
        <ErrorState message={`Couldn't check your session: ${sessionError}`} onRetry={loadSession} />
      </AuthShell>
    )
  }

  if (session === undefined || (session && profile === undefined && !profileError)) {
    return <LoadingScreen />
  }

  if (session && profileError) {
    return (
      <AuthShell>
        <ErrorState message={`Couldn't load your account: ${profileError}`} onRetry={loadProfile} />
      </AuthShell>
    )
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
    let screen
    if (postAuthScreen === 'plan-selection') {
      screen = (
        <PlanSelectionScreen
          onBack={() => setPostAuthScreen('role-choice')}
          onContinue={(plan) => {
            setSelectedPlan(plan)
            setPostAuthScreen('owner-onboarding')
          }}
        />
      )
    } else if (postAuthScreen === 'owner-onboarding') {
      screen = <OwnerOnboardingScreen plan={selectedPlan} onBack={() => setPostAuthScreen('plan-selection')} onDone={refreshProfile} />
    } else if (postAuthScreen === 'employee-join') {
      screen = <EmployeeJoinScreen onBack={() => setPostAuthScreen('role-choice')} onDone={refreshProfile} />
    } else {
      screen = (
        <RoleChoiceScreen
          userEmail={session.user.email}
          onPickOwner={() => setPostAuthScreen('plan-selection')}
          onPickEmployee={() => setPostAuthScreen('employee-join')}
        />
      )
    }
    return (
      <>
        {refreshError && (
          <div style={{ position: 'fixed', top: 12, left: 12, right: 12, zIndex: 100, maxWidth: 380, margin: '0 auto' }}>
            <ErrorBanner
              message={`That worked, but couldn't finish signing you in: ${refreshError}`}
              onRetry={refreshProfile}
              onDismiss={() => setRefreshError('')}
            />
          </div>
        )}
        {screen}
      </>
    )
  }

  return <AppShell session={session} profile={profile} onSignOut={signOut} />
}

function LoadingScreen() {
  return (
    <AuthShell>
      <div style={{ paddingTop: 60 }}>
        <LoadingState />
      </div>
    </AuthShell>
  )
}
