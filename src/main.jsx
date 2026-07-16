import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import SuperAdminApp from './admin/SuperAdminApp.jsx'
import { initSentry } from './lib/sentry'

initSentry()

// /admin is a hard fork at the entry point, not a route inside App.jsx's
// state machine - it renders a completely separate component tree with
// its own auth check (SuperAdminApp -> is_super_admin()), so there's no
// shared state, no shared screen, and no code path that could leak from
// one into the other. No router is in use elsewhere in this app, so this
// is a plain pathname check rather than pulling in a routing library for
// one split.
const isAdminPath = window.location.pathname.startsWith('/admin')

// Catches render crashes React itself can't recover from (a genuine bug,
// not a handled API error - those already have their own ErrorState/
// ErrorBanner UI throughout the dashboard, see useAsyncData.js). Kept
// dependency-free from the rest of the app on purpose: if something here
// is broken enough to reach this boundary, importing more app modules for
// the fallback UI is an unnecessary risk.
function CrashFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', background: '#FAF9F7' }}>
      <div style={{ maxWidth: 340, textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Something went wrong</div>
        <div style={{ fontSize: 13.5, color: '#6B6B6B', marginBottom: 20, lineHeight: 1.5 }}>
          We've been notified and are looking into it. Try reloading the page.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{ background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Reload
        </button>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<CrashFallback />}>
      {isAdminPath ? <SuperAdminApp /> : <App />}
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)
