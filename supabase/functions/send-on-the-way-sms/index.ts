import { createClient } from "npm:@supabase/supabase-js@2";

// Called by the jobs_started_send_on_the_way DB trigger (migration
// 017_on_the_way_sms_on_job_started) the instant a job's status becomes
// 'in_progress' - i.e. when a tech taps "Start Job". Not called by any
// client directly. verify_jwt is off (set at deploy time) because the
// trigger has no Supabase user session; the x-webhook-secret header
// checked below IS the authentication.
//
// "Live Google Maps link" here means an interactive maps.google.com URL
// to the job address (same URL TechHome's own "Navigate" button uses) -
// not real-time GPS tracking of the tech. There's no location pipeline
// (tech_locations has no GPS source wired up), so this doesn't pretend to
// show where the tech actually is, only where they're headed.

Deno.serve(async (req) => {
  try {
    const providedSecret = req.headers.get("x-webhook-secret");
    if (!providedSecret || providedSecret !== Deno.env.get("JOB_STARTED_WEBHOOK_SECRET")) {
      return new Response("unauthorized", { status: 401 });
    }

    const { job_id } = await req.json();
    if (!job_id) return new Response("job_id is required", { status: 400 });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, status, address, customers(name, phone), companies(name), assigned_tech:profiles!jobs_assigned_tech_id_fkey(name)")
      .eq("id", job_id)
      .maybeSingle();
    if (jobError) throw jobError;

    if (!job || job.status !== "in_progress") {
      return json({ skipped: "job not found or not in_progress" });
    }

    const customer = job.customers as unknown as { name: string; phone: string | null } | null;
    const company = job.companies as unknown as { name: string };
    const tech = job.assigned_tech as unknown as { name: string } | null;

    const toNumber = customer?.phone ? toE164(customer.phone) : null;
    if (!toNumber) {
      return json({ skipped: "no usable phone number on file for this customer" });
    }

    const firstName = customer!.name?.trim().split(/\s+/)[0] || "there";
    const techFirstName = tech?.name?.trim().split(/\s+/)[0] || "Your technician";
    const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(job.address)}`;
    const message = `Hi ${firstName}, ${techFirstName} from ${company.name} is on the way to ${job.address}. ${mapsLink}`;

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

// Twilio requires E.164 (+15551234567). Duplicated from
// send-review-request's copy - each edge function is deployed as an
// independent file tree, and this is a 6-line helper, not worth wiring
// cross-function imports for.
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
