// Deploy: supabase functions deploy process-payout --project-ref bmoiftqtxprfgdnizmjn

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let payout_id: string;
  try {
    const body = await req.json();
    payout_id = body.payout_id;
    if (!payout_id) throw new Error("payout_id is required");
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Fetch payout row
    const { data: payout, error: payoutErr } = await supabase
      .from("payouts")
      .select("id, amount_cents, collector_id, status")
      .eq("id", payout_id)
      .single();

    if (payoutErr || !payout) {
      return new Response(
        JSON.stringify({ error: payoutErr?.message ?? "Payout not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payout.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Payout is already ${payout.status}` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch collector's stripe_account_id
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", payout.collector_id)
      .single();

    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: "Collector profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "Collector has no Stripe account connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Call Stripe Transfers API
    const stripeBody = new URLSearchParams({
      amount: String(payout.amount_cents),
      currency: "gbp",
      destination: profile.stripe_account_id,
      transfer_group: `mosaic_payout_${payout_id}`,
    });

    const stripeRes = await fetch("https://api.stripe.com/v1/transfers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: stripeBody.toString(),
    });

    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      throw new Error(`Stripe API error ${stripeRes.status}: ${errText}`);
    }

    const transfer = await stripeRes.json();

    // 4. Update payout record
    const { error: updateErr } = await supabase
      .from("payouts")
      .update({
        status: "paid",
        stripe_transfer_id: transfer.id,
        paid_at: new Date().toISOString(),
      })
      .eq("id", payout_id);

    if (updateErr) {
      throw new Error(`Failed to update payout record: ${updateErr.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transfer_id: transfer.id,
        amount_cents: payout.amount_cents,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[process-payout] error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
