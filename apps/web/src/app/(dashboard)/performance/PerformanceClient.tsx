'use client';
import { useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PerfData {
  submission_count_24h: number;
  submission_count_7d: number;
  avg_score_24h: number;
  scored_rate_24h: number;
  active_collectors: number;
  pending_tasks: number;
  webhook_deliveries_24h: number;
  webhook_success_rate: number;
  hourly_submissions: Array<{ hour: string; count: number }> | null;
}

const card = {
  background: '#0c0c18',
  border: '1px solid #222240',
  borderRadius: 12,
  padding: '20px 24px',
} as const;

function StatCard({ label, value, sub, color = '#7c6df5' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 13, color: '#b0b0d0', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: '#b0b0d0', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: ok ? '#00e096' : '#ff4d6d',
      boxShadow: ok ? '0 0 6px #00e09680' : '0 0 6px #ff4d6d80',
      marginRight: 6,
    }} />
  );
}

export default function PerformanceClient() {
  const [data, setData] = useState<PerfData | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/performance');
      if (res.ok) {
        setData(await res.json());
        setLastFetch(new Date());
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const hourlyData = (data?.hourly_submissions ?? []).map(h => ({
    hour: new Date(h.hour).getHours() + ':00',
    count: h.count,
  }));

  const webhookOk = (data?.webhook_success_rate ?? 0) >= 95;
  const scoringOk = (data?.scored_rate_24h ?? 0) >= 80;

  return (
    <div style={{ padding: '32px 40px', minHeight: '100vh', background: '#030305' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Performance</h1>
          <p style={{ color: '#b0b0d0', margin: '4px 0 0', fontSize: 14 }}>System health · auto-refreshes every 30s</p>
        </div>
        {lastFetch && (
          <div style={{ fontSize: 12, color: '#b0b0d0' }}>
            Updated {lastFetch.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div style={{ ...card, marginBottom: 24, display: 'flex', gap: 32 }}>
        <div style={{ fontSize: 14, color: '#b0b0d0', fontWeight: 600, marginRight: 8 }}>System Status</div>
        <div style={{ fontSize: 14, color: '#fff' }}><StatusDot ok={true} />API</div>
        <div style={{ fontSize: 14, color: '#fff' }}><StatusDot ok={scoringOk} />AI Scoring</div>
        <div style={{ fontSize: 14, color: '#fff' }}><StatusDot ok={webhookOk} />Webhooks</div>
        <div style={{ fontSize: 14, color: '#fff' }}><StatusDot ok={true} />Database</div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Submissions (24h)" value={data?.submission_count_24h ?? '—'} sub={`${data?.submission_count_7d ?? '—'} this week`} color="#7c6df5" />
        <StatCard label="Avg Score (24h)" value={data?.avg_score_24h != null ? `${data.avg_score_24h}%` : '—'} sub="compliance score" color="#00d4d4" />
        <StatCard label="Active Collectors" value={data?.active_collectors ?? '—'} sub="last 24h" color="#00e096" />
        <StatCard label="Pending Tasks" value={data?.pending_tasks ?? '—'} sub="awaiting assignment" color="#b0b0d0" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard label="Scoring Rate (24h)" value={data?.scored_rate_24h != null ? `${data.scored_rate_24h}%` : '—'} sub="submissions scored" color={scoringOk ? '#00e096' : '#ff4d6d'} />
        <StatCard label="Webhook Deliveries" value={data?.webhook_deliveries_24h ?? '—'} sub="last 24h" color="#7c6df5" />
        <StatCard label="Webhook Success" value={data?.webhook_success_rate != null ? `${data.webhook_success_rate}%` : '—'} sub="delivery rate" color={webhookOk ? '#00e096' : '#ff4d6d'} />
        <StatCard label="Submissions (7d)" value={data?.submission_count_7d ?? '—'} sub="rolling week" color="#00d4d4" />
      </div>

      {/* Hourly chart */}
      <div style={{ ...card }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 20 }}>Submissions — Last 24 Hours</div>
        {hourlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c6df5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c6df5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: '#b0b0d0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#b0b0d0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0c0c18', border: '1px solid #222240', borderRadius: 8, color: '#fff', fontSize: 13 }} />
              <Area type="monotone" dataKey="count" stroke="#7c6df5" strokeWidth={2} fill="url(#perfGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0b0d0' }}>
            No submission data in the last 24 hours
          </div>
        )}
      </div>
    </div>
  );
}
