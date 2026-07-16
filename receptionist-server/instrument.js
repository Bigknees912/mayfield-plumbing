// Sentry must be initialized before any other module is required, or its
// auto-instrumentation of those modules won't work - so server.js
// requires this file first, before express or anything else. Gracefully
// does nothing if SENTRY_DSN isn't set, same "code now, configure secrets
// later" pattern as every other integration in this app - see AUTH.md
// "Error tracking (Sentry)".
const Sentry = require("@sentry/node");

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || "production",
    tracesSampleRate: 0, // error tracking only, no performance tracing
  });
}

module.exports = Sentry;
