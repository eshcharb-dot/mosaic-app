'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const card = { background: '#0c0c18', border: '1px solid #222240', borderRadius: 12, padding: '24px 28px' } as const;
const label = { display: 'block', color: '#b0b0d0', fontSize: 13, marginBottom: 6, fontWeight: 500 } as const;

export default function NotificationsClient() {
  const supabase = createClient();
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'never'>('weekly');
  const [threshold, setThreshold] = useState(70);
  const [instant, setInstant] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailLog, setEmailLog] = useState<Array<{ id: string; subject: string; email_type: string; sent_at: string; status: string }>>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('email_notifications_enabled,email_digest_frequency,email_alert_threshold,email_instant_alerts,organization_id').eq('id', user.id).single();
      if (profile) {
        setEnabled(profile.email_notifications_enabled ?? true);
        setFrequency(profile.email_digest_frequency ?? 'weekly');
        setThreshold(profile.email_alert_threshold ?? 70);
        setInstant(profile.email_instant_alerts ?? true);
      }
      if (profile?.organization_id) {
        const { data: logs } = await supabase.from('email_log').select('id,subject,email_type,sent_at,status').eq('org_id', profile.organization_id).order('sent_at', { ascending: false }).limit(10);
        setEmailLog(logs ?? []);
      }
    })();
  }, [supabase]);

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({ email_notifications_enabled: enabled, email_digest_frequency: frequency, email_alert_threshold: threshold, email_instant_alerts: instant }).eq('id', user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ padding: '32px 40px', background: '#030305', minHeight: '100vh' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Email Notifications</h1>
        <p style={{ color: '#b0b0d0', margin: '4px 0 0', fontSize: 14 }}>Control when and how you receive email alerts</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={card}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 20 }}>Preferences</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ accentColor: '#7c6df5', width: 16, height: 16 }} />
              <span style={{ color: '#fff', fontSize: 14 }}>Enable email notifications</span>
            </label>
            {enabled && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={instant} onChange={e => setInstant(e.target.checked)} style={{ accentColor: '#7c6df5', width: 16, height: 16 }} />
                  <div>
                    <div style={{ color: '#fff', fontSize: 14 }}>Instant compliance alerts</div>
                    <div style={{ color: '#b0b0d0', fontSize: 12 }}>Email when a score drops below threshold</div>
                  </div>
                </label>
                {instant && (
                  <div style={{ paddingLeft: 28 }}>
                    <label style={label}>Alert threshold (%)</label>
                    <input type="number" min={0} max={100} value={threshold} onChange={e => setThreshold(Number(e.target.value))} style={{ background: '#030305', border: '1px solid #222240', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, width: 100 }} />
                  </div>
                )}
                <div>
                  <label style={label}>Digest frequency</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['daily', 'weekly', 'never'] as const).map(f => (
                      <button key={f} onClick={() => setFrequency(f)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: frequency === f ? '#7c6df5' : 'transparent', color: frequency === f ? '#fff' : '#b0b0d0', border: `1px solid ${frequency === f ? '#7c6df5' : '#222240'}`, cursor: 'pointer', textTransform: 'capitalize' }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div style={{ marginTop: 20 }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', background: '#7c6df5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Preferences'}
            </button>
          </div>
        </div>

        {emailLog.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Recent Emails</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {emailLog.map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #222240' }}>
                  <div>
                    <div style={{ color: '#fff', fontSize: 13 }}>{log.subject}</div>
                    <div style={{ color: '#b0b0d0', fontSize: 12, marginTop: 2 }}>{new Date(log.sent_at).toLocaleString()}</div>
                  </div>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: log.status === 'sent' ? '#00e09622' : '#ff4d6d22', color: log.status === 'sent' ? '#00e096' : '#ff4d6d' }}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
