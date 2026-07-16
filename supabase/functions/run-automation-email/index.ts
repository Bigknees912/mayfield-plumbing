import { createClient } from "npm:@supabase/supabase-js@2";
import { reportError } from "./_sentry.ts";

// Called by run_due_automations() (migration 026_automation_email_channel)
// once a queued automation_runs row for a send_email action comes due -
// not called by any client directly. Same shared-secret pattern as
// run-automation-sms: the x-webhook-secret header checked below IS the
// authentication, matching AUTOMATION_WEBHOOK_SECRET - the same Vault
// secret used for both automation edge functions, since they share one
// caller (the scheduler) and trust boundary. Subject and body have
// already been fully rendered (template variables substituted) by the
// caller - this function only needs an email address and text to send.

Deno.serve(async (req) => {
  try {
    const providedSecret = req.headers.get("x-webhook-secret");
    if (!providedSecret || providedSecret !== Deno.env.get("AUTOMATION_WEBHOOK_SECRET")) {
      return new Response("unauthorized", { status: 401 });
    }

    const { customer_id, subject, body } = await req.json();
    if (!customer_id || !subject || !body) {
      return new Response("customer_id, subject, and body are required", { status: 400 });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("email")
      .eq("id", customer_id)
      .maybeSingle();
    if (customerError) throw customerError;

    if (!customer?.email) {
      return json({ skipped: "no email on file for this customer" });
    }

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL"),
        to: [customer.email],
        subject,
        text: body,
      }),
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      await reportError(new Error(`Resend send failed: ${resendResp.status} ${errText}`), { function: "run-automation-email", customerId: customer_id });
      return json({ sent: false, error: errText }, 502);
    }

    return json({ sent: true });
  } catch (err) {
    await reportError(err, { function: "run-automation-email" });
    return json({ error: err instanceof Error ? err.message : "internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
