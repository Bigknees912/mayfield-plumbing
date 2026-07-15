import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

// verify_jwt is off (set at deploy time) because Stripe has no Supabase
// session to send - the Stripe-Signature header verified below IS the
// authentication for this endpoint. Point Stripe's webhook config at:
//   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// listening for checkout.session.completed.

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("missing stripe-signature header");
    // Async variant - Deno's Web Crypto API is async, unlike Node's.
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe signature verification failed:", err instanceof Error ? err.message : err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : "invalid signature"}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const jobId = session.metadata?.job_id;
    if (jobId) {
      // Service-role client: Stripe's server has no Supabase JWT, so this
      // bypasses RLS deliberately, same pattern as receptionist-server.
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { error } = await supabase
        .from("jobs")
        .update({ deposit_status: "paid", deposit_paid_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("stripe_checkout_session_id", session.id);
      if (error) console.error("Failed to mark deposit paid:", error.message);
    } else {
      console.error("checkout.session.completed had no job_id in metadata", session.id);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
