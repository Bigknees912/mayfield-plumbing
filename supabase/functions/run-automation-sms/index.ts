import { createClient } from "npm:@supabase/supabase-js@2";

// Called by run_due_automations() (migration 023_automation_scheduler)
// once a queued automation_runs row for a send_sms action comes due -
// not called by any client directly. verify_jwt is off (set at deploy
// time) because the caller is a DB function with no Supabase session;
// the x-webhook-secret header checked below IS the authentication,
// matching the shared secret stored in Vault. The message has already
// been fully rendered (template variables substituted) by the caller -
// this function only needs a phone number and a string to send.
//
// SMS consent gate (migration 032_sms_consent, see AUTH.md "SMS consent &
// compliance"): skips gracefully - same as the existing "no phone on
// file" check - if the customer hasn't consented. This is the single
// choke point for every owner-authored send_sms automation (including the
// seeded review-request one), so a STOP-opt-out footer is appended here
// unconditionally rather than trusting every automation's hand-typed
// message to include it.

Deno.serve(async (req) => {
  try {
    const providedSecret = req.headers.get("x-webhook-secret");
    if (!providedSecret || providedSecret !== Deno.env.get("AUTOMATION_WEBHOOK_SECRET")) {
      return new Response("unauthorized", { status: 401 });
    }

    const { customer_id, message } = await req.json();
    if (!customer_id || !message) return new Response("customer_id and message are required", { status: 400 });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("phone, sms_consent, company_id")
      .eq("id", customer_id)
      .maybeSingle();
    if (customerError) throw customerError;

    const toNumber = customer?.phone ? toE164(customer.phone) : null;
    if (!toNumber) {
      return json({ skipped: "no usable phone number on file for this customer" });
    }
    if (!customer?.sms_consent) {
      return json({ skipped: "customer has not consented to SMS" });
    }

    const fullMessage = /reply stop/i.test(message) ? message : `${message} Reply STOP to opt out.`;

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER")!;

    const twilioResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toNumber, From: fromNumber, Body: fullMessage }),
    });

    if (!twilioResp.ok) {
      const errText = await twilioResp.text();
      console.error("Twilio send failed:", twilioResp.status, errText);
      await recordOptOutIfApplicable(supabase, customer_id, customer.company_id, errText);
      return json({ sent: false, error: errText }, 502);
    }

    return json({ sent: true });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "internal error" }, 500);
  }
});

// Twilio requires E.164 (+15551234567). Duplicated from the other SMS
// edge functions - each is an independent file tree, and this is a
// 6-line helper, not worth wiring cross-function imports for.
function toE164(raw: string): string | null {
  if (raw.trim().startsWith("+")) return raw.trim();
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

// Twilio error 21610 means the recipient has previously replied STOP -
// Twilio already blocks the send at the carrier level regardless of what
// we do here, but without this our own sms_consent flag would stay stale
// (true) forever, so every future automation would keep trying and keep
// failing silently. Best-effort: a failure here shouldn't shadow the
// original Twilio error already being returned to the caller.
async function recordOptOutIfApplicable(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  customerId: string,
  companyId: string,
  twilioErrText: string
) {
  try {
    const parsed = JSON.parse(twilioErrText);
    if (parsed?.code !== 21610) return;
    await supabase
      .from("customers")
      .update({ sms_consent: false, sms_consent_at: new Date().toISOString(), sms_consent_method: "twilio_opt_out_keyword" })
      .eq("id", customerId);
    await supabase.from("sms_consent_events").insert({
      company_id: companyId,
      customer_id: customerId,
      consent: false,
      method: "twilio_opt_out_keyword",
      note: "Twilio blocked send: recipient previously replied STOP (error 21610)",
    });
  } catch (err) {
    console.error("Failed to record opt-out from Twilio 21610:", err instanceof Error ? err.message : err);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
