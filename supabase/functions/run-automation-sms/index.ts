import { createClient } from "npm:@supabase/supabase-js@2";

// Called by run_due_automations() (migration 023_automation_scheduler)
// once a queued automation_runs row for a send_sms action comes due -
// not called by any client directly. verify_jwt is off (set at deploy
// time) because the caller is a DB function with no Supabase session;
// the x-webhook-secret header checked below IS the authentication,
// matching the shared secret stored in Vault. The message has already
// been fully rendered (template variables substituted) by the caller -
// this function only needs a phone number and a string to send.

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
      .select("phone")
      .eq("id", customer_id)
      .maybeSingle();
    if (customerError) throw customerError;

    const toNumber = customer?.phone ? toE164(customer.phone) : null;
    if (!toNumber) {
      return json({ skipped: "no usable phone number on file for this customer" });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER")!;

    const twilioResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toNumber, From: fromNumber, Body: message }),
    });

    if (!twilioResp.ok) {
      const errText = await twilioResp.text();
      console.error("Twilio send failed:", twilioResp.status, errText);
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
