'use client'
import { useState, useMemo, memo } from 'react'
import { Search, Plus, X, Users, Store, MapPin, Trash2, ChevronRight } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TerritoryRow {
  id: string
  name: string
  color: string
  description: string | null
  center_lat: number | null
  center_lng: number | null
  radius_km: number
  created_at: string
  territory_stores: { store_id: string }[]
  territory_collectors: { collector_id: string }[]
}

interface StoreRow {
  id: string
  name: string
  city: string | null
  lat: number | null
  lng: number | null
}

interface CollectorRow {
  id: string
  full_name: string | null
  email: string
  collector_tier: string | null
}

interface Props {
  territories: TerritoryRow[]
  allStores: StoreRow[]
  allCollectors: CollectorRow[]
}

// ── SVG Territory Map ──────────────────────────────────────────────────────────

const TerritoryMap = memo(function TerritoryMap({
  stores,
  territories,
  selectedId,
}: {
  stores: StoreRow[]
  territories: TerritoryRow[]
  selectedId: string | null
}) {
  const W = 760
  const H = 380
  const PAD = 36

  const geoStores = stores.filter(s => s.lat && s.lng)

  // Build a store → territory map
  const storeTerritory = new Map<string, TerritoryRow>()
  for (const t of territories) {
    for (const ts of t.territory_stores) {
      storeTerritory.set(ts.store_id, t)
    }
  }

  // Territory circles need center lat/lng too
  const allLats = [
    ...geoStores.map(s => s.lat as number),
    ...territories.filter(t => t.center_lat).map(t => t.center_lat as number),
  ]
  const allLngs = [
    ...geoStores.map(s => s.lng as number),
    ...territories.filter(t => t.center_lng).map(t => t.center_lng as number),
  ]

  const minLat = allLats.length ? Math.min(...allLats) : 51.3
  const maxLat = allLats.length ? Math.max(...allLats) : 51.7
  const minLng = allLngs.length ? Math.min(...allLngs) : -0.35
  const maxLng = allLngs.length ? Math.max(...allLngs) : 0.15

  const latRange = maxLat - minLat || 0.4
  const lngRange = maxLng - minLng || 0.5

  function project(lat: number, lng: number) {
    const x = PAD + ((lng - minLng) / lngRange) * (W - PAD * 2)
    const y = PAD + ((maxLat - lat) / latRange) * (H - PAD * 2)
    return { x, y }
  }

  // Approximate km → SVG pixels for radius circles
  // 1 degree lat ≈ 111 km
  function radiusPx(radius_km: number) {
    const degPerKm = 1 / 111
    const latDeg = radius_km * degPerKm
    const svgHeight = H - PAD * 2
    return (latDeg / latRange) * svgHeight
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-xl"
      style={{ background: '#030305', border: '1px solid #222240' }}
    >
      {/* Grid */}
      {[0.25, 0.5, 0.75].map(f => (
        <g key={f}>
          <line x1={PAD} y1={PAD + f * (H - PAD * 2)} x2={W - PAD} y2={PAD + f * (H - PAD * 2)} stroke="#222240" strokeWidth="1" />
          <line x1={PAD + f * (W - PAD * 2)} y1={PAD} x2={PAD + f * (W - PAD * 2)} y2={H - PAD} stroke="#222240" strokeWidth="1" />
        </g>
      ))}

      {/* Territory radius circles */}
      {territories.map(t => {
        if (!t.center_lat || !t.center_lng) return null
        const { x, y } = project(t.center_lat, t.center_lng)
        const r = radiusPx(t.radius_km)
        const isSelected = t.id === selectedId
        return (
          <g key={`circle-${t.id}`}>
            <circle
              cx={x} cy={y} r={r}
              fill={t.color}
              fillOpacity={isSelected ? 0.18 : 0.08}
              stroke={t.color}
              strokeWidth={isSelected ? 2.5 : 1.2}
              strokeOpacity={isSelected ? 0.9 : 0.5}
            />
            {/* Center crosshair */}
            <circle cx={x} cy={y} r={4} fill={t.color} opacity={0.7} />
            <text x={x + 8} y={y + 4} fill={t.color} fontSize={10} fontWeight="600" opacity={0.85}>
              {t.name}
            </text>
          </g>
        )
      })}

      {/* Store dots */}
      {geoStores.map(s => {
        const { x, y } = project(s.lat as number, s.lng as number)
        const territory = storeTerritory.get(s.id)
        const color = territory ? territory.color : '#606080'
        const isInSelected = selectedId ? storeTerritory.get(s.id)?.id === selectedId : false
        return (
          <g key={`store-${s.id}`}>
            <circle cx={x} cy={y} r={isInSelected ? 10 : 7} fill={color} opacity={0.12} />
            <circle cx={x} cy={y} r={isInSelected ? 5.5 : 4} fill={color} opacity={isInSelected ? 1 : 0.8}>
              <title>{s.name}{territory ? ` — ${territory.name}` : ' — Unassigned'}</title>
            </circle>
          </g>
        )
      })}

      {geoStores.length === 0 && territories.length === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="#b0b0d0" fontSize={13}>
          No geographic data — add center lat/lng to territories
        </text>
      )}
    </svg>
  )
})

// ── Assign Modal ───────────────────────────────────────────────────────────────

function AssignModal({
  title,
  items,
  assigned,
  labelKey,
  subKey,
  onClose,
  onSave,
}: {
  title: string
  items: any[]
  assigned: Set<string>
  labelKey: string
  subKey?: string
  onClose: () => void
  onSave: (toAdd: string[], toRemove: string[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(assigned))
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = items.filter(item => {
    const label = (item[labelKey] ?? item.email ?? '').toLowerCase()
    return !search || label.includes(search.toLowerCase())
  })

  async function handleSave() {
    setSaving(true)
    const toAdd = [...selected].filter(id => !assigned.has(id))
    const toRemove = [...assigned].filter(id => !selected.has(id))
    await onSave(toAdd, toRemove)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,3,5,0.8)' }}>
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b border-[#222240]">
          <h3 className="text-white font-bold">{title}</h3>
          <button onClick={onClose} className="text-[#b0b0d0] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 border-b border-[#222240]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0d0]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-[#030305] border border-[#222240] rounded-xl pl-9 pr-4 py-2 text-white text-sm outline-none focus:border-[#7c6df5] transition-colors placeholder:text-[#b0b0d0]/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map(item => {
            const checked = selected.has(item.id)
            return (
              <button
                key={item.id}
                onClick={() => setSelected(prev => {
                  const next = new Set(prev)
                  checked ? next.delete(item.id) : next.add(item.id)
                  return next
                })}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors"
                  style={{
                    background: checked ? '#7c6df5' : 'transparent',
                    borderColor: checked ? '#7c6df5' : '#333360',
                  }}
                >
                  {checked && <span className="text-white text-[10px] font-black">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{item[labelKey] ?? item.email}</div>
                  {subKey && item[subKey] && (
                    <div className="text-[#b0b0d0] text-xs truncate">{item[subKey]}</div>
                  )}
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center text-[#b0b0d0] text-sm py-8">No results</p>
          )}
        </div>
        <div className="p-4 border-t border-[#222240] flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-[#222240] text-[#b0b0d0] text-sm font-medium hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? 'Saving…' : `Save (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Create Territory Modal ─────────────────────────────────────────────────────

function CreateTerritoryModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (t: TerritoryRow) => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#7c6df5')
  const [description, setDescription] = useState('')
  const [centerLat, setCenterLat] = useState('')
  const [centerLng, setCenterLng] = useState('')
  const [radius, setRadius] = useState(10)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const PRESET_COLORS = ['#7c6df5', '#00d4d4', '#00e096', '#ffc947', '#ff4d6d', '#f97316', '#06b6d4', '#ec4899']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/territories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          color,
          description: description.trim() || null,
          center_lat: centerLat ? parseFloat(centerLat) : null,
          center_lng: centerLng ? parseFloat(centerLng) : null,
          radius_km: radius,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      onCreate({ ...data, territory_stores: [], territory_collectors: [] })
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,3,5,0.8)' }}>
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#222240]">
          <h3 className="text-white font-bold text-lg">Create Territory</h3>
          <button onClick={onClose} className="text-[#b0b0d0] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-[#ff4d6d]/10 border border-[#ff4d6d]/30 rounded-xl px-4 py-2 text-[#ff4d6d] text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[#b0b0d0] text-xs font-semibold uppercase tracking-wider mb-1.5">Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. North London"
              className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#7c6df5] transition-colors placeholder:text-[#b0b0d0]/50"
            />
          </div>

          <div>
            <label className="block text-[#b0b0d0] text-xs font-semibold uppercase tracking-wider mb-1.5">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c,
                    ring: color === c ? `3px solid ${c}` : undefined,
                    outline: color === c ? `2px solid ${c}` : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-7 h-7 rounded-full border border-[#222240] cursor-pointer bg-[#030305]"
                title="Custom color"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#b0b0d0] text-xs font-semibold uppercase tracking-wider mb-1.5">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#7c6df5] transition-colors placeholder:text-[#b0b0d0]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#b0b0d0] text-xs font-semibold uppercase tracking-wider mb-1.5">Center Latitude</label>
              <input
                value={centerLat}
                onChange={e => setCenterLat(e.target.value)}
                type="number"
                step="any"
                placeholder="e.g. 51.5074"
                className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#7c6df5] transition-colors placeholder:text-[#b0b0d0]/50"
              />
            </div>
            <div>
              <label className="block text-[#b0b0d0] text-xs font-semibold uppercase tracking-wider mb-1.5">Center Longitude</label>
              <input
                value={centerLng}
                onChange={e => setCenterLng(e.target.value)}
                type="number"
                step="any"
                placeholder="e.g. -0.1278"
                className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#7c6df5] transition-colors placeholder:text-[#b0b0d0]/50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[#b0b0d0] text-xs font-semibold uppercase tracking-wider">Radius</label>
              <span className="text-white text-sm font-bold">{radius} km</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
              className="w-full accent-[#7c6df5]"
            />
            <div className="flex justify-between text-[10px] text-[#b0b0d0] mt-0.5">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#222240] text-[#b0b0d0] text-sm font-medium hover:text-white transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create Territory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Client ────────────────────────────────────────────────────────────────

export default function TerritoriesClient({ territories: initial, allStores, allCollectors }: Props) {
  const [territories, setTerritories] = useState<TerritoryRow[]>(initial)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [assignMode, setAssignMode] = useState<'stores' | 'collectors' | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const selected = territories.find(t => t.id === selectedId) ?? null

  // ── Mutations ──────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this territory? Assignments will be removed.')) return
    setDeleting(id)
    await fetch(`/api/territories/${id}`, { method: 'DELETE' })
    setTerritories(prev => prev.filter(t => t.id !== id))
    if (selectedId === id) setSelectedId(null)
    setDeleting(null)
  }

  async function handleAssignStores(toAdd: string[], toRemove: string[]) {
    if (!selected) return
    if (toAdd.length) {
      await fetch(`/api/territories/${selected.id}/stores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeIds: toAdd, action: 'add' }),
      })
    }
    if (toRemove.length) {
      await fetch(`/api/territories/${selected.id}/stores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeIds: toRemove, action: 'remove' }),
      })
    }
    // Optimistic update
    setTerritories(prev => prev.map(t => {
      if (t.id !== selected.id) return t
      const existingIds = new Set(t.territory_stores.map(ts => ts.store_id))
      toAdd.forEach(id => existingIds.add(id))
      toRemove.forEach(id => existingIds.delete(id))
      return { ...t, territory_stores: [...existingIds].map(id => ({ store_id: id })) }
    }))
  }

  async function handleAssignCollectors(toAdd: string[], toRemove: string[]) {
    if (!selected) return
    if (toAdd.length) {
      await fetch(`/api/territories/${selected.id}/collectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectorIds: toAdd, action: 'add' }),
      })
    }
    if (toRemove.length) {
      await fetch(`/api/territories/${selected.id}/collectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectorIds: toRemove, action: 'remove' }),
      })
    }
    setTerritories(prev => prev.map(t => {
      if (t.id !== selected.id) return t
      const existingIds = new Set(t.territory_collectors.map(tc => tc.collector_id))
      toAdd.forEach(id => existingIds.add(id))
      toRemove.forEach(id => existingIds.delete(id))
      return { ...t, territory_collectors: [...existingIds].map(id => ({ collector_id: id })) }
    }))
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const assignedStoreIds = useMemo(
    () => new Set(selected?.territory_stores.map(ts => ts.store_id) ?? []),
    [selected]
  )
  const assignedCollectorIds = useMemo(
    () => new Set(selected?.territory_collectors.map(tc => tc.collector_id) ?? []),
    [selected]
  )

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Territories</h1>
          <p className="text-[#b0b0d0] mt-1">
            {territories.length} territory{territories.length !== 1 ? 'ies' : 'y'} defined
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          <Plus size={15} />
          Create Territory
        </button>
      </div>

      {/* Main layout: list + map */}
      <div className="flex gap-6">
        {/* Left: territory list — 1/3 */}
        <div className="w-80 flex-shrink-0 space-y-3">
          {territories.length === 0 ? (
            <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-8 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#7c6df5]/15 flex items-center justify-center mx-auto mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="#7c6df5" strokeWidth="2" className="w-5 h-5">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </div>
              <p className="text-white font-semibold text-sm">No territories yet</p>
              <p className="text-[#b0b0d0] text-xs mt-1">Create one to start assigning stores and collectors.</p>
            </div>
          ) : (
            territories.map(t => {
              const isSelected = t.id === selectedId
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(isSelected ? null : t.id)}
                  className="bg-[#0c0c18] border rounded-2xl p-4 cursor-pointer transition-all hover:border-[#7c6df5]/40"
                  style={{
                    borderColor: isSelected ? t.color + '80' : '#222240',
                    background: isSelected ? t.color + '08' : '#0c0c18',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1" style={{ background: t.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-sm truncate">{t.name}</span>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(t.id) }}
                          disabled={deleting === t.id}
                          className="text-[#b0b0d0] hover:text-[#ff4d6d] transition-colors flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {t.description && (
                        <p className="text-[#b0b0d0] text-xs mt-0.5 truncate">{t.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-[#b0b0d0]">
                          <Store size={11} />
                          {t.territory_stores.length}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[#b0b0d0]">
                          <Users size={11} />
                          {t.territory_collectors.length}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[#b0b0d0]">
                          <MapPin size={11} />
                          {t.radius_km} km
                        </span>
                      </div>
                    </div>
                    {isSelected && <ChevronRight size={14} className="text-[#7c6df5] flex-shrink-0 mt-0.5" />}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right: map + detail — 2/3 */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Map */}
          <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-bold">Territory Map</h2>
                <p className="text-[#b0b0d0] text-xs mt-0.5">Stores colored by territory assignment</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#b0b0d0]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#606080]" />
                  Unassigned
                </span>
                {territories.slice(0, 3).map(t => (
                  <span key={t.id} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
            <TerritoryMap stores={allStores} territories={territories} selectedId={selectedId} />
          </div>

          {/* Selected territory detail */}
          {selected && (
            <div className="bg-[#0c0c18] border rounded-2xl p-5" style={{ borderColor: selected.color + '40' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 rounded-full" style={{ background: selected.color }} />
                <h2 className="text-white font-bold text-lg">{selected.name}</h2>
                {selected.description && (
                  <span className="text-[#b0b0d0] text-sm">{selected.description}</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-[#030305] rounded-xl p-3 text-center">
                  <div className="text-2xl font-black text-white">{selected.territory_stores.length}</div>
                  <div className="text-[#b0b0d0] text-xs mt-0.5">Stores</div>
                </div>
                <div className="bg-[#030305] rounded-xl p-3 text-center">
                  <div className="text-2xl font-black text-white">{selected.territory_collectors.length}</div>
                  <div className="text-[#b0b0d0] text-xs mt-0.5">Collectors</div>
                </div>
                <div className="bg-[#030305] rounded-xl p-3 text-center">
                  <div className="text-2xl font-black text-white">{selected.radius_km}</div>
                  <div className="text-[#b0b0d0] text-xs mt-0.5">Radius (km)</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setAssignMode('stores')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#7c6df5]/15 border border-[#7c6df5]/30 text-[#a89cf7] text-sm font-semibold rounded-xl hover:bg-[#7c6df5]/25 transition-colors"
                >
                  <Store size={14} />
                  Manage Stores
                </button>
                <button
                  onClick={() => setAssignMode('collectors')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00d4d4]/10 border border-[#00d4d4]/25 text-[#00d4d4] text-sm font-semibold rounded-xl hover:bg-[#00d4d4]/20 transition-colors"
                >
                  <Users size={14} />
                  Manage Collectors
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateTerritoryModal
          onClose={() => setShowCreate(false)}
          onCreate={t => setTerritories(prev => [t, ...prev])}
        />
      )}

      {assignMode === 'stores' && selected && (
        <AssignModal
          title={`Stores — ${selected.name}`}
          items={allStores}
          assigned={assignedStoreIds}
          labelKey="name"
          subKey="city"
          onClose={() => setAssignMode(null)}
          onSave={handleAssignStores}
        />
      )}

      {assignMode === 'collectors' && selected && (
        <AssignModal
          title={`Collectors — ${selected.name}`}
          items={allCollectors}
          assigned={assignedCollectorIds}
          labelKey="full_name"
          subKey="email"
          onClose={() => setAssignMode(null)}
          onSave={handleAssignCollectors}
        />
      )}
    </div>
  )
}
