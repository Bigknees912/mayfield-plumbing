const { getSupabase } = require("./supabase");

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
function weekdayLabel(d) {
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Pure candidate-slot generation (no I/O), factored out so both
 * nextAvailableSlots (offering slots) and resolveSlot (re-deriving a
 * chosen label's real date/window at booking time) build the exact same
 * list from the exact same "now" logic - no session state needed between
 * the two separate webhook calls a real phone conversation makes.
 */
function buildCandidates(urgency) {
  if (urgency === "emergency") {
    return [{ label: "ASAP — next tech dispatched, 60-90 min ETA", date: null, window: "ASAP" }];
  }
  if (urgency === "sameday") {
    const today = isoDate(new Date());
    return [
      { label: "Today, 2:00-4:00 PM", date: today, window: "2:00-4:00 PM" },
      { label: "Today, 4:30-6:30 PM", date: today, window: "4:30-6:30 PM" },
      { label: "Today, 6:30-8:30 PM", date: today, window: "6:30-8:30 PM" },
    ];
  }
  const candidates = [];
  let d = new Date();
  while (candidates.length < 6) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day === 0 || day === 6) continue;
    const window = candidates.length % 2 === 0 ? "9:00-11:00 AM" : "1:00-3:00 PM";
    const date = isoDate(new Date(d));
    candidates.push({ label: `${weekdayLabel(new Date(d))}, ${window}`, date, window });
  }
  return candidates;
}

/**
 * Returns 1-3 candidate slots for the given urgency, filtered against real
 * booked jobs for this company (any non-cancelled job already sitting in
 * that date+window counts as busy). `supabaseClient` defaults to the real
 * client - overridable so test/scheduling.test.js can exercise the
 * busy-slot filtering against a fake in-memory client instead of a live
 * database, same reasoning as booking.js's dependency injection.
 */
async function nextAvailableSlots(urgency, companyId, supabaseClient) {
  const candidates = buildCandidates(urgency || "standard");
  if (urgency === "emergency") return candidates.map((c) => c.label);

  const supabase = supabaseClient || getSupabase();
  const dates = [...new Set(candidates.map((c) => c.date))];
  const { data: busyJobs, error } = await supabase
    .from("jobs")
    .select("scheduled_date, scheduled_window")
    .eq("company_id", companyId)
    .in("scheduled_date", dates)
    .neq("status", "cancelled");
  if (error) throw error;

  const isBusy = (c) => busyJobs.some((b) => b.scheduled_date === c.date && b.scheduled_window === c.window);
  const open = candidates.filter((c) => !isBusy(c));
  return open.slice(0, urgency === "sameday" ? 2 : 3).map((c) => c.label);
}

/**
 * Re-derives {date, window} for a slot label the caller agreed to, by
 * regenerating the same candidate list and matching on label text. Returns
 * null when the caller named their own day/time instead of picking from
 * the offered list (the assistant's system prompt explicitly allows this)
 * - the booking still goes through in that case, it just can't be plotted
 * on the calendar grid, so the raw label is kept as scheduled_window with
 * scheduled_date left unset.
 */
function resolveSlot(label, urgency) {
  return buildCandidates(urgency || "standard").find((c) => c.label === label) || null;
}

module.exports = { nextAvailableSlots, resolveSlot, buildCandidates };
