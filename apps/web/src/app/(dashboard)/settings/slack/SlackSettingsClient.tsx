'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const card = { background: '#0c0c18', border: '1px solid #222240', borderRadius: 12, padding: '24px 28px' } as const;
const input = { background: '#030305', border: '1px solid #222240', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, width: '100%', boxSizing: 'border-box' as const };
const label = { display: 'block', color: '#b0b0d0', fontSize: 13, marginBottom: 6, fontWeight: 500 } as const;

export default function SlackSettingsClient() {
  const supabase = createClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(70);
  const [channel, setChannel] = useState('#compliance-alerts');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
      if (!profile?.organization_id) return;
      setOrgId(profile.organization_id);
      const { data: org } = await supabase.from('organizations').select('slack_webhook_url,slack_enabled,slack_alert_threshold,slack_channel').eq('id', profile.organization_id).single();
      if (org) {
        setWebhookUrl(org.slack_webhook_url ?? '');
        setEnabled(org.slack_enabled ?? false);
        setThreshold(org.slack_alert_threshold ?? 70);
        setChannel(org.slack_channel ?? '#compliance-alerts');
      }
    })();
  }, [supabase]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    await supabase.from('organizations').update({
      slack_webhook_url: webhookUrl || null,
      slack_enabled: enabled,
      slack_alert_threshold: threshold,
      slack_channel: channel,
    }).eq('id', orgId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    if (!orgId) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/integrations/slack/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId }) });
      const data = await res.json();
      setTestResult(data.sent ? '✓ Test message sent successfully' : `✗ Failed: ${data.error ?? 'Unknown error'}`);
    } catch {
      setTestResult('✗ Network error');
    }
    setTesting(false);
  };

  return (
    <div style={{ padding: '32px 40px', background: '#030305', minHeight: '100vh' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Slack Integration</h1>
        <p style={{ color: '#b0b0d0', margin: '4px 0 0', fontSize: 14 }}>Receive compliance alerts in your Slack workspace</p>
      </div>

      {/* Setup guide */}
      <div style={{ ...card, marginBottom: 24, borderColor: '#7c6df522', background: '#0a0a20' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#7c6df5', marginBottom: 8 }}>How to set up</div>
        <ol style={{ color: '#b0b0d0', fontSize: 13, paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
          <li>Go to your Slack workspace → Apps → Incoming Webhooks</li>
          <li>Create a new webhook for your desired channel</li>
          <li>Copy the webhook URL and paste it below</li>
          <li>Set your compliance threshold — alerts fire below this score</li>
        </ol>
      </div>

      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={label}>Webhook URL</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            style={input}
          />
        </div>
        <div>
          <label style={label}>Channel</label>
          <input type="text" value={channel} onChange={e => setChannel(e.target.value)} placeholder="#compliance-alerts" style={input} />
        </div>
        <div>
          <label style={label}>Alert Threshold (%)</label>
          <input type="number" min={0} max={100} value={threshold} onChange={e => setThreshold(Number(e.target.value))} style={{ ...input, width: 120 }} />
          <div style={{ color: '#b0b0d0', fontSize: 12, marginTop: 4 }}>Send alert when compliance score drops below this value</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="checkbox" id="slack-enabled" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ accentColor: '#7c6df5', width: 16, height: 16 }} />
          <label htmlFor="slack-enabled" style={{ color: '#fff', fontSize: 14, cursor: 'pointer' }}>Enable Slack alerts</label>
        </div>
        <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', background: '#7c6df5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Settings'}
          </button>
          {webhookUrl && (
            <button onClick={handleTest} disabled={testing} style={{ padding: '10px 24px', background: 'transparent', color: '#b0b0d0', border: '1px solid #222240', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
              {testing ? 'Sending...' : 'Send Test Message'}
            </button>
          )}
        </div>
        {testResult && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: testResult.startsWith('✓') ? '#00e09622' : '#ff4d6d22', border: `1px solid ${testResult.startsWith('✓') ? '#00e096' : '#ff4d6d'}`, color: testResult.startsWith('✓') ? '#00e096' : '#ff4d6d', fontSize: 13 }}>
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
}
