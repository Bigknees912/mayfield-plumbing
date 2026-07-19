// Minimal in-memory sliding-window rate limiter. This server runs as a
// single instance per company (see README's resale model: one deployed
// instance = one company), so in-memory state is sufficient - there's no
// second instance for a caller to round-robin across, and no need for
// Redis/an external store. State resets on restart/redeploy, which is an
// acceptable tradeoff for a limiter whose job is blunting a runaway or
// malicious caller, not enforcing a precise long-term quota.

const buckets = new Map(); // key -> array of hit timestamps (ms)

/**
 * Records a hit for `key` and returns true if it exceeds the limit.
 * Prunes old entries on every call so the map doesn't grow unbounded.
 */
function isRateLimited(key, { windowMs, max }) {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  return recent.length > max;
}

module.exports = { isRateLimited };
