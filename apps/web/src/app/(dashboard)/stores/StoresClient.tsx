'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Store, ChevronUp, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface StoreRow {
  id: string
  name: string
  city: string | null
  address: string | null
  postcode: string | null
  retailer: string | null
  avg_score: number | null
  last_audit_date: string | null
  audit_count: number
}

interface Props {
  stores: StoreRow[]
}

type SortKey = 'name' | 'city' | 'avg_score' | 'last_audit_date' | 'audit_count'
type SortDir = 'asc' | 'desc'

function scoreColor(score: number | null): string {
  if (score === null) return '#b0b0d0'
  if (score >= 80) return '#00e096'
  if (score >= 60) return '#ffc947'
  return '#ff6b9d'
}

function TrendArrow({ score }: { score: number | null }) {
  // Without per-store trend from the list query, we use score thresholds as proxy indicators
  if (score === null) return <span className="text-[#b0b0d0]">—</span>
  if (score >= 80) return <span className="text-[#00e096] font-bold">↑</span>
  if (score >= 60) return <span className="text-[#ffc947] font-bold">→</span>
  return <span className="text-[#ff6b9d] font-bold">↓</span>
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp size={12} className="opacity-20" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-[#7c6df5]" />
    : <ChevronDown size={12} className="text-[#7c6df5]" />
}

export default function StoresClient({ stores }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [toast, setToast] = useState(false)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return stores
      .filter(s => !q || s.name.toLowerCase().includes(q) || (s.city ?? '').toLowerCase().includes(q))
      .sort((a, b) => {
        let av: any = a[sortKey]
        let bv: any = b[sortKey]
        if (av === null || av === undefined) av = sortDir === 'asc' ? Infinity : -Infinity
        if (bv === null || bv === undefined) bv = sortDir === 'asc' ? Infinity : -Infinity
        if (typeof av === 'string') av = av.toLowerCase()
        if (typeof bv === 'string') bv = bv.toLowerCase()
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
  }, [stores, search, sortKey, sortDir])

  function handleAddStore() {
    setToast(true)
    setTimeout(() => setToast(false), 3500)
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Store' },
    { key: 'city', label: 'City' },
    { key: 'avg_score', label: 'Avg Score' },
    { key: 'last_audit_date', label: 'Last Audit' },
    { key: 'audit_count', label: 'Audits' },
  ]

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Stores</h1>
          <p className="text-[#b0b0d0] mt-1">
            {stores.length} store{stores.length !== 1 ? 's' : ''} across all campaigns
          </p>
        </div>
        <button
          onClick={handleAddStore}
          className="flex items-center gap-2 bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
        >
          <Store size={15} />
          Add Store
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0d0]" />
        <input
          type="text"
          placeholder="Search by store name or city…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#0c0c18] border border-[#222240] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none focus:border-[#7c6df5] transition-colors placeholder:text-[#b0b0d0]/50"
        />
      </div>

      {/* Table */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_1fr_120px_160px_80px_60px] gap-4 px-6 py-3 border-b border-[#222240] text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">
          {cols.map(col => (
            <button
              key={col.key}
              onClick={() => toggleSort(col.key)}
              className="flex items-center gap-1 hover:text-white transition-colors text-left"
            >
              {col.label}
              <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
            </button>
          ))}
          <span>Trend</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Store size={28} className="text-[#b0b0d0] opacity-30 mb-3" />
            {stores.length === 0 ? (
              <>
                <p className="text-white font-semibold">No stores yet</p>
                <p className="text-[#b0b0d0] text-sm mt-1">Stores appear here once you upload them via a campaign.</p>
              </>
            ) : (
              <>
                <p className="text-white font-semibold">No matches</p>
                <button onClick={() => setSearch('')} className="text-[#7c6df5] text-sm mt-2 hover:underline">
                  Clear search
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#222240]">
            {filtered.map(store => (
              <div
                key={store.id}
                onClick={() => router.push(`/stores/${store.id}`)}
                className="grid grid-cols-[2fr_1fr_120px_160px_80px_60px] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-medium text-white truncate">{store.name}</div>
                  {store.retailer && (
                    <div className="text-xs text-[#b0b0d0] truncate">{store.retailer}</div>
                  )}
                </div>
                <div className="text-sm text-[#b0b0d0] truncate">{store.city ?? '—'}</div>
                <div>
                  {store.avg_score !== null ? (
                    <span
                      className="font-bold text-sm"
                      style={{ color: scoreColor(store.avg_score) }}
                    >
                      {store.avg_score}
                    </span>
                  ) : (
                    <span className="text-[#b0b0d0] text-sm">—</span>
                  )}
                </div>
                <div className="text-sm text-[#b0b0d0]">
                  {store.last_audit_date
                    ? formatDistanceToNow(new Date(store.last_audit_date), { addSuffix: true })
                    : '—'}
                </div>
                <div className="text-sm text-[#b0b0d0]">{store.audit_count}</div>
                <div>
                  <TrendArrow score={store.avg_score} />
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-[#222240] text-xs text-[#b0b0d0]">
            {filtered.length} of {stores.length} stores
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0c0c18] border border-[#222240] rounded-xl px-5 py-3 shadow-2xl text-sm text-white animate-in fade-in slide-in-from-bottom-2">
          Use <span className="text-[#7c6df5] font-semibold">Store Upload</span> in a campaign to add stores.
        </div>
      )}
    </div>
  )
}
