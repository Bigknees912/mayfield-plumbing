import { createClient } from "npm:@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { requestType, requesterName, requesterEmail, requesterPhone, companyName, details } = await req.json();

    if (!requestType || !REQUEST_TYPE_LABELS[requestType]) {
      return json({ error: "requestType must be 'access', 'correction', or 'deletion'" }, 400);
    }
    if (!requesterName?.trim() || !requesterEmail?.trim()) {
      return json({ error: "requesterName and requesterEmail are required" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Best-effort link to a company by name - the requester types this
    // freeform, so it may not match or may be left blank. Not relied on
    // for anything load-bearing (the notification email below is the real
    // safety net), just a convenience for a future owner-facing view.
    let companyId: string | null = null;
    if (companyName?.trim()) {
      const { data: match } = await supabase
        .from("companies")
        .select("id")
        .ilike("name", companyName.trim())
        .limit(1)
        .maybeSingle();
      companyId = match?.id ?? null;
    }

    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: request, error: insertError } = await supabase
      .from("data_deletion_requests")
      .insert({
        company_id: companyId,
        company_name_provided: companyName?.trim() || null,
        request_type: requestType,
        requester_name: requesterName.trim(),
        requester_email: requesterEmail.trim(),
        requester_phone: requesterPhone?.trim() || null,
        details: details?.trim() || null,
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
      await sendEmail(resendApiKey, fromEmail, requesterEmail.trim(),
        "We received your privacy request",
        `Hi ${requesterName},\n\nWe received your request to ${REQUEST_TYPE_LABELS[requestType]} your personal information${companyName ? " held by " + companyName : ""}. We'll respond within 30 days, as required under applicable privacy law.\n\nIf you didn't submit this request, please reply to let us know.\n\nReference: ${request.id}`
      );
    }

    return json({ id: request.id, dueDate });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "internal error" }, 500);
  }
});

async function sendEmail(apiKey: string, from: string, to: string, subject: string, text: string) {
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!resp.ok) console.error("Resend send failed:", resp.status, await resp.text());
  } catch (err) {
    console.error("Failed to send notification email:", err instanceof Error ? err.message : err);
  }
}
