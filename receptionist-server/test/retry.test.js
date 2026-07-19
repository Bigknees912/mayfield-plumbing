const { test } = require("node:test");
const assert = require("node:assert/strict");
const { withRetry, isRetryable } = require("../lib/retry");

test("isRetryable: treats network-ish failures as transient", () => {
  assert.ok(isRetryable(new Error("fetch failed")));
  assert.ok(isRetryable(new Error("connect ECONNRESET")));
  assert.ok(isRetryable({ code: "40001", message: "serialization failure" }));
});

test("isRetryable: never retries the double-booking unique-violation", () => {
  assert.ok(!isRetryable({ code: "23505", message: "duplicate key" }));
});

test("isRetryable: never retries an ordinary validation error", () => {
  assert.ok(!isRetryable(new Error("Unknown jobType: not-a-real-job")));
});

test("withRetry: returns the result immediately on success, no retries needed", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("withRetry: retries a transient failure and succeeds on a later attempt", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls++;
      if (calls < 3) throw new Error("fetch failed");
      return "recovered";
    },
    { retries: 3, baseDelayMs: 1 }
  );
  assert.equal(result, "recovered");
  assert.equal(calls, 3);
});

test("withRetry: gives up after exhausting retries and throws the last error", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls++;
          throw new Error("fetch failed");
        },
        { retries: 2, baseDelayMs: 1 }
      ),
    /fetch failed/
  );
  assert.equal(calls, 3); // initial attempt + 2 retries
});

test("withRetry: never retries a non-transient error, fails on the first attempt", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(async () => {
        calls++;
        const err = new Error("duplicate key");
        err.code = "23505";
        throw err;
      }),
    /duplicate key/
  );
  assert.equal(calls, 1);
});
