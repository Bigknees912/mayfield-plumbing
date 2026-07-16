const { test } = require("node:test");
const assert = require("node:assert/strict");
const { buildCandidates, resolveSlot, nextAvailableSlots } = require("../lib/scheduling");
const { createFakeSupabase } = require("./fakeSupabase");

// Deliberately date-tolerant (no hardcoded calendar dates) since these
// tests run on whatever day CI happens to run - assertions check
// structural invariants (weekday-only, correct count, no duplicates)
// instead of exact dates, so they don't go flaky/stale.

test("buildCandidates: emergency returns exactly one ASAP candidate with no date", () => {
  const candidates = buildCandidates("emergency");
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].date, null);
  assert.match(candidates[0].label, /^ASAP/);
});

test("buildCandidates: sameday returns 3 same-day candidates, all today", () => {
  const candidates = buildCandidates("sameday");
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(candidates.length, 3);
  for (const c of candidates) assert.equal(c.date, today);
  // Windows shouldn't repeat within the same day.
  const windows = new Set(candidates.map((c) => c.window));
  assert.equal(windows.size, 3);
});

test("buildCandidates: standard returns 6 weekday-only candidates with no weekends", () => {
  const candidates = buildCandidates("standard");
  assert.equal(candidates.length, 6);
  for (const c of candidates) {
    const day = new Date(c.date + "T00:00:00").getDay();
    assert.notEqual(day, 0, `candidate ${c.date} fell on a Sunday`);
    assert.notEqual(day, 6, `candidate ${c.date} fell on a Saturday`);
  }
  // Dates should be strictly increasing (no duplicates, no going backwards).
  for (let i = 1; i < candidates.length; i++) {
    assert.ok(candidates[i].date >= candidates[i - 1].date);
  }
});

test("resolveSlot: matches a real candidate label back to its date/window", () => {
  const candidates = buildCandidates("standard");
  const target = candidates[2];
  const resolved = resolveSlot(target.label, "standard");
  assert.deepEqual(resolved, target);
});

test("resolveSlot: returns null for a freeform label the caller made up", () => {
  // The assistant's system prompt explicitly allows a caller to name their
  // own day/time instead of picking an offered slot - this must not throw,
  // just signal "couldn't resolve it" so the booking still proceeds with
  // the raw label (see booking.js's createBooking).
  const resolved = resolveSlot("Whenever works, surprise me", "standard");
  assert.equal(resolved, null);
});

test("nextAvailableSlots: filters out a slot that's already booked", async () => {
  const sameday = buildCandidates("sameday");
  const takenSlot = sameday[0];
  const fake = createFakeSupabase({
    jobs: [
      { company_id: "company-1", scheduled_date: takenSlot.date, scheduled_window: takenSlot.window, status: "unassigned" },
    ],
  });

  const offered = await nextAvailableSlots("sameday", "company-1", fake);

  assert.ok(!offered.includes(takenSlot.label), "the already-booked slot should not be offered again");
  assert.ok(offered.length > 0, "there should still be other open slots offered");
});

test("nextAvailableSlots: a cancelled job doesn't block its old slot", async () => {
  const sameday = buildCandidates("sameday");
  const cancelledSlot = sameday[0];
  const fake = createFakeSupabase({
    jobs: [
      { company_id: "company-1", scheduled_date: cancelledSlot.date, scheduled_window: cancelledSlot.window, status: "cancelled" },
    ],
  });

  const offered = await nextAvailableSlots("sameday", "company-1", fake);

  assert.ok(offered.includes(cancelledSlot.label), "a cancelled job's old slot should be offered again");
});

test("nextAvailableSlots: only counts busy jobs for the same company", async () => {
  const sameday = buildCandidates("sameday");
  const slot = sameday[0];
  const fake = createFakeSupabase({
    jobs: [
      // Booked for a different company - shouldn't affect company-1's availability.
      { company_id: "some-other-company", scheduled_date: slot.date, scheduled_window: slot.window, status: "unassigned" },
    ],
  });

  const offered = await nextAvailableSlots("sameday", "company-1", fake);

  assert.ok(offered.includes(slot.label), "another company's booking must not block this company's slot");
});
