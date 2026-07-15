import { createClient } from "npm:@supabase/supabase-js@2";

// Called by the jobs_completed_send_review DB trigger (migration
// 015_review_request_on_job_complete) the instant a job's status becomes
// 'done' - not by any client directly. verify_jwt is off (set at deploy
// time) because the trigger has no Supabase user session; the
// x-webhook-secret header checked below IS the authentication, matching
// the shared secret stored in Vault that the trigger sends.

Deno.serve(async (req) => {
  try {
    const providedSecret = req.headers.get("x-webhook-secret");
    if (!providedSecret || providedSecret !== Deno.env.get("JOB_COMPLETED_WEBHOOK_SECRET")) {
      return new Response("unauthorized", { status: 401 });
    }

    const { job_id } = await req.json();
    if (!job_id) return new Response("job_id is required", { status: 400 });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, status, customers(name, phone), companies(name, google_review_link)")
      .eq("id", job_id)
      .maybeSingle();
    if (jobError) throw jobError;

    if (!job || job.status !== "done") {
      return json({ skipped: "job not found or not done" });
    }

    const customer = job.customers as unknown as { name: string; phone: string | null } | null;
    const company = job.companies as unknown as { name: string; google_review_link: string | null };

    if (!company.google_review_link) {
      return json({ skipped: "no google_review_link set on companies - set it in Supabase Table Editor" });
    }
    const toNumber = customer?.phone ? toE164(customer.phone) : null;
    if (!toNumber) {
      return json({ skipped: "no usable phone number on file for this customer" });
    }

    const firstName = customer!.name?.trim().split(/\s+/)[0] || "there";
    const message = `Hi ${firstName}, thanks for choosing ${company.name}! If you have a minute, a quick Google review helps us a lot: ${company.google_review_link}`;

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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
