// Deploy: supabase functions deploy score-submission --project-ref bmoiftqtxprfgdnizmjn

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Basic auth guard — require Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let submission_id: string;
  try {
    const body = await req.json();
    submission_id = body.submission_id;
    if (!submission_id) throw new Error("submission_id is required");
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Fetch submission
    const { data: submission, error: subErr } = await supabase
      .from("submissions")
      .select("id, task_id, campaign_id, store_id, photo_urls")
      .eq("id", submission_id)
      .single();

    if (subErr || !submission) {
      return new Response(
        JSON.stringify({ error: subErr?.message ?? "Submission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch campaign for context
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name, brief")
      .eq("id", submission.campaign_id)
      .single();

    const campaignContext = campaign?.brief
      ? `Campaign: "${campaign.name}". Compliance criteria: ${campaign.brief}`
      : `Campaign: "${campaign?.name ?? "Unknown"}". Score overall shelf compliance.`;

    // Use the first photo URL; submissions stores an array
    const photoUrl: string | null =
      Array.isArray(submission.photo_urls) && submission.photo_urls.length > 0
        ? submission.photo_urls[0]
        : null;

    if (!photoUrl) {
      return new Response(
        JSON.stringify({ error: "Submission has no photo URLs" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Call GPT-4o Vision
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a shelf compliance auditor. Score this retail shelf photo.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${campaignContext}\n\nAnalyze the shelf photo and respond with valid JSON matching exactly this shape:\n{\n  "score": <integer 0-100>,\n  "is_compliant": <boolean, true if score >= 70>,\n  "findings": <string array of specific observations>,\n  "summary": <one sentence summary>\n}`,
              },
              {
                type: "image_url",
                image_url: { url: photoUrl, detail: "high" },
              },
            ],
          },
        ],
        max_tokens: 800,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI API error ${openaiRes.status}: ${errText}`);
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content ?? "{}";

    let parsed: { score: number; is_compliant: boolean; findings: string[]; summary: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Failed to parse GPT response as JSON: ${raw}`);
    }

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
    const is_compliant = score >= 70;
    const findings = Array.isArray(parsed.findings) ? parsed.findings : [];
    const summary = typeof parsed.summary === "string" ? parsed.summary : "";

    // 4. Write compliance_results
    const { error: crErr } = await supabase.from("compliance_results").insert({
      submission_id: submission.id,
      campaign_id: submission.campaign_id,
      store_id: submission.store_id,
      score,
      is_compliant,
      findings,
      summary,
      scored_at: new Date().toISOString(),
      scorer: "gpt-4o",
    });

    if (crErr) throw new Error(`Failed to write compliance_results: ${crErr.message}`);

    // 5. Update submissions.status → 'scored'
    await supabase
      .from("submissions")
      .update({ status: "scored" })
      .eq("id", submission.id);

    // 6. Update tasks.status → 'scored'
    if (submission.task_id) {
      await supabase
        .from("tasks")
        .update({ status: "scored" })
        .eq("id", submission.task_id);
    }

    // 7. Create alert if score < 70
    if (score < 70) {
      const severity = score < 50 ? "critical" : "warning";
      const message = `Compliance score ${score}/100 — ${summary}`;

      await supabase.from("alert_events").insert({
        store_id: submission.store_id,
        payload: {
          type: "compliance_fail",
          severity,
          message,
          campaign_id: submission.campaign_id,
          submission_id: submission.id,
          score,
          summary,
        },
        triggered_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ success: true, score, is_compliant }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[score-submission] error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
