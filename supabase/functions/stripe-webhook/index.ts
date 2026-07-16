import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

// verify_jwt is off (set at deploy time) because Stripe has no Supabase
// session to send - the Stripe-Signature header verified below IS the
// authentication for this endpoint. Point Stripe's webhook config at:
//   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// listening for: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted (the last two added alongside self-serve
// plan billing - see AUTH.md "Self-serve onboarding & billing").

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// Service-role client: Stripe's server has no Supabase JWT, so every
// handler below bypasses RLS deliberately, same pattern as
// receptionist-server.
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Stripe subscription statuses don't map 1:1 onto our 4-value
// subscriptions.status check constraint (incomplete/active/past_due/
// canceled) - collapse the rest into the closest equivalent.
function mapSubscriptionStatus(stripeStatus: string): string {
  if (stripeStatus === "active" || stripeStatus === "trialing") return "active";
  if (stripeStatus === "past_due" || stripeStatus === "unpaid") return "past_due";
  if (stripeStatus === "canceled" || stripeStatus === "incomplete_expired" || stripeStatus === "paused") return "canceled";
  return "incomplete";
}

function periodEndOf(subscription: Stripe.Subscription): string | null {
  const raw = (subscription as unknown as { current_period_end?: number }).current_period_end;
  return raw ? new Date(raw * 1000).toISOString() : null;
}

// Shared by checkout.session.completed (subscription mode) and
// customer.subscription.updated/deleted - both carry a Stripe Subscription
// with metadata.company_id (set at creation time in
// create-subscription-checkout's subscription_data.metadata), which is the
// only way to route back to our own company row without trusting anything
// client-supplied.
async function syncSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.company_id;
  if (!companyId) {
    console.error("Stripe subscription had no company_id in metadata", subscription.id);
    return;
  }
  const plan = subscription.metadata?.plan;
  const patch: Record<string, unknown> = {
    status: mapSubscriptionStatus(subscription.status),
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
    stripe_subscription_id: subscription.id,
    current_period_end: periodEndOf(subscription),
  };
  if (plan) patch.plan = plan;

  const { error } = await supabase.from("subscriptions").update(patch).eq("company_id", companyId);
  if (error) console.error("Failed to sync subscription:", error.message);
}

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

    if (session.mode === "subscription" && session.subscription) {
      // Fetch the full Subscription object - the Checkout Session itself
      // doesn't carry current_period_end.
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncSubscriptionFromStripe(subscription);
    } else {
      // Job deposit checkout (mode: "payment", see create-deposit-checkout).
      const jobId = session.metadata?.job_id;
      if (jobId) {
        const { error } = await supabase
          .from("jobs")
          .update({ deposit_status: "paid", deposit_paid_at: new Date().toISOString() })
          .eq("id", jobId)
          .eq("stripe_checkout_session_id", session.id);
        if (error) console.error("Failed to mark deposit paid:", error.message);
      } else {
        console.error("checkout.session.completed had no job_id or subscription in metadata", session.id);
      }
    }
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    await syncSubscriptionFromStripe(event.data.object as Stripe.Subscription);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
