import * as Sentry from '@sentry/react'

// Error tracking only - no session replay, no performance tracing - so
// this doesn't add build-time cost (no sourcemap upload plugin/auth token
// needed) or eat into a free-tier Sentry quota. Gracefully does nothing
// if VITE_SENTRY_DSN isn't set, same "code now, configure secrets later"
// pattern as every other integration in this app - see AUTH.md
// "Error tracking (Sentry)".
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    // Network blips and browser-extension noise aren't bugs in this app -
    // filtering them keeps the alert stream meaningful instead of the
    // owner tuning it out after a week of false positives.
    ignoreErrors: [
      'Failed to fetch',
      'NetworkError when attempting to fetch resource',
      'Load failed',
      'ResizeObserver loop limit exceeded',
    ],
  })
}
