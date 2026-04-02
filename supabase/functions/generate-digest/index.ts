// Deploy: supabase functions deploy generate-digest --project-ref bmoiftqtxprfgdnizmjn

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function buildHtmlBody(
  narrative: string,
  stats: {
    total: number;
    compliant: number;
    compliant_pct: number;
    avg_score: number;
    alert_count: number;
    trend: string;
  },
  topStore: { name: string; score: number } | null,
  bottomStore: { name: string; score: number } | null,
  periodStart: Date,
  periodEnd: Date,
): string {
  const paragraphs = narrative.split("\n\n").filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Mosaic Compliance Digest</title>
<style>
  body { margin: 0; padding: 0; background: #0c0c18; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e0e0f0; }
  .wrapper { max-width: 640px; margin: 0 auto; padding: 32px 16px; }
  .header { background: linear-gradient(135deg, #7c6df5, #00d4d4); border-radius: 16px; padding: 32px; margin-bottom: 24px; text-align: center; }
  .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 900; color: #fff; }
  .header p { margin: 0; font-size: 13px; color: rgba(255,255,255,0.75); }
  .card { background: #13132a; border: 1px solid #222240; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
  .card h2 { margin: 0 0 16px; font-size: 15px; font-weight: 700; color: #a0a0c0; text-transform: uppercase; letter-spacing: 0.05em; }
  .narrative p { margin: 0 0 16px; font-size: 15px; line-height: 1.65; color: #d0d0f0; }
  .narrative p:last-child { margin-bottom: 0; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .stat { background: #1a1a35; border: 1px solid #222240; border-radius: 10px; padding: 16px; text-align: center; }
  .stat .value { font-size: 28px; font-weight: 900; color: #fff; line-height: 1; }
  .stat .label { font-size: 11px; color: #8080a0; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
  .stat.highlight .value { color: #7c6df5; }
  .store-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #1a1a35; }
  .store-row:last-child { border-bottom: none; }
  .store-name { font-size: 14px; font-weight: 600; color: #d0d0f0; }
  .store-score { font-size: 14px; font-weight: 700; }
  .score-high { color: #00d4a0; }
  .score-low { color: #ff4d6d; }
  .trend { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .trend-better { background: rgba(0, 212, 160, 0.15); color: #00d4a0; border: 1px solid rgba(0,212,160,0.3); }
  .trend-worse { background: rgba(255, 77, 109, 0.15); color: #ff4d6d; border: 1px solid rgba(255,77,109,0.3); }
  .trend-same { background: rgba(160, 160, 192, 0.15); color: #a0a0c0; border: 1px solid rgba(160,160,192,0.3); }
  .footer { text-align: center; padding: 24px 0 0; color: #505070; font-size: 12px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>Mosaic Compliance Digest</h1>
    <p>${formatDate(periodStart)} — ${formatDate(periodEnd)}</p>
  </div>

  <div class="card narrative">
    <h2>Summary</h2>
    ${paragraphs.map(p => `<p>${p.replace(/\n/g, " ")}</p>`).join("\n    ")}
  </div>

  <div class="card">
    <h2>Key Metrics</h2>
    <div class="stats-grid">
      <div class="stat highlight">
        <div class="value">${stats.avg_score}</div>
        <div class="label">Avg Score</div>
      </div>
      <div class="stat">
        <div class="value">${stats.compliant_pct}%</div>
        <div class="label">Compliant</div>
      </div>
      <div class="stat">
        <div class="value">${stats.total}</div>
        <div class="label">Submissions</div>
      </div>
      <div class="stat">
        <div class="value">${stats.compliant}</div>
        <div class="label">Passed</div>
      </div>
      <div class="stat">
        <div class="value">${stats.alert_count}</div>
        <div class="label">Alerts</div>
      </div>
      <div class="stat">
        <div class="value">
          <span class="trend trend-${stats.trend === "improving" ? "better" : stats.trend === "declining" ? "worse" : "same"}">
            ${stats.trend === "improving" ? "↑" : stats.trend === "declining" ? "↓" : "→"}
          </span>
        </div>
        <div class="label">Trend</div>
      </div>
    </div>
  </div>

  ${(topStore || bottomStore) ? `
  <div class="card">
    <h2>Store Performance</h2>
    ${topStore ? `
    <div class="store-row">
      <div>
        <div class="store-name">🏆 ${topStore.name}</div>
        <div style="font-size:11px;color:#8080a0;margin-top:2px;">Top store this period</div>
      </div>
      <div class="store-score score-high">${topStore.score}/100</div>
    </div>` : ""}
    ${bottomStore ? `
    <div class="store-row">
      <div>
        <div class="store-name">⚠️ ${bottomStore.name}</div>
        <div style="font-size:11px;color:#8080a0;margin-top:2px;">Needs attention</div>
      </div>
      <div class="store-score score-low">${bottomStore.score}/100</div>
    </div>` : ""}
  </div>` : ""}

  <div class="footer">
    <p>Generated by Mosaic — Enterprise Compliance Intelligence</p>
    <p>To update your digest preferences, visit your <a href="#" style="color:#7c6df5;text-decoration:none;">Settings → Digests</a></p>
  </div>
</div>
</body>
</html>`;
}

function buildTextBody(
  narrative: string,
  stats: {
    total: number;
    compliant: number;
    compliant_pct: number;
    avg_score: number;
    alert_count: number;
    trend: string;
  },
  topStore: { name: string; score: number } | null,
  bottomStore: { name: string; score: number } | null,
  periodStart: Date,
  periodEnd: Date,
): string {
  const lines: string[] = [
    `MOSAIC COMPLIANCE DIGEST`,
    `${formatDate(periodStart)} — ${formatDate(periodEnd)}`,
    ``,
    `SUMMARY`,
    `-------`,
    narrative,
    ``,
    `KEY METRICS`,
    `-----------`,
    `Average Score:   ${stats.avg_score}/100`,
    `Compliant:       ${stats.compliant_pct}% (${stats.compliant}/${stats.total} submissions)`,
    `Alerts:          ${stats.alert_count}`,
    `Trend:           ${stats.trend}`,
  ];

  if (topStore || bottomStore) {
    lines.push(``, `STORE PERFORMANCE`, `-----------------`);
    if (topStore) lines.push(`Top store:    ${topStore.name} (${topStore.score}/100)`);
    if (bottomStore) lines.push(`Needs attention: ${bottomStore.name} (${bottomStore.score}/100)`);
  }

  lines.push(``, `---`, `Generated by Mosaic Enterprise`);
  return lines.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let org_id: string;
  let period_days: number = 7;

  try {
    const body = await req.json();
    org_id = body.org_id;
    if (!org_id) throw new Error("org_id is required");
    if (body.period_days != null) {
      period_days = Math.max(1, Math.min(90, Number(body.period_days)));
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const now = new Date();
    const periodEnd = now;
    const periodStart = new Date(now.getTime() - period_days * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(periodStart.getTime() - period_days * 24 * 60 * 60 * 1000);

    // 1. Fetch campaigns for this org
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id")
      .eq("organization_id", org_id);

    const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id);

    // 2. Current period compliance results
    const { data: currentResults } = await supabase
      .from("compliance_results")
      .select("score, is_compliant, store_id, scored_at")
      .in("campaign_id", campaignIds.length > 0 ? campaignIds : ["__none__"])
      .gte("scored_at", periodStart.toISOString())
      .lte("scored_at", periodEnd.toISOString());

    const results = currentResults ?? [];
    const total = results.length;
    const compliant = results.filter((r: { is_compliant: boolean }) => r.is_compliant).length;
    const compliant_pct = total > 0 ? Math.round((compliant / total) * 100) : 0;
    const avg_score = total > 0
      ? Math.round(results.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / total)
      : 0;

    // 3. Submissions count
    const { count: submissionCount } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .in("campaign_id", campaignIds.length > 0 ? campaignIds : ["__none__"])
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString());

    // 4. Alert count
    const { count: alertCount } = await supabase
      .from("alert_events")
      .select("id", { count: "exact", head: true })
      .gte("triggered_at", periodStart.toISOString())
      .lte("triggered_at", periodEnd.toISOString());

    // 5. Previous period avg for trend
    const { data: prevResults } = await supabase
      .from("compliance_results")
      .select("score")
      .in("campaign_id", campaignIds.length > 0 ? campaignIds : ["__none__"])
      .gte("scored_at", prevPeriodStart.toISOString())
      .lt("scored_at", periodStart.toISOString());

    const prevTotal = (prevResults ?? []).length;
    const prevAvg = prevTotal > 0
      ? Math.round((prevResults ?? []).reduce((sum: number, r: { score: number }) => sum + r.score, 0) / prevTotal)
      : null;

    let trend: "improving" | "declining" | "stable" = "stable";
    if (prevAvg !== null) {
      if (avg_score > prevAvg + 2) trend = "improving";
      else if (avg_score < prevAvg - 2) trend = "declining";
    }

    // 6. Top/bottom stores by average score
    const storeScoreMap = new Map<string, number[]>();
    for (const r of results) {
      if (!r.store_id) continue;
      if (!storeScoreMap.has(r.store_id)) storeScoreMap.set(r.store_id, []);
      storeScoreMap.get(r.store_id)!.push(r.score);
    }

    const storeAverages: Array<{ store_id: string; avg: number }> = [];
    for (const [store_id, scores] of storeScoreMap.entries()) {
      storeAverages.push({ store_id, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) });
    }
    storeAverages.sort((a, b) => b.avg - a.avg);

    let topStore: { name: string; score: number } | null = null;
    let bottomStore: { name: string; score: number } | null = null;

    if (storeAverages.length > 0) {
      const topId = storeAverages[0].store_id;
      const bottomId = storeAverages[storeAverages.length - 1].store_id;

      const storeIds = [...new Set([topId, bottomId])];
      const { data: storeData } = await supabase
        .from("stores")
        .select("id, name")
        .in("id", storeIds);

      const storeMap = new Map((storeData ?? []).map((s: { id: string; name: string }) => [s.id, s.name]));

      topStore = { name: storeMap.get(topId) ?? topId, score: storeAverages[0].avg };
      if (storeAverages.length > 1) {
        bottomStore = {
          name: storeMap.get(bottomId) ?? bottomId,
          score: storeAverages[storeAverages.length - 1].avg,
        };
      }
    }

    const stats = {
      total: submissionCount ?? total,
      compliant,
      compliant_pct,
      avg_score,
      alert_count: alertCount ?? 0,
      trend,
    };

    // 7. Call GPT-4o (text only) for narrative
    const systemPrompt = `You are a compliance analyst writing a weekly digest for an enterprise CPG brand manager.
Write a concise, professional 3-paragraph summary of their shelf compliance data.
Be specific with numbers. Highlight wins and risks. Tone: data-driven, actionable.`;

    const userPrompt = `Data for the past ${period_days} days:
- Total submissions: ${stats.total}
- Compliant: ${stats.compliant} (${stats.compliant_pct}%)
- Average score: ${stats.avg_score}/100
- Alerts triggered: ${stats.alert_count}
- Top store: ${topStore ? `${topStore.name} (${topStore.score}/100)` : "N/A"}
- Bottom store: ${bottomStore ? `${bottomStore.name} (${bottomStore.score}/100)` : "N/A"}
- Trend: scores ${trend} vs previous period`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI API error ${openaiRes.status}: ${errText}`);
    }

    const openaiData = await openaiRes.json();
    const narrative: string = openaiData.choices?.[0]?.message?.content?.trim() ?? "No summary generated.";

    // 8. Build subject + email bodies
    const weekOf = formatDate(periodStart);
    const subject = `Your Mosaic Compliance Digest — Week of ${weekOf}`;
    const htmlBody = buildHtmlBody(narrative, stats, topStore, bottomStore, periodStart, periodEnd);
    const textBody = buildTextBody(narrative, stats, topStore, bottomStore, periodStart, periodEnd);

    return new Response(
      JSON.stringify({
        subject,
        htmlBody,
        textBody,
        stats,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        narrative,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-digest] error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
