import { NextRequest, NextResponse } from "next/server";
import { trackUsage } from "@/lib/usage";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const SUPABASE_EDGE_URL =
  "https://bmoiftqtxprfgdnizmjn.supabase.co/functions/v1/score-submission";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured" },
      { status: 500 }
    );
  }

  const submission_id = params.id;

  if (!submission_id) {
    return NextResponse.json({ error: "Missing submission id" }, { status: 400 });
  }

  let edgeRes: Response;
  try {
    edgeRes = await fetch(SUPABASE_EDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ submission_id }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to reach scoring service: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  const data = await edgeRes.json();

  // Track usage fire-and-forget after successful score
  if (edgeRes.ok) {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );
    serviceClient
      .from("submissions")
      .select("organization_id")
      .eq("id", submission_id)
      .single()
      .then(({ data: sub }) => {
        if (sub?.organization_id) {
          trackUsage(sub.organization_id, "ai_score");
        }
      });
  }

  return NextResponse.json(data, { status: edgeRes.status });
}
