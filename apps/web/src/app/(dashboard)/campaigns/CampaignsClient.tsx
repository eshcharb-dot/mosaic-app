'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronDown, X, Pause, Download, Trash2 } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Checkbox from '@/components/ui/Checkbox'

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
  const router = useRouter()

  // Filter / sort state
  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [dateAfter, setDateAfter] = useState('')
  const [dateBefore, setDateBefore] = useState('')
  const [showDateFilters, setShowDateFilters] = useState(false)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

  const isDefault = statusTab === 'all' && sortKey === 'newest' && !dateAfter && !dateBefore

  function clearAll() {
    setStatusTab('all')
    setSortKey('newest')
    setDateAfter('')
    setDateBefore('')
  }

  // Clear selection on navigation
  useEffect(() => {
    setSelectedIds(new Set())
  }, [statusTab, sortKey, dateAfter, dateBefore])

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

  const filteredIds = useMemo(() => filtered.map(c => c.id), [filtered])
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id))
  const someSelected = filteredIds.some(id => selectedIds.has(id))
  const selectedCount = filteredIds.filter(id => selectedIds.has(id)).length

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedIds(prev => new Set([...prev, ...filteredIds]))
    }
  }

  function toggleRow(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setBulkResult(null)
  }

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSelection()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      const active = document.activeElement
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')
      if (!isInput) {
        e.preventDefault()
        setSelectedIds(new Set(filteredIds))
      }
    }
  }, [filteredIds])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  async function runBulkAction(action: 'pause' | 'activate' | 'delete') {
    const ids = filteredIds.filter(id => selectedIds.has(id))
    if (ids.length === 0) return
    setBulkLoading(true)
    setBulkResult(null)
    try {
      const res = await fetch('/api/campaigns/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignIds: ids, action }),
      })
      const json = await res.json()
      setBulkResult(json)
      if (json.success > 0) {
        clearSelection()
        router.refresh()
      }
    } catch {
      setBulkResult({ success: 0, failed: ids.length, errors: ['Network error — please try again'] })
    } finally {
      setBulkLoading(false)
    }
  }

  function handleExportAll() {
    const ids = filteredIds.filter(id => selectedIds.has(id))
    ids.forEach((id, i) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = `/api/reports/${id}/export`
        a.download = ''
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }, i * 500)
    })
    clearSelection()
  }

  const STATUS_TABS: { key: StatusTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'draft', label: 'Draft' },
    { key: 'paused', label: 'Paused' },
    { key: 'completed', label: 'Completed' },
  ]

  const hasSelection = selectedCount > 0

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

          {/* Selection count badge */}
          {hasSelection && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#7c6df5]/20 border border-[#7c6df5]/40 text-[#a89cf7]">
              {selectedCount} selected
              <button onClick={clearSelection} className="hover:text-white transition-colors ml-0.5">
                <X size={11} />
              </button>
            </span>
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
          {/* Header */}
          <div className="grid grid-cols-[36px_2fr_1fr_110px_90px_90px_80px_60px] gap-4 px-6 py-3 border-b border-[#222240] text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider items-center">
            <div className="flex items-center">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={toggleSelectAll}
                size="sm"
              />
            </div>
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
              const isSelected = selectedIds.has(c.id)
              return (
                <div
                  key={c.id}
                  className={`grid grid-cols-[36px_2fr_1fr_110px_90px_90px_80px_60px] gap-4 px-6 py-4 items-center transition-colors ${
                    isSelected
                      ? 'bg-[#7c6df5]/[0.06] hover:bg-[#7c6df5]/[0.09]'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleRow(c.id)}
                      size="sm"
                    />
                  </div>
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

      {/* Floating bulk action bar */}
      <div
        className="fixed bottom-6 left-1/2 z-50 transition-all duration-300"
        style={{
          transform: hasSelection
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(120%)',
          pointerEvents: hasSelection ? 'auto' : 'none',
          opacity: hasSelection ? 1 : 0,
        }}
      >
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-[#333360] shadow-2xl"
          style={{
            background: 'rgba(12, 12, 24, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          {/* Count */}
          <span className="text-sm font-bold text-white mr-1">
            {selectedCount} selected
          </span>

          <div className="w-px h-5 bg-[#333360]" />

          {/* Pause all */}
          <button
            onClick={() => runBulkAction('pause')}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#ffc947]/10 border border-[#ffc947]/30 text-[#ffc947] hover:bg-[#ffc947]/20 transition-colors disabled:opacity-50"
          >
            <Pause size={13} />
            Pause all
          </button>

          {/* Export CSV all */}
          <button
            onClick={handleExportAll}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#00d4d4]/10 border border-[#00d4d4]/30 text-[#00d4d4] hover:bg-[#00d4d4]/20 transition-colors disabled:opacity-50"
          >
            <Download size={13} />
            Export CSV all
          </button>

          {/* Delete drafts */}
          <button
            onClick={() => runBulkAction('delete')}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#ff6b9d]/10 border border-[#ff6b9d]/30 text-[#ff6b9d] hover:bg-[#ff6b9d]/20 transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} />
            Delete drafts
          </button>

          <div className="w-px h-5 bg-[#333360]" />

          {/* Result feedback */}
          {bulkResult && (
            <span className={`text-xs font-medium ${bulkResult.failed > 0 ? 'text-[#ff6b9d]' : 'text-[#00e096]'}`}>
              {bulkResult.failed > 0
                ? `${bulkResult.failed} failed`
                : `Done`}
            </span>
          )}

          {/* Cancel */}
          <button
            onClick={clearSelection}
            className="flex items-center gap-1 text-[#b0b0d0] hover:text-white transition-colors text-sm font-medium"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
