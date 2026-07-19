// Lightweight input validation for args Vapi's LLM extracts mid-call and
// posts to the webhook. These aren't "attacker input" in the usual web-
// form sense, but the webhook has no schema validation otherwise, and
// nothing stops a malformed/oversized/garbage value (or a forged request,
// if VAPI_WEBHOOK_SECRET ever isn't set) from flowing straight into a
// customers/jobs insert. See AUTH.md "Input validation & rate limiting".

const MAX_TEXT_LENGTH = 500;

function cleanText(value, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

// Loose check, not a full phone-number validator - Vapi/Twilio numbers
// are already normalized by the time they reach here, this just rejects
// obviously-wrong values (empty, absurdly long, containing letters).
function isPlausiblePhone(value) {
  return typeof value === "string" && /^\+?[0-9()\-.\s]{7,20}$/.test(value.trim());
}

/**
 * Validates and trims the fields book_appointment needs. Throws with a
 * message naming every problem at once, rather than failing on the first.
 */
function validateBookingArgs(args) {
  const address = cleanText(args.address, 300);
  const customerName = cleanText(args.customerName, 150);
  const slot = cleanText(args.slot, 200);
  const jobType = cleanText(args.jobType, 100);
  const customerPhone = args.customerPhone ? cleanText(args.customerPhone, 30) : undefined;

  const errors = [];
  if (!address) errors.push("address is required");
  if (!customerName) errors.push("customerName is required");
  if (!slot) errors.push("slot is required");
  if (!jobType) errors.push("jobType is required");
  if (customerPhone && !isPlausiblePhone(customerPhone)) errors.push("customerPhone doesn't look like a real phone number");

  if (errors.length) throw new Error(`Invalid booking request: ${errors.join(", ")}`);
  return { address, customerName, slot, jobType, customerPhone };
}

/**
 * Validates the fields get_quote needs. jobType/urgency are re-validated
 * against real data downstream (lib/pricing.js throws on an unrecognized
 * value for this company) - this just guards type/length before that.
 */
function validateQuoteArgs(args) {
  const jobType = cleanText(args.jobType, 100);
  const property = args.property === "commercial" ? "commercial" : "residential";
  const urgency = cleanText(args.urgency, 20) || "standard";
  const partsTier = cleanText(args.partsTier, 20) || undefined;

  if (!jobType) throw new Error("Invalid quote request: jobType is required");
  return { jobType, property, urgency, partsTier };
}

module.exports = { cleanText, isPlausiblePhone, validateBookingArgs, validateQuoteArgs };
