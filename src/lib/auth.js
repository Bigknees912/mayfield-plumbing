import { supabase } from './supabaseClient'

// Real Supabase Auth wrappers. These replace app-demo.jsx's fake
// `loginDemo(role)` / local-state signup handlers.

export async function signUpWithPassword(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  // data.session is null when the project requires email confirmation -
  // callers must handle that case (show a "check your email" screen).
  return data
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Returns the caller's profile row (joined with their company), or null if
// they're authenticated but haven't finished company setup yet.
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, companies(*)')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

// Wraps the create_company_and_owner RPC (migration 006). Requires an
// active session - call only after auth.uid() resolves to a real user.
export async function createCompanyAndOwner({ businessName, ownerName, trade, teamSize, serviceArea }) {
  const { data, error } = await supabase.rpc('create_company_and_owner', {
    p_business_name: businessName,
    p_owner_name: ownerName,
    p_trade: trade,
    p_team_size: teamSize,
    p_service_area: serviceArea,
  })
  if (error) throw error
  return data
}

// Wraps the join_company_as_tech RPC. Surfaces "invalid join code" as a
// plain error message, same as app-demo.jsx's EmployeeSignup validation.
export async function joinCompanyAsTech({ joinCode, name }) {
  const { data, error } = await supabase.rpc('join_company_as_tech', {
    p_join_code: joinCode,
    p_name: name,
  })
  if (error) throw error
  return data
}
