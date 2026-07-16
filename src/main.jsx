import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import { initSentry } from './lib/sentry'

initSentry()

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
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)
