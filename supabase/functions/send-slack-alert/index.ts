import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AlertPayload {
  org_id: string;
  store_name: string;
  campaign_name: string;
  score: number;
  submission_id: string;
  photo_url?: string;
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const payload: AlertPayload = await req.json();

  // Get org slack settings
  const { data: org, error } = await supabase
    .from('organizations')
    .select('slack_webhook_url, slack_enabled, slack_alert_threshold, slack_channel, name')
    .eq('id', payload.org_id)
    .single();

  if (error || !org || !org.slack_enabled || !org.slack_webhook_url) {
    return new Response(JSON.stringify({ skipped: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (payload.score >= org.slack_alert_threshold) {
    return new Response(JSON.stringify({ skipped: true, reason: 'above threshold' }), { headers: { 'Content-Type': 'application/json' } });
  }

  const scoreColor = payload.score < 50 ? '#ff4d6d' : '#ffaa00';
  const emoji = payload.score < 50 ? ':red_circle:' : ':yellow_circle:';

  const slackBody = {
    channel: org.slack_channel,
    text: `${emoji} Compliance Alert — ${payload.store_name}`,
    attachments: [
      {
        color: scoreColor,
        fields: [
          { title: 'Store', value: payload.store_name, short: true },
          { title: 'Campaign', value: payload.campaign_name, short: true },
          { title: 'Compliance Score', value: `${payload.score}%`, short: true },
          { title: 'Threshold', value: `${org.slack_alert_threshold}%`, short: true },
        ],
        footer: 'Mosaic Compliance Platform',
        ts: Math.floor(Date.now() / 1000),
        ...(payload.photo_url ? { image_url: payload.photo_url } : {}),
      },
    ],
  };

  const slackRes = await fetch(org.slack_webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slackBody),
  });

  // Log the delivery
  await supabase.from('webhook_deliveries').insert({
    webhook_id: null,
    event_type: 'slack.alert',
    payload: payload,
    status: slackRes.ok ? 'delivered' : 'failed',
    response_status: slackRes.status,
  });

  return new Response(
    JSON.stringify({ sent: slackRes.ok, status: slackRes.status }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
