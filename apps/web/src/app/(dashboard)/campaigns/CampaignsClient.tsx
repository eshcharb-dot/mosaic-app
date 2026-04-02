'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, X } from 'lucide-react'
import Badge from '@/components/ui/Badge'

interface Campaign {
  id: string
  name: string
  product_name: string
  product_sku: string | null
  status: string
  compliance_score: number | null
  created_at: string
  campaign_stores: { count: number }[]
}

type StatusTab = 'all' | 'active' | 'draft' | 'paused' | 'completed'
type SortKey = 'newest' | 'oldest' | 'compliance-desc' | 'stores-desc'

interface Props {
  campaigns: Campaign[]
}

export default function CampaignsClient({ campaigns }: Props) {
  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [dateAfter, setDateAfter] = useState('')
  const [dateBefore, setDateBefore] = useState('')
  const [showDateFilters, setShowDateFilters] = useState(false)

  const isDefault = statusTab === 'all' && sortKey === 'newest' && !dateAfter && !dateBefore

  function clearAll() {
    setStatusTab('all')
    setSortKey('newest')
    setDateAfter('')
    setDateBefore('')
  }

  const statusCounts = useMemo(() => {
    const counts: Record<StatusTab, number> = { all: campaigns.length, active: 0, draft: 0, paused: 0, completed: 0 }
    campaigns.forEach(c => {
      const s = c.status?.toLowerCase() as StatusTab
      if (s in counts) counts[s]++
    })
    return counts
  }, [campaigns])

  const filtered = useMemo(() => {
    let list = campaigns.filter(c => {
      if (statusTab !== 'all' && c.status?.toLowerCase() !== statusTab) return false
      if (dateAfter && new Date(c.created_at) < new Date(dateAfter)) return false
      if (dateBefore) {
        const before = new Date(dateBefore)
        before.setHours(23, 59, 59, 999)
        if (new Date(c.created_at) > before) return false
      }
      return true
    })

    list = [...list].sort((a, b) => {
      if (sortKey === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortKey === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortKey === 'compliance-desc') return (b.compliance_score ?? -1) - (a.compliance_score ?? -1)
      if (sortKey === 'stores-desc') {
        const bCount = b.campaign_stores?.[0]?.count ?? 0
        const aCount = a.campaign_stores?.[0]?.count ?? 0
        return bCount - aCount
      }
      return 0
    })

    return list
  }, [campaigns, statusTab, sortKey, dateAfter, dateBefore])

  const STATUS_TABS: { key: StatusTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'draft', label: 'Draft' },
    { key: 'paused', label: 'Paused' },
    { key: 'completed', label: 'Completed' },
  ]

  return (
    <>
      {/* Controls */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-[#0c0c18] border border-[#222240] rounded-xl p-1">
            {STATUS_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusTab(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusTab === key
                    ? 'bg-[#7c6df5] text-white'
                    : 'text-[#b0b0d0] hover:text-white'
                }`}
              >
                {label}
                <span className={`ml-1.5 text-[10px] ${statusTab === key ? 'text-white/60' : 'text-[#b0b0d0]/50'}`}>
                  {statusCounts[key]}
                </span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="appearance-none bg-[#0c0c18] border border-[#222240] rounded-xl pl-4 pr-9 py-2 text-sm text-white outline-none focus:border-[#7c6df5] transition-colors cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="compliance-desc">Highest Compliance</option>
              <option value="stores-desc">Most Stores</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#b0b0d0]" />
          </div>

          {/* Date range toggle */}
          <button
            onClick={() => setShowDateFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              showDateFilters || dateAfter || dateBefore
                ? 'bg-[#7c6df5]/15 border-[#7c6df5]/40 text-[#a89cf7]'
                : 'bg-[#0c0c18] border-[#222240] text-[#b0b0d0] hover:text-white'
            }`}
          >
            Date range
            {(dateAfter || dateBefore) && <span className="w-1.5 h-1.5 rounded-full bg-[#7c6df5]" />}
          </button>

          {!isDefault && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-[#b0b0d0] hover:text-[#ff4d6d] transition-colors font-medium"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>

        {/* Date range row */}
        {showDateFilters && (
          <div className="flex flex-wrap items-center gap-3 bg-[#0c0c18] border border-[#222240] rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#b0b0d0] font-semibold whitespace-nowrap">Created after</label>
              <input
                type="date"
                value={dateAfter}
                onChange={e => setDateAfter(e.target.value)}
                className="bg-[#030305] border border-[#222240] rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-[#7c6df5] transition-colors [color-scheme:dark]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#b0b0d0] font-semibold whitespace-nowrap">Before</label>
              <input
                type="date"
                value={dateBefore}
                onChange={e => setDateBefore(e.target.value)}
                className="bg-[#030305] border border-[#222240] rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-[#7c6df5] transition-colors [color-scheme:dark]"
              />
            </div>
            {(dateAfter || dateBefore) && (
              <button
                onClick={() => { setDateAfter(''); setDateBefore('') }}
                className="text-xs text-[#b0b0d0] hover:text-white transition-colors"
              >
                Clear dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl flex flex-col items-center justify-center py-16 text-center">
          <p className="text-white font-semibold">No campaigns match these filters</p>
          <button onClick={clearAll} className="mt-3 text-[#7c6df5] text-sm font-semibold hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_110px_90px_90px_80px_60px] gap-4 px-6 py-3 border-b border-[#222240] text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">
            <span>Campaign</span>
            <span>Product</span>
            <span>Status</span>
            <span className="text-center">Stores</span>
            <span className="text-center">Compliance</span>
            <span>Created</span>
            <span />
          </div>

          <div className="divide-y divide-[#222240]">
            {filtered.map(c => {
              const storeCount = c.campaign_stores?.[0]?.count ?? 0
              const created = new Date(c.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[2fr_1fr_110px_90px_90px_80px_60px] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{c.name}</div>
                    {c.product_sku && <div className="text-xs text-[#b0b0d0] mt-0.5">{c.product_sku}</div>}
                  </div>
                  <div className="text-sm text-[#b0b0d0] truncate">{c.product_name}</div>
                  <div><Badge status={c.status} size="sm" /></div>
                  <div className="text-center">
                    <span className="text-white font-semibold">{storeCount}</span>
                  </div>
                  <div className="text-center">
                    {c.compliance_score !== null ? (
                      <span
                        className="font-bold"
                        style={{ color: c.compliance_score >= 80 ? '#00e096' : c.compliance_score >= 60 ? '#ffc947' : '#ff6b9d' }}
                      >
                        {Math.round(c.compliance_score)}%
                      </span>
                    ) : (
                      <span className="text-[#b0b0d0]">—</span>
                    )}
                  </div>
                  <div className="text-xs text-[#b0b0d0]">{created}</div>
                  <div className="flex justify-end">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="flex items-center gap-1 text-[#7c6df5] hover:text-white text-sm font-medium transition-colors"
                    >
                      View <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
