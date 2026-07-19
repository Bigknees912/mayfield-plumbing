const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isRateLimited } = require("../lib/rateLimiter");

test("isRateLimited: allows up to `max` hits within the window, then blocks", () => {
  const key = `test-key-${Math.random()}`;
  for (let i = 0; i < 3; i++) {
    assert.equal(isRateLimited(key, { windowMs: 60000, max: 3 }), false, `hit ${i + 1} should be allowed`);
  }
  assert.equal(isRateLimited(key, { windowMs: 60000, max: 3 }), true, "4th hit should be blocked");
});

test("isRateLimited: different keys have independent buckets", () => {
  const keyA = `test-a-${Math.random()}`;
  const keyB = `test-b-${Math.random()}`;
  assert.equal(isRateLimited(keyA, { windowMs: 60000, max: 1 }), false);
  assert.equal(isRateLimited(keyA, { windowMs: 60000, max: 1 }), true);
  // keyB's bucket is untouched by keyA's hits.
  assert.equal(isRateLimited(keyB, { windowMs: 60000, max: 1 }), false);
});

test("isRateLimited: a hit outside the window doesn't count against the limit", () => {
  const key = `test-window-${Math.random()}`;
  // A zero-width window means every prior hit is immediately "outside" it,
  // so this simulates time passing without an actual sleep in the test.
  assert.equal(isRateLimited(key, { windowMs: 0, max: 1 }), false);
  assert.equal(isRateLimited(key, { windowMs: 0, max: 1 }), false);
  assert.equal(isRateLimited(key, { windowMs: 0, max: 1 }), false);
});
