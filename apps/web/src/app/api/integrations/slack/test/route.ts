import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { org_id } = await req.json();

  const { data: org } = await supabase
    .from('organizations')
    .select('slack_webhook_url, slack_channel, name')
    .eq('id', org_id)
    .single();

  if (!org?.slack_webhook_url) {
    return NextResponse.json({ error: 'No webhook URL configured' }, { status: 400 });
  }

  const res = await fetch(org.slack_webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: org.slack_channel,
      text: `✅ Mosaic test message from *${org.name}* — Slack integration is working!`,
    }),
  });

  return NextResponse.json({ sent: res.ok, status: res.status });
}
