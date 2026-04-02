'use client'
import { useState, useEffect, useCallback } from 'react'
import Checkbox from '@/components/ui/Checkbox'
import { X, Download } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  status: string
  created_at: string
  compliance_score: number | null
  campaign_stores: { count: number }[]
}

interface Props {
  campaigns: Campaign[]
}

function statusColor(status: string) {
  switch (status) {
    case 'active': return '#00e096'
    case 'paused': return '#ffc947'
    case 'completed': return '#7c6df5'
    default: return '#b0b0d0'
  }
}

export default function ReportsClient({ campaigns }: Props) {
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const allSelected = campaigns.length > 0 && campaigns.every(c => selectedIds.has(c.id))
  const someSelected = campaigns.some(c => selectedIds.has(c.id))
  const selectedCount = campaigns.filter(c => selectedIds.has(c.id)).length
  const hasSelection = selectedCount > 0

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(campaigns.map(c => c.id)))
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
  }

  function handleExport(campaign: Campaign) {
    setExportingId(campaign.id)
    const a = document.createElement('a')
    a.href = `/api/reports/${campaign.id}/export`
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => setExportingId(null), 2000)
  }

  function handleExportSelected() {
    const ids = campaigns.filter(c => selectedIds.has(c.id)).map(c => c.id)
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
        setSelectedIds(new Set(campaigns.map(c => c.id)))
      }
    }
  }, [campaigns])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Reports</h1>
          <p className="text-[#b0b0d0] mt-1">Export campaign data as CSV for analysis and compliance audits</p>
        </div>
        <div className="flex items-center gap-3">
          {hasSelection && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#7c6df5]/20 border border-[#7c6df5]/40 text-[#a89cf7]">
              {selectedCount} selected
              <button onClick={clearSelection} className="hover:text-white transition-colors ml-0.5">
                <X size={11} />
              </button>
            </span>
          )}
          <div className="text-sm text-[#b0b0d0] bg-[#0c0c18] border border-[#222240] rounded-xl px-4 py-2">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#7c6df5]/10 border border-[#7c6df5]/20 flex items-center justify-center mb-4">
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#7c6df5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No campaigns yet</h3>
          <p className="text-[#b0b0d0] text-sm max-w-xs">
            Once you create campaigns and collect submissions, you can export reports here.
          </p>
          <a
            href="/campaigns/new"
            className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity"
          >
            Create your first campaign
          </a>
        </div>
      ) : (
        <>
          {/* Select-all row */}
          <div className="flex items-center gap-3 mb-3 px-1">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onChange={toggleAll}
              label={allSelected ? 'Deselect all' : 'Select all'}
              size="sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {campaigns.map((campaign) => {
              const storeCount = campaign.campaign_stores?.[0]?.count ?? 0
              const isExporting = exportingId === campaign.id
              const isSelected = selectedIds.has(campaign.id)
              const createdDate = new Date(campaign.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })

              return (
                <div
                  key={campaign.id}
                  className={`bg-[#0c0c18] border rounded-2xl p-5 flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'border-[#7c6df5]/40 bg-[#7c6df5]/[0.04]'
                      : 'border-[#222240] hover:border-[#7c6df5]/30'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="mr-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleRow(campaign.id)}
                      size="sm"
                    />
                  </div>

                  {/* Left: campaign info */}
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${statusColor(campaign.status)}15`, border: `1px solid ${statusColor(campaign.status)}30` }}>
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={statusColor(campaign.status)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-white truncate">{campaign.name}</span>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                          style={{
                            color: statusColor(campaign.status),
                            background: `${statusColor(campaign.status)}15`,
                            border: `1px solid ${statusColor(campaign.status)}30`,
                          }}
                        >
                          {campaign.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#b0b0d0]">
                        <span>{storeCount} store{storeCount !== 1 ? 's' : ''}</span>
                        <span className="text-[#222240]">·</span>
                        <span>Created {createdDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: compliance score */}
                  <div className="flex items-center gap-8 mx-8">
                    <div className="text-center">
                      <div
                        className="text-2xl font-black"
                        style={{
                          color:
                            campaign.compliance_score == null
                              ? '#b0b0d0'
                              : campaign.compliance_score >= 80
                              ? '#00e096'
                              : campaign.compliance_score >= 60
                              ? '#ffc947'
                              : '#ff6b9d',
                        }}
                      >
                        {campaign.compliance_score != null
                          ? `${Math.round(campaign.compliance_score)}%`
                          : '—'}
                      </div>
                      <div className="text-xs text-[#b0b0d0]">compliance</div>
                    </div>
                  </div>

                  {/* Right: export button */}
                  <button
                    onClick={() => handleExport(campaign)}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white hover:border-[#7c6df5]/50 transition-colors text-sm font-medium disabled:opacity-50 flex-shrink-0"
                  >
                    <Download size={15} />
                    {isExporting ? 'Exporting…' : 'Export CSV'}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Floating bulk export bar */}
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
          <span className="text-sm font-bold text-white mr-1">
            {selectedCount} selected
          </span>

          <div className="w-px h-5 bg-[#333360]" />

          <button
            onClick={handleExportSelected}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#00d4d4]/10 border border-[#00d4d4]/30 text-[#00d4d4] hover:bg-[#00d4d4]/20 transition-colors"
          >
            <Download size={13} />
            Export Selected ({selectedCount})
          </button>

          <div className="w-px h-5 bg-[#333360]" />

          <button
            onClick={clearSelection}
            className="flex items-center gap-1 text-[#b0b0d0] hover:text-white transition-colors text-sm font-medium"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
