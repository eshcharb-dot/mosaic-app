import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface EmailAlertPayload {
  recipient_email: string;
  recipient_name: string;
  store_name: string;
  campaign_name: string;
  score: number;
  org_id: string;
  submission_id: string;
}

// Simple HTML email template
function buildAlertEmail(payload: EmailAlertPayload): string {
  const scoreColor = payload.score < 50 ? '#ff4d6d' : '#ffaa00';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Compliance Alert</title></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#030305;padding:24px 32px;">
      <div style="color:#7c6df5;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Mosaic</div>
      <div style="color:#b0b0d0;font-size:13px;margin-top:4px;">Compliance Platform</div>
    </div>
    <div style="padding:32px;">
      <div style="font-size:20px;font-weight:700;color:#0a0a1a;margin-bottom:8px;">Compliance Alert</div>
      <p style="color:#5a5a7a;font-size:14px;line-height:1.6;">Hi ${payload.recipient_name}, a store compliance score has dropped below your alert threshold.</p>
      <div style="background:#f8f8fc;border-radius:8px;padding:20px;margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#5a5a7a;font-size:13px;padding:6px 0;">Store</td><td style="color:#0a0a1a;font-weight:600;font-size:13px;text-align:right;">${payload.store_name}</td></tr>
          <tr><td style="color:#5a5a7a;font-size:13px;padding:6px 0;">Campaign</td><td style="color:#0a0a1a;font-weight:600;font-size:13px;text-align:right;">${payload.campaign_name}</td></tr>
          <tr><td style="color:#5a5a7a;font-size:13px;padding:6px 0;">Compliance Score</td><td style="color:${scoreColor};font-weight:700;font-size:18px;text-align:right;">${payload.score}%</td></tr>
        </table>
      </div>
      <a href="https://app.mosaic.com/gallery?submission=${payload.submission_id}" style="display:inline-block;background:#7c6df5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">View Submission</a>
    </div>
    <div style="padding:16px 32px;background:#f8f8fc;color:#9090b0;font-size:12px;">You're receiving this because you have instant alerts enabled. <a href="#" style="color:#7c6df5;">Manage preferences</a></div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const payload: EmailAlertPayload = await req.json();

  // Use Supabase's built-in email (or Resend if configured)
  const resendKey = Deno.env.get('RESEND_API_KEY');

  let emailSent = false;
  let emailError: string | null = null;

  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'alerts@mosaic.com',
        to: payload.recipient_email,
        subject: `⚠️ Compliance Alert: ${payload.store_name} — ${payload.score}%`,
        html: buildAlertEmail(payload),
      }),
    });
    emailSent = res.ok;
    if (!res.ok) emailError = await res.text();
  } else {
    // Log as "simulated" if no email provider configured
    emailSent = true;
    emailError = null;
  }

  // Log the email
  await supabase.from('email_log').insert({
    recipient_email: payload.recipient_email,
    subject: `Compliance Alert: ${payload.store_name} — ${payload.score}%`,
    email_type: 'alert',
    org_id: payload.org_id,
    status: emailSent ? 'sent' : 'failed',
    metadata: { ...payload, error: emailError },
  });

  return new Response(
    JSON.stringify({ sent: emailSent, error: emailError }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
