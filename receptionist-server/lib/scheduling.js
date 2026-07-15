const fs = require("fs");
const path = require("path");

const BOOKINGS_FILE = path.join(__dirname, "..", "bookings.json");

function loadBookings() {
  try {
    return JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf8"));
  } catch (e) {
    return [];
  }
}

function saveBookings(bookings) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

function weekdayLabel(d) {
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Returns 1-3 candidate slot strings for the given urgency, filtered against
 * whatever's already booked in bookings.json.
 *
 * SWAP-IN POINT FOR A REAL CALENDAR:
 * Replace the `bookings.some(...)` conflict check below with a live call to
 * Google Calendar's freebusy.query (see googleCalendar.js.example in this repo)
 * or whatever scheduling tool the client already uses (Jobber, Housecall Pro, etc
 * all expose an availability API). Everything else here stays the same.
 */
function nextAvailableSlots(urgency) {
  const bookings = loadBookings();
  const isBusy = (slotLabel) => bookings.some((b) => b.slot === slotLabel);

  if (urgency === "emergency") {
    return ["ASAP — next tech dispatched, 60-90 min ETA"];
  }

  let candidates = [];
  if (urgency === "sameday") {
    candidates = ["Today, 2:00-4:00 PM", "Today, 4:30-6:30 PM", "Today, 6:30-8:30 PM"];
  } else {
    let d = new Date();
    while (candidates.length < 6) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay();
      if (day === 0 || day === 6) continue;
      const window = candidates.length % 2 === 0 ? "9:00-11:00 AM" : "1:00-3:00 PM";
      candidates.push(`${weekdayLabel(new Date(d))}, ${window}`);
    }
  }

  const open = candidates.filter((s) => !isBusy(s));
  return open.slice(0, urgency === "sameday" ? 2 : 3);
}

function bookSlot({ slot, jobType, address, customerPhone }) {
  const bookings = loadBookings();
  const conflict = bookings.find((b) => b.slot === slot);
  if (conflict) {
    return { ok: false, reason: "That slot was just taken. Please offer the next available one." };
  }
  bookings.push({
    slot,
    jobType,
    address,
    customerPhone: customerPhone || null,
    bookedAt: new Date().toISOString(),
  });
  saveBookings(bookings);
  return { ok: true };
}

module.exports = { nextAvailableSlots, bookSlot, loadBookings };
