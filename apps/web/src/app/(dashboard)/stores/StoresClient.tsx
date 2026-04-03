'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  _taskCount?: number;
  _avgScore?: number;
}

export default function StoresClient() {
  const supabase = createClient();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
      if (!profile?.organization_id) return;
      setOrgId(profile.organization_id);

      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('name');
      setStores(data ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = useMemo(() => {
    if (!search.trim()) return stores;
    const q = search.toLowerCase();
    return stores.filter(s => s.name.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q));
  }, [stores, search]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map(s => s.id)));
  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} stores? This cannot be undone.`)) return;
    await supabase.from('stores').delete().in('id', [...selected]);
    setStores(prev => prev.filter(s => !selected.has(s.id)));
    clearSelection();
  };

  const handleSaveEdit = async () => {
    if (!editStore) return;
    setSaving(true);
    await supabase.from('stores').update({
      name: editStore.name,
      address: editStore.address,
      city: editStore.city,
      latitude: editStore.latitude,
      longitude: editStore.longitude,
    }).eq('id', editStore.id);
    setStores(prev => prev.map(s => s.id === editStore.id ? editStore : s));
    setSaving(false);
    setEditStore(null);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setImporting(true);
    const text = await file.text();
    const lines = text.trim().split('\n').slice(1); // skip header
    const rows = lines.map(line => {
      const [name, address, city, lat, lng] = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return { name, address, city, latitude: lat ? parseFloat(lat) : null, longitude: lng ? parseFloat(lng) : null, organization_id: orgId };
    }).filter(r => r.name);

    if (rows.length > 0) {
      const { data } = await supabase.from('stores').upsert(rows, { onConflict: 'name,organization_id' }).select();
      if (data) setStores(prev => {
        const updated = [...prev];
        data.forEach(newStore => {
          const idx = updated.findIndex(s => s.id === newStore.id);
          idx >= 0 ? (updated[idx] = newStore) : updated.push(newStore);
        });
        return updated.sort((a, b) => a.name.localeCompare(b.name));
      });
    }
    setImporting(false);
    e.target.value = '';
  };

  const card = { background: '#0c0c18', border: '1px solid #222240', borderRadius: 12 } as const;

  return (
    <div style={{ padding: '32px 40px', background: '#030305', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 }}>Stores</h1>
          <p style={{ color: '#b0b0d0', margin: '4px 0 0', fontSize: 14 }}>{stores.length} stores in your organization</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ padding: '10px 18px', background: 'transparent', border: '1px solid #222240', borderRadius: 8, color: '#b0b0d0', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            {importing ? 'Importing...' : '⬆ Import CSV'}
            <input type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
          </label>
          <a
            href={`data:text/csv;charset=utf-8,name,address,city,latitude,longitude\n${stores.map(s => `"${s.name}","${s.address ?? ''}","${s.city ?? ''}",${s.latitude ?? ''},${s.longitude ?? ''}`).join('\n')}`}
            download="stores.csv"
            style={{ padding: '10px 18px', background: 'transparent', border: '1px solid #222240', borderRadius: 8, color: '#b0b0d0', textDecoration: 'none', fontSize: 14 }}
          >
            ⬇ Export CSV
          </a>
        </div>
      </div>

      {/* Search + bulk actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search stores..."
          style={{ background: '#0c0c18', border: '1px solid #222240', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, flex: 1, outline: 'none' }}
        />
        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#b0b0d0', fontSize: 13 }}>{selected.size} selected</span>
            <button onClick={handleBulkDelete} style={{ padding: '8px 16px', background: '#ff4d6d22', border: '1px solid #ff4d6d', borderRadius: 8, color: '#ff4d6d', cursor: 'pointer', fontSize: 13 }}>Delete</button>
            <button onClick={clearSelection} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #222240', borderRadius: 8, color: '#b0b0d0', cursor: 'pointer', fontSize: 13 }}>Deselect</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 100px 100px 80px', gap: 0, borderBottom: '1px solid #222240' }}>
          {['', 'Store Name', 'Address', 'City', 'Coordinates', ''].map((h, i) => (
            <div key={i} style={{ padding: '12px 16px', color: '#b0b0d0', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {h === '' && i === 0 ? (
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={e => e.target.checked ? selectAll() : clearSelection()} style={{ accentColor: '#7c6df5' }} />
              ) : h}
            </div>
          ))}
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#b0b0d0' }}>Loading stores...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#b0b0d0' }}>No stores found</div>
        ) : (
          filtered.map((store, i) => (
            <div key={store.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 100px 100px 80px', gap: 0, borderBottom: i < filtered.length - 1 ? '1px solid #1a1a2e' : 'none', background: selected.has(store.id) ? '#0a0a20' : 'transparent' }}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" checked={selected.has(store.id)} onChange={() => toggleSelect(store.id)} style={{ accentColor: '#7c6df5' }} />
              </div>
              <div style={{ padding: '14px 16px', color: '#fff', fontSize: 14, fontWeight: 500 }}>{store.name}</div>
              <div style={{ padding: '14px 16px', color: '#b0b0d0', fontSize: 13 }}>{store.address ?? '—'}</div>
              <div style={{ padding: '14px 16px', color: '#b0b0d0', fontSize: 13 }}>{store.city ?? '—'}</div>
              <div style={{ padding: '14px 16px', color: '#b0b0d0', fontSize: 12, fontFamily: 'monospace' }}>
                {store.latitude != null ? `${store.latitude.toFixed(3)}, ${store.longitude?.toFixed(3)}` : '—'}
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={() => setEditStore(store)} style={{ background: 'transparent', border: 'none', color: '#7c6df5', cursor: 'pointer', fontSize: 13 }}>Edit</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit modal */}
      {editStore && (
        <div style={{ position: 'fixed', inset: 0, background: '#030305cc', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0c0c18', border: '1px solid #222240', borderRadius: 16, padding: 32, width: 480 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 24px' }}>Edit Store</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Store Name', key: 'name', type: 'text' },
                { label: 'Address', key: 'address', type: 'text' },
                { label: 'City', key: 'city', type: 'text' },
                { label: 'Latitude', key: 'latitude', type: 'number' },
                { label: 'Longitude', key: 'longitude', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label style={{ display: 'block', color: '#b0b0d0', fontSize: 13, marginBottom: 6 }}>{label}</label>
                  <input
                    type={type}
                    value={(editStore as Record<string, unknown>)[key] as string ?? ''}
                    onChange={e => setEditStore(prev => prev ? { ...prev, [key]: type === 'number' ? parseFloat(e.target.value) || null : e.target.value } : null)}
                    style={{ background: '#030305', border: '1px solid #222240', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={handleSaveEdit} disabled={saving} style={{ flex: 1, padding: '11px', background: '#7c6df5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditStore(null)} style={{ flex: 1, padding: '11px', background: 'transparent', color: '#b0b0d0', border: '1px solid #222240', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
