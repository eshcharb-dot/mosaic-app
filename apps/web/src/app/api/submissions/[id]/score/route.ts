import { NextRequest, NextResponse } from "next/server";

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

  return NextResponse.json(data, { status: edgeRes.status });
}
