import { createClient } from "npm:@supabase/supabase-js@2";
import { reportError } from "./_sentry.ts";
import { timingSafeEqual } from "./_timingSafeEqual.ts";

// DEAD CODE as of migration 024_retire_hardcoded_review_trigger_and_seed_default:
// the trigger that used to call this (jobs_completed_send_review) was
// dropped and replaced by a seeded row in the `automations` table, which
// runs through run-automation-sms instead - see AUTH.md "Review-request
// SMS on job completion" (superseded) and "Automation builder". Nothing
// calls this function anymore. Left in place rather than deleted, but
// patched for the SMS consent gate below anyway (migration 032) in case
// it's ever manually re-wired without remembering that constraint.

Deno.serve(async (req) => {
  try {
    const providedSecret = req.headers.get("x-webhook-secret");
    const expectedSecret = Deno.env.get("JOB_COMPLETED_WEBHOOK_SECRET");
    if (!providedSecret || !expectedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
      return new Response("unauthorized", { status: 401 });
    }

    const { job_id } = await req.json();
    if (!job_id) return new Response("job_id is required", { status: 400 });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, status, company_id, customers(id, name, phone, sms_consent), companies(name, google_review_link)")
      .eq("id", job_id)
      .maybeSingle();
    if (jobError) throw jobError;

    if (!job || job.status !== "done") {
      return json({ skipped: "job not found or not done" });
    }

    const customer = job.customers as unknown as { id: string; name: string; phone: string | null; sms_consent: boolean } | null;
    const company = job.companies as unknown as { name: string; google_review_link: string | null };

    if (!company.google_review_link) {
      return json({ skipped: "no google_review_link set on companies - set it in Supabase Table Editor" });
    }
    const toNumber = customer?.phone ? toE164(customer.phone) : null;
    if (!toNumber) {
      return json({ skipped: "no usable phone number on file for this customer" });
    }
    if (!customer?.sms_consent) {
      return json({ skipped: "customer has not consented to SMS" });
    }

    const firstName = customer.name?.trim().split(/\s+/)[0] || "there";
    const message = `Hi ${firstName}, thanks for choosing ${company.name}! If you have a minute, a quick Google review helps us a lot: ${company.google_review_link} Reply STOP to opt out.`;

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
      await recordOptOutIfApplicable(supabase, customer.id, job.company_id, errText);
      await reportError(new Error(`Twilio send failed: ${twilioResp.status} ${errText}`), { function: "send-review-request", jobId: job.id });
      return json({ sent: false, error: errText }, 502);
    }

    return json({ sent: true });
  } catch (err) {
    await reportError(err, { function: "send-review-request" });
    return json({ error: err instanceof Error ? err.message : "internal error" }, 500);
  }
});

// Twilio requires E.164 (+15551234567). Our customers.phone column is
// free text (whatever came in from the demo-style form or the AI
// receptionist), so normalize common North American formats and bail
// rather than guess on anything unrecognized.
function toE164(raw: string): string | null {
  if (raw.trim().startsWith("+")) return raw.trim();
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

// Twilio error 21610 means the recipient has previously replied STOP -
// see the identical helper in send-on-the-way-sms/run-automation-sms for
// the full rationale.
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
