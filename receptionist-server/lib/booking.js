const { getSupabase } = require("./supabase");
const { resolveSlot } = require("./scheduling");

// Every function below takes its Supabase client as a parameter (default:
// the real one from getSupabase()) rather than calling getSupabase()
// internally - this is what lets test/booking.test.js exercise the real
// branching logic (new vs existing customer, slot conflicts, SMS consent)
// against a fake in-memory client instead of a live database. Purely a
// testability refactor - behavior and call sites are unchanged.

async function getJobType(supabase, companyId, key) {
  if (!key) return null;
  const { data, error } = await supabase
    .from("job_types")
    .select("id, label")
    .eq("company_id", companyId)
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Upserts a `calls` row keyed by Vapi's call id every time get_quote runs,
 * so the row tracks the conversation's latest quote even if the caller
 * asks for a couple of variations before booking - and so book_appointment
 * (which gets no urgency/price args of its own from Vapi) can look this
 * back up. Never throws - a logging hiccup here shouldn't break a live
 * call's ability to get a price.
 */
async function recordQuote({ companyId, vapiCallId, customerPhone, jobType, urgency, property, quote, supabaseClient }) {
  if (!vapiCallId) return;
  const supabase = supabaseClient || getSupabase();
  try {
    const jobTypeRow = await getJobType(supabase, companyId, jobType);
    const patch = {
      company_id: companyId,
      customer_phone: customerPhone || null,
      job_type_id: jobTypeRow?.id || null,
      urgency: urgency || null,
      property_type: property || null,
      quote_low: quote.low,
      quote_high: quote.high,
      outcome: "quoted",
    };
    const { data: existing } = await supabase.from("calls").select("id").eq("vapi_call_id", vapiCallId).maybeSingle();
    if (existing) {
      await supabase.from("calls").update(patch).eq("id", existing.id);
    } else {
      await supabase.from("calls").insert({ ...patch, vapi_call_id: vapiCallId });
    }
  } catch (err) {
    console.error("recordQuote failed (non-fatal, call continues):", err.message);
  }
}

/**
 * Records SMS consent Alex captured verbally during the call, per the
 * exact permission-question script in vapi-assistant.json's systemPrompt.
 * Only ever turns consent ON, mirroring the dashboard app's
 * findOrCreateCustomer (src/lib/jobs.js) - a caller who doesn't clearly
 * confirm this time isn't treated as revoking consent they gave on a
 * previous call, since the assistant not asking clearly isn't the same as
 * the customer saying no. Real revocation happens via an explicit STOP
 * reply (handled in the SMS-sending edge functions) or the dashboard's
 * Clients page toggle. See AUTH.md "SMS consent & compliance".
 */
async function applySmsConsent(supabase, companyId, customerId, smsConsent) {
  if (!smsConsent) return;
  const { error: updateError } = await supabase
    .from("customers")
    .update({ sms_consent: true, sms_consent_at: new Date().toISOString(), sms_consent_method: "phone_call" })
    .eq("id", customerId);
  if (updateError) throw updateError;

  const { error: eventError } = await supabase.from("sms_consent_events").insert({
    company_id: companyId,
    customer_id: customerId,
    consent: true,
    method: "phone_call",
    note: "Captured verbally during phone booking (Alex)",
  });
  if (eventError) throw eventError;
}

/**
 * Creates the real booking: finds/creates the customer, inserts the job,
 * and marks the call's outcome "booked". Returns { ok: false, reason } on
 * a slot conflict (mirrors the old bookings.json race-guard) so the
 * assistant can offer the next available slot instead.
 */
async function createBooking({ companyId, vapiCallId, slot, jobType, address, customerPhone, customerName, smsConsent, supabaseClient }) {
  const supabase = supabaseClient || getSupabase();

  let call = null;
  if (vapiCallId) {
    const { data } = await supabase.from("calls").select("*").eq("vapi_call_id", vapiCallId).maybeSingle();
    call = data;
  }
  const urgency = call?.urgency || "standard";
  const resolved = resolveSlot(slot, urgency);

  // Structured-slot double-booking guard. Freeform slots (the caller named
  // their own day/time instead of picking an offered one) can't be
  // conflict-checked this way - there's no reliable date to compare.
  if (resolved?.date) {
    const { data: conflict, error: conflictError } = await supabase
      .from("jobs")
      .select("id")
      .eq("company_id", companyId)
      .eq("scheduled_date", resolved.date)
      .eq("scheduled_window", resolved.window)
      .neq("status", "cancelled")
      .maybeSingle();
    if (conflictError) throw conflictError;
    if (conflict) {
      return { ok: false, reason: "That slot was just taken. Please offer the next available one." };
    }
  }

  let customerId = null;
  if (customerPhone) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .eq("phone", customerPhone)
      .maybeSingle();
    customerId = existing?.id || null;
  }
  if (!customerId) {
    // pipeline_stage: "booked" - a job is being created in the same
    // request, same convention as the dashboard app's findOrCreateCustomer
    // (src/lib/jobs.js). Only applies to a brand-new customer; an existing
    // match's stage above is left untouched.
    const { data: created, error: createError } = await supabase
      .from("customers")
      .insert({ company_id: companyId, name: customerName || "Phone caller", phone: customerPhone || null, address, pipeline_stage: "booked" })
      .select("id")
      .single();
    if (createError) throw createError;
    customerId = created.id;
  }

  await applySmsConsent(supabase, companyId, customerId, smsConsent);

  const jobTypeRow = await getJobType(supabase, companyId, jobType);

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      company_id: companyId,
      customer_id: customerId,
      job_type_id: jobTypeRow?.id || null,
      description: jobTypeRow?.label || jobType,
      address,
      urgency,
      status: "unassigned",
      scheduled_date: resolved?.date || null,
      scheduled_window: resolved?.window || slot,
      price_low: call?.quote_low ?? null,
      price_high: call?.quote_high ?? null,
      source: "phone_ai",
      call_id: call?.id || null,
    })
    .select()
    .single();
  if (jobError) throw jobError;

  if (call) {
    await supabase.from("calls").update({ outcome: "booked", address, ended_at: new Date().toISOString() }).eq("id", call.id);
  }

  return { ok: true, job };
}

module.exports = { recordQuote, createBooking, applySmsConsent };
