// Deploy: supabase functions deploy deliver-webhook --project-ref bmoiftqtxprfgdnizmjn

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let webhook_id: string;
  let event_type: string;
  let payload: Record<string, unknown>;

  try {
    const body = await req.json();
    webhook_id = body.webhook_id;
    event_type = body.event_type;
    payload = body.payload ?? {};
    if (!webhook_id || !event_type) throw new Error("webhook_id and event_type are required");
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch webhook row
  const { data: webhook, error: whErr } = await supabase
    .from("webhooks")
    .select("id, url, secret, events, is_active")
    .eq("id", webhook_id)
    .single();

  if (whErr || !webhook) {
    return new Response(
      JSON.stringify({ error: "Webhook not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!webhook.is_active) {
    return new Response(
      JSON.stringify({ delivered: false, reason: "webhook is inactive" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // For test events, skip the events array check
  if (event_type !== "test" && !webhook.events.includes(event_type)) {
    return new Response(
      JSON.stringify({ delivered: false, reason: "event_type not subscribed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Build delivery payload
  const deliveryPayload = {
    event: event_type,
    timestamp: new Date().toISOString(),
    data: payload,
  };
  const bodyStr = JSON.stringify(deliveryPayload);

  // Compute HMAC-SHA256 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(webhook.secret);
  const msgData = encoder.encode(bodyStr);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // POST to webhook URL with 10-second timeout
  let statusCode = 0;
  let responseBody = "";
  let success = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Mosaic-Event": event_type,
        "X-Mosaic-Signature": `sha256=${sigHex}`,
      },
      body: bodyStr,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    statusCode = res.status;
    success = res.status >= 200 && res.status < 300;

    const rawBody = await res.text();
    responseBody = rawBody.slice(0, 500);
  } catch (err) {
    responseBody = (err as Error).message.slice(0, 500);
    statusCode = 0;
    success = false;
  }

  const now = new Date().toISOString();

  // Log to webhook_deliveries
  await supabase.from("webhook_deliveries").insert({
    webhook_id,
    event_type,
    payload: deliveryPayload,
    status_code: statusCode,
    response_body: responseBody,
    delivered_at: now,
    success,
  });

  // Update webhook metadata
  const webhookUpdate: Record<string, unknown> = {
    last_triggered_at: now,
    last_status_code: statusCode,
  };
  if (!success) {
    // Increment failure_count — fetch current first
    const { data: cur } = await supabase
      .from("webhooks")
      .select("failure_count")
      .eq("id", webhook_id)
      .single();
    webhookUpdate.failure_count = (cur?.failure_count ?? 0) + 1;
  }

  await supabase.from("webhooks").update(webhookUpdate).eq("id", webhook_id);

  return new Response(
    JSON.stringify({ delivered: success, status_code: statusCode }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
