'use client';
import { useState, useEffect, useMemo } from 'react';

interface Collector {
  id: string;
  full_name: string;
  email: string;
  collector_tier: string;
  created_at: string;
  task_count: number;
  avg_score: number;
  total_earned_cents: number;
  last_active: string;
}

const TIER_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#7c6df5',
};

export default function CollectorsClient() {
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'task_count' | 'avg_score' | 'total_earned_cents'>('task_count');
  const [selected, setSelected] = useState<Collector | null>(null);

  useEffect(() => {
    fetch('/api/collectors')
      .then(r => r.json())
      .then(data => { setCollectors(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...collectors];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
    }
    result.sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
    return result;
  }, [collectors, search, sortBy]);

  const totalTasks = collectors.reduce((s, c) => s + c.task_count, 0);
  const avgScore = collectors.length > 0 ? Math.round(collectors.reduce((s, c) => s + c.avg_score, 0) / collectors.length) : 0;
  const totalPaid = collectors.reduce((s, c) => s + c.total_earned_cents, 0);

  const card = { background: '#0c0c18', border: '1px solid #222240', borderRadius: 12, padding: '20px 24px' } as const;

  return (
    <div style={{ padding: '32px 40px', background: '#030305', minHeight: '100vh' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Collectors</h1>
        <p style={{ color: '#b0b0d0', margin: '4px 0 0', fontSize: 14 }}>Field agents working on your campaigns</p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Collectors', value: collectors.length, color: '#7c6df5' },
          { label: 'Total Tasks Completed', value: totalTasks.toLocaleString(), color: '#00d4d4' },
          { label: 'Avg Quality Score', value: `${avgScore}%`, color: '#00e096' },
          { label: 'Total Paid Out', value: `£${(totalPaid / 100).toFixed(0)}`, color: '#ffaa00' },
        ].map(s => (
          <div key={s.label} style={card}>
            <div style={{ color: '#b0b0d0', fontSize: 13, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + sort */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search collectors..."
          style={{ background: '#0c0c18', border: '1px solid #222240', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, flex: 1, outline: 'none' }}
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{ background: '#0c0c18', border: '1px solid #222240', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14 }}>
          <option value="task_count">Sort: Most Tasks</option>
          <option value="avg_score">Sort: Highest Score</option>
          <option value="total_earned_cents">Sort: Most Earned</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#0c0c18', border: '1px solid #222240', borderRadius: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 100px 100px', borderBottom: '1px solid #222240' }}>
          {['Collector', 'Tier', 'Tasks', 'Avg Score', 'Earned', 'Last Active'].map(h => (
            <div key={h} style={{ padding: '12px 16px', color: '#b0b0d0', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
          ))}
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#b0b0d0' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#b0b0d0' }}>No collectors found</div>
        ) : (
          filtered.map((c, i) => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 100px 100px', cursor: 'pointer', borderBottom: i < filtered.length - 1 ? '1px solid #1a1a2e' : 'none', background: selected?.id === c.id ? '#0a0a20' : 'transparent' }}
              onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = '#0d0d1a'; }}
              onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ padding: '14px 16px' }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{c.full_name ?? 'Unknown'}</div>
                <div style={{ color: '#b0b0d0', fontSize: 12, marginTop: 2 }}>{c.email}</div>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 100, background: `${TIER_COLORS[c.collector_tier] ?? '#b0b0d0'}22`, color: TIER_COLORS[c.collector_tier] ?? '#b0b0d0', fontWeight: 600, textTransform: 'capitalize' }}>
                  {c.collector_tier ?? 'bronze'}
                </span>
              </div>
              <div style={{ padding: '14px 16px', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center' }}>{c.task_count}</div>
              <div style={{ padding: '14px 16px', color: c.avg_score >= 80 ? '#00e096' : c.avg_score >= 60 ? '#ffaa00' : '#ff4d6d', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center' }}>{c.avg_score > 0 ? `${c.avg_score}%` : '—'}</div>
              <div style={{ padding: '14px 16px', color: '#00e096', fontSize: 14, display: 'flex', alignItems: 'center' }}>£{(c.total_earned_cents / 100).toFixed(2)}</div>
              <div style={{ padding: '14px 16px', color: '#b0b0d0', fontSize: 12, display: 'flex', alignItems: 'center' }}>
                {c.last_active ? new Date(c.last_active).toLocaleDateString() : '—'}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Side panel */}
      {selected && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 360, background: '#0c0c18', borderLeft: '1px solid #222240', padding: 28, zIndex: 50, overflowY: 'auto' }}>
          <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: '#b0b0d0', cursor: 'pointer', marginBottom: 24, fontSize: 14, padding: 0 }}>✕ Close</button>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#7c6df522', border: '2px solid #7c6df5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16 }}>
            {selected.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{selected.full_name}</div>
          <div style={{ fontSize: 13, color: '#b0b0d0', marginBottom: 24 }}>{selected.email}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Tier', value: selected.collector_tier },
              { label: 'Tasks Completed', value: selected.task_count },
              { label: 'Avg Score', value: selected.avg_score > 0 ? `${selected.avg_score}%` : '—' },
              { label: 'Total Earned', value: `£${(selected.total_earned_cents / 100).toFixed(2)}` },
              { label: 'Joined', value: new Date(selected.created_at).toLocaleDateString() },
              { label: 'Last Active', value: selected.last_active ? new Date(selected.last_active).toLocaleDateString() : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a2e' }}>
                <span style={{ color: '#b0b0d0', fontSize: 13 }}>{label}</span>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
