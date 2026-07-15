const { getSupabase } = require("./supabase");
const { resolveSlot } = require("./scheduling");

async function getJobType(companyId, key) {
  if (!key) return null;
  const supabase = getSupabase();
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
async function recordQuote({ companyId, vapiCallId, customerPhone, jobType, urgency, property, quote }) {
  if (!vapiCallId) return;
  try {
    const supabase = getSupabase();
    const jobTypeRow = await getJobType(companyId, jobType);
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
 * Creates the real booking: finds/creates the customer, inserts the job,
 * and marks the call's outcome "booked". Returns { ok: false, reason } on
 * a slot conflict (mirrors the old bookings.json race-guard) so the
 * assistant can offer the next available slot instead.
 */
async function createBooking({ companyId, vapiCallId, slot, jobType, address, customerPhone, customerName }) {
  const supabase = getSupabase();

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

  const jobTypeRow = await getJobType(companyId, jobType);

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

module.exports = { recordQuote, createBooking };
