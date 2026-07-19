// Minimal retry-with-backoff for transient failures against Supabase. A
// booking made over a live phone call has no "refresh and try again"
// button - if a momentary network blip or connection hiccup throws mid-
// call, the caller just hears "sorry, something went wrong" and the job
// never gets created. This retries only failures that look transient,
// never validation errors or the double-booking unique-violation (23505 -
// retrying that would just rediscover the same conflict and waste the
// caller's time instead of promptly offering the next slot).

function isRetryable(err) {
  const code = err?.code || err?.cause?.code;
  if (code === "23505") return false;
  if (code === "57P03" || code === "53300" || code === "40001") return true; // pg: shutting down / too many connections / serialization failure
  if (typeof err?.message === "string" && /fetch failed|ECONNRESET|ETIMEDOUT|network|socket hang up/i.test(err.message)) return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries `fn` up to `retries` extra times (so `retries: 2` means 3 total
 * attempts) with exponential backoff, but only for errors isRetryable
 * considers transient. Anything else - including validation errors and
 * the double-booking constraint - is thrown immediately on the first try.
 */
async function withRetry(fn, { retries = 2, baseDelayMs = 200 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryable(err)) throw err;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastErr;
}

module.exports = { withRetry, isRetryable };
