import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

// Called from JobsBoard's "Send Deposit Link" button. verify_jwt (set at
// deploy time) already rejects requests without a valid Supabase session
// before this code runs; the role check below is defense-in-depth so only
// an owner (not a tech, even though jobs RLS would technically let a tech
// touch their own assigned job) can request a deposit link, matching the
// demo's button living only on the owner-only Jobs board.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobId } = await req.json();
    if (!jobId) return json({ error: "jobId is required" }, 400);

    // RLS-scoped client acting as the caller (their JWT is forwarded), so
    // this can only ever touch a job in the caller's own company - same
    // guarantee every other write in this app relies on.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "unauthorized" }, 401);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "owner") return json({ error: "only an owner can send a deposit link" }, 403);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, description, price_high, customers(email), companies(deposit_threshold, deposit_pct)")
      .eq("id", jobId)
      .maybeSingle();
    if (jobError) throw jobError;
    if (!job) return json({ error: "job not found" }, 404);

    const company = job.companies as unknown as { deposit_threshold: number; deposit_pct: number };
    if (job.price_high == null || job.price_high < company.deposit_threshold) {
      return json({ error: "this job is under the deposit threshold" }, 400);
    }
    // Same formula as JobsBoard.jsx's depositAmount() - keep in sync if one changes.
    const depositAmount = Math.round((job.price_high * (company.deposit_pct / 100)) / 5) * 5;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
    const origin = req.headers.get("origin") || "https://example.com";
    const customer = job.customers as unknown as { email: string | null } | null;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: { name: `Deposit — ${job.description}` },
            unit_amount: Math.round(depositAmount * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: customer?.email || undefined,
      metadata: { job_id: job.id },
      success_url: `${origin}/?deposit=paid`,
      cancel_url: `${origin}/?deposit=cancelled`,
    });

    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        deposit_status: "pending",
        deposit_amount: depositAmount,
        stripe_checkout_session_id: session.id,
      })
      .eq("id", jobId);
    if (updateError) throw updateError;

    return json({ url: session.url, amount: depositAmount });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "internal error" }, 500);
  }
});
