import { createClient } from "npm:@supabase/supabase-js@2";
import { reportError } from "./_sentry.ts";

// Public intake for GDPR/PIPEDA-style privacy requests (access,
// correction, deletion), called directly from a company's marketing site
// (data-request.html) - no Supabase session exists for a homeowner
// visiting that page, so verify_jwt is off and this uses the service role
// to write, same pattern as receptionist-server's public-facing writes.
// See AUTH.md "Data deletion & privacy requests".

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  access: "see a copy of",
  correction: "correct",
  deletion: "delete",
};

// Loose but real validation - this is the one fully public, unauthenticated,
// service-role-writing endpoint in the app (no verify_jwt, no RLS), so it's
// the highest-value spot in the app for input validation. Not trying to be
// a canonical email validator, just rejecting obvious garbage/oversized
// payloads before they hit the database and trigger real outbound email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = { name: 200, email: 254, phone: 30, companyName: 200, details: 4000 };

function clean(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

// Escapes ILIKE wildcards (%, _) out of freeform user input before it's
// used as a search pattern - otherwise a requester typing "%" would match
// every company, mislabeling which business their request is about.
function escapeIlike(value: string): string {
  return value.replace(/[%_]/g, (c) => `\\${c}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const requestType = typeof body.requestType === "string" ? body.requestType : "";
    const requesterName = clean(body.requesterName, MAX_LEN.name);
    const requesterEmail = clean(body.requesterEmail, MAX_LEN.email);
    const requesterPhone = body.requesterPhone ? clean(body.requesterPhone, MAX_LEN.phone) : "";
    const companyName = body.companyName ? clean(body.companyName, MAX_LEN.companyName) : "";
    const details = body.details ? clean(body.details, MAX_LEN.details) : "";

    if (!requestType || !REQUEST_TYPE_LABELS[requestType]) {
      return json({ error: "requestType must be 'access', 'correction', or 'deletion'" }, 400);
    }
    if (!requesterName || !requesterEmail) {
      return json({ error: "requesterName and requesterEmail are required" }, 400);
    }
    if (!EMAIL_RE.test(requesterEmail)) {
      return json({ error: "requesterEmail doesn't look like a valid email address" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limit by requester email - this endpoint is fully public and
    // unauthenticated, and each request does a DB write plus up to two
    // outbound emails, so nothing else stops a script from spamming it
    // and running up Resend usage. DB-backed rather than in-memory since
    // edge function isolates don't share memory across invocations.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("data_deletion_requests")
      .select("id", { count: "exact", head: true })
      .eq("requester_email", requesterEmail)
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= 5) {
      return json({ error: "Too many requests from this email recently - please try again later, or contact us directly." }, 429);
    }

    // Best-effort link to a company by name - the requester types this
    // freeform, so it may not match or may be left blank. Not relied on
    // for anything load-bearing (the notification email below is the real
    // safety net), just a convenience for a future owner-facing view.
    let companyId: string | null = null;
    if (companyName) {
      const { data: match } = await supabase
        .from("companies")
        .select("id")
        .ilike("name", escapeIlike(companyName))
        .limit(1)
        .maybeSingle();
      companyId = match?.id ?? null;
    }

    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: request, error: insertError } = await supabase
      .from("data_deletion_requests")
      .insert({
        company_id: companyId,
        company_name_provided: companyName || null,
        request_type: requestType,
        requester_name: requesterName,
        requester_email: requesterEmail,
        requester_phone: requesterPhone || null,
        details: details || null,
        due_date: dueDate,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    // Best-effort notification emails - the request is already saved at
    // this point regardless of whether either email succeeds, so failures
    // here are logged, not thrown (a requester shouldn't see an error for
    // a request that actually went through).
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const privacyContact = Deno.env.get("PRIVACY_CONTACT_EMAIL");

    if (resendApiKey && fromEmail) {
      if (privacyContact) {
        await sendEmail(resendApiKey, fromEmail, privacyContact,
          `New privacy request: ${requestType} (due ${dueDate.slice(0, 10)})`,
          `Type: ${requestType}\nName: ${requesterName}\nEmail: ${requesterEmail}\nPhone: ${requesterPhone || "(not given)"}\nCompany named: ${companyName || "(not given)"}${companyId ? " (matched company id " + companyId + ")" : " (no match found)"}\nDetails: ${details || "(none)"}\n\nRespond by: ${dueDate.slice(0, 10)}\nRequest id: ${request.id}`
        );
      }
      await sendEmail(resendApiKey, fromEmail, requesterEmail,
        "We received your privacy request",
        `Hi ${requesterName},\n\nWe received your request to ${REQUEST_TYPE_LABELS[requestType]} your personal information${companyName ? " held by " + companyName : ""}. We'll respond within 30 days, as required under applicable privacy law.\n\nIf you didn't submit this request, please reply to let us know.\n\nReference: ${request.id}`
      );
    }

    return json({ id: request.id, dueDate });
  } catch (err) {
    await reportError(err, { function: "submit-data-request" });
    return json({ error: err instanceof Error ? err.message : "internal error" }, 500);
  }
});

// A silently-failed notification here isn't just a missed email - it's a
// legally time-sensitive privacy request (30-day due date) nobody finds
// out about, so this is one of the highest-value Sentry reports in this
// app despite the request itself still saving successfully either way.
async function sendEmail(apiKey: string, from: string, to: string, subject: string, text: string) {
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!resp.ok) await reportError(new Error(`Resend send failed: ${resp.status} ${await resp.text()}`), { function: "submit-data-request", to, subject });
  } catch (err) {
    await reportError(err, { function: "submit-data-request", step: "sendEmail", to, subject });
  }
}
