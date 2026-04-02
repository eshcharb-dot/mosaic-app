'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store, CheckCircle, Clock, BarChart3, Zap, Settings, Upload, Download, Copy, MoreHorizontal, LayoutTemplate, X, UserCheck, CheckCheck, Trash2 } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Checkbox from '@/components/ui/Checkbox'
import StoreUpload from './StoreUpload'

interface StoreRow {
  id: string
  name: string
  city: string
  address: string | null
  postcode: string | null
  retailer: string | null
}

interface CampaignStore {
  id: string
  campaign_id: string
  store_id: string
  status: string
  compliance_score: number | null
  last_submission_at: string | null
  stores: StoreRow | null
}

interface Campaign {
  id: string
  name: string
  brief: string | null
  payout_amount: number | null
  product_name: string
  product_sku: string | null
  status: string
  compliance_score: number | null
  sla_minutes: number
  created_at: string
  organization_id: string
}

interface Props {
  campaign: Campaign
  campaignStores: CampaignStore[]
}

type Tab = 'stores' | 'submissions' | 'settings'

export default function CampaignDetail({ campaign, campaignStores }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('stores')
  const [status, setStatus] = useState(campaign.status)
  const [activating, setActivating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState(campaign.name)
  const [templateCategory, setTemplateCategory] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  // Store selection
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set())
  const [storeBulkLoading, setStoreBulkLoading] = useState(false)
  const [storeBulkResult, setStoreBulkResult] = useState<string | null>(null)

  // Reassign modal
  const [showReassign, setShowReassign] = useState(false)
  const [collectorId, setCollectorId] = useState('')
  const [reassigning, setReassigning] = useState(false)

  // Remove confirmation
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  // Settings form state
  const [settingsName, setSettingsName] = useState(campaign.name)
  const [settingsBrief, setSettingsBrief] = useState(campaign.brief ?? '')
  const [settingsPayout, setSettingsPayout] = useState(campaign.payout_amount?.toString() ?? '')
  const [settingsStatus, setSettingsStatus] = useState(campaign.status)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const { rows: liveSubmissions } = useRealtimeTable<{ id: string }>(
    'submissions',
    `campaign_id=eq.${campaign.id}`
  )
  const newSubmissionsCount = liveSubmissions.length

  const totalStores = campaignStores.length
  const compliantCount = campaignStores.filter(cs => cs.status === 'compliant').length
  const compliancePct = totalStores > 0 ? Math.round((compliantCount / totalStores) * 100) : 0
  // Store selection helpers
  const allStoreIds = campaignStores.map(cs => cs.store_id)
  const allStoresSelected = allStoreIds.length > 0 && allStoreIds.every(id => selectedStoreIds.has(id))
  const someStoresSelected = allStoreIds.some(id => selectedStoreIds.has(id))
  const selectedStoreCount = allStoreIds.filter(id => selectedStoreIds.has(id)).length
  const hasStoreSelection = selectedStoreCount > 0

  function toggleSelectAllStores() {
    if (allStoresSelected) {
      setSelectedStoreIds(new Set())
    } else {
      setSelectedStoreIds(new Set(allStoreIds))
    }
  }

  function toggleStoreRow(storeId: string) {
    setSelectedStoreIds(prev => {
      const next = new Set(prev)
      if (next.has(storeId)) next.delete(storeId)
      else next.add(storeId)
      return next
    })
  }

  function clearStoreSelection() {
    setSelectedStoreIds(new Set())
    setStoreBulkResult(null)
  }

  // Tab change clears selection
  useEffect(() => {
    clearStoreSelection()
  }, [activeTab])

  // Escape clears store selection when in stores tab
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showReassign) { setShowReassign(false); return }
      if (showRemoveConfirm) { setShowRemoveConfirm(false); return }
      clearStoreSelection()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'a' && activeTab === 'stores') {
      const active = document.activeElement
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')
      if (!isInput) {
        e.preventDefault()
        setSelectedStoreIds(new Set(allStoreIds))
      }
    }
  }, [activeTab, allStoreIds, showReassign, showRemoveConfirm])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  async function runStoreBulkAction(action: 'reassign' | 'mark_complete' | 'remove', extra?: { collectorId?: string }) {
    const storeIds = allStoreIds.filter(id => selectedStoreIds.has(id))
    if (storeIds.length === 0) return
    setStoreBulkLoading(true)
    setStoreBulkResult(null)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/stores/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeIds, action, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) {
        setStoreBulkResult(`Error: ${json.error ?? 'Unknown error'}`)
      } else {
        setStoreBulkResult(
          action === 'remove'
            ? `Removed ${json.removed ?? 0} store${json.removed !== 1 ? 's' : ''}`
            : `Updated ${json.updated ?? 0} task${json.updated !== 1 ? 's' : ''}`
        )
        clearStoreSelection()
        router.refresh()
      }
    } catch {
      setStoreBulkResult('Network error — please try again')
    } finally {
      setStoreBulkLoading(false)
    }
  }

  async function handleReassignSubmit() {
    if (!collectorId.trim()) return
    setReassigning(true)
    await runStoreBulkAction('reassign', { collectorId: collectorId.trim() })
    setReassigning(false)
    setShowReassign(false)
    setCollectorId('')
  }

  async function handleActivate() {
    setActivating(true)
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', campaign.id)
    if (!error) setStatus('active')
    setActivating(false)
  }

  async function handleSaveSettings() {
    setSaving(true)
    setSaveResult(null)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settingsName,
          brief: settingsBrief,
          payout_amount: settingsPayout !== '' ? parseFloat(settingsPayout) : null,
          status: settingsStatus,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSaveResult({ ok: false, msg: json.error ?? 'Failed to save changes' })
      } else {
        setStatus(json.campaign.status)
        setSaveResult({ ok: true, msg: 'Changes saved successfully' })
        router.refresh()
      }
    } catch {
      setSaveResult({ ok: false, msg: 'Network error — please try again' })
    } finally {
      setSaving(false)
    }
  }

  function handleExportCSV() {
    setExporting(true)
    const a = document.createElement('a')
    a.href = `/api/reports/${campaign.id}/export`
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => setExporting(false), 2000)
  }

  async function handleDuplicate() {
    setDuplicating(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/duplicate`, { method: 'POST' })
      const json = await res.json()
      if (res.ok && json.id) router.push(`/campaigns/${json.id}`)
    } finally {
      setDuplicating(false)
    }
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) return
    setSavingTemplate(true)
    try {
      await fetch('/api/campaigns/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          brief: campaign.brief,
          price_per_task_cents: campaign.payout_amount ? Math.round(campaign.payout_amount * 100) : null,
          category: templateCategory.trim() || null,
        }),
      })
      setTemplateSaved(true)
      setTimeout(() => {
        setShowSaveTemplate(false)
        setTemplateSaved(false)
        setMoreOpen(false)
      }, 1500)
    } finally {
      setSavingTemplate(false)
    }
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'stores', label: 'Stores', icon: Store },
    { key: 'submissions', label: 'Submissions', icon: BarChart3 },
    { key: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-white tracking-tight">{campaign.name}</h1>
            <Badge status={status} size="md" />
          </div>
          <div className="flex items-center gap-4 text-sm text-[#b0b0d0]">
            <span>{campaign.product_name}</span>
            {campaign.product_sku && (
              <>
                <span className="text-[#222240]">·</span>
                <span className="font-mono text-xs bg-[#222240] px-2 py-0.5 rounded-lg">{campaign.product_sku}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {campaignStores.length > 0 && (
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white hover:border-[#7c6df5]/50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Download size={15} />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          )}
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white hover:border-[#7c6df5]/50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Copy size={15} />
            {duplicating ? 'Duplicating…' : 'Duplicate'}
          </button>
          {/* More menu */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen(v => !v)}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white hover:border-[#7c6df5]/50 transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-12 z-20 bg-[#0c0c18] border border-[#222240] rounded-xl shadow-2xl w-48 overflow-hidden">
                <button
                  onClick={() => { setShowSaveTemplate(true); setMoreOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#b0b0d0] hover:text-white hover:bg-white/5 transition-colors"
                >
                  <LayoutTemplate size={14} />
                  Save as Template
                </button>
              </div>
            )}
          </div>
          {status === 'draft' && (
            <button
              onClick={handleActivate}
              disabled={activating}
              className="flex items-center gap-2 bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
            >
              <Zap size={15} />
              {activating ? 'Activating…' : 'Activate Campaign'}
            </button>
          )}
          <button
            onClick={() => router.back()}
            className="px-4 py-2.5 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white hover:border-[#7c6df5]/50 transition-colors text-sm font-medium"
          >
            ← Back
          </button>
        </div>

        {/* Save as Template modal */}
        {showSaveTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSaveTemplate(false)} />
            <div className="relative bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-white text-lg">Save as Template</h2>
                <button onClick={() => setShowSaveTemplate(false)} className="text-[#b0b0d0] hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Template Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm placeholder-[#b0b0d0]/50 focus:outline-none focus:border-[#7c6df5]/60 transition-colors"
                    placeholder="e.g. Standard Shelf Audit"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Category <span className="opacity-50 normal-case font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={templateCategory}
                    onChange={e => setTemplateCategory(e.target.value)}
                    className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm placeholder-[#b0b0d0]/50 focus:outline-none focus:border-[#7c6df5]/60 transition-colors"
                    placeholder="e.g. shelf-audit, price-check"
                  />
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setShowSaveTemplate(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate || !templateName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {templateSaved ? 'Saved!' : savingTemplate ? 'Saving…' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total Stores', value: totalStores.toString(), icon: Store, color: '#7c6df5' },
          { label: 'Compliant', value: compliantCount.toString(), icon: CheckCircle, color: '#00e096' },
          { label: 'Compliance Rate', value: `${compliancePct}%`, icon: BarChart3, color: '#00d4d4' },
          { label: 'Avg Delivery', value: `${campaign.sla_minutes} min SLA`, icon: Clock, color: '#ffc947' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-5 flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}30` }}
            >
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-[#b0b0d0]">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#0c0c18] border border-[#222240] rounded-xl p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-[#7c6df5]/15 text-white border border-[#7c6df5]/30'
                : 'text-[#b0b0d0] hover:text-white'
            }`}
          >
            <Icon size={15} />
            {label}
            {key === 'submissions' && newSubmissionsCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 18,
                  height: 18,
                  borderRadius: 999,
                  background: '#7c6df530',
                  border: '1px solid #7c6df560',
                  color: '#a89cf7',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '0 5px',
                }}
              >
                +{newSubmissionsCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Stores */}
      {activeTab === 'stores' && (
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
          {campaignStores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#7c6df5]/10 border border-[#7c6df5]/20 flex items-center justify-center mb-4">
                <Upload size={24} className="text-[#7c6df5]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No stores added yet</h3>
              <p className="text-[#b0b0d0] text-sm max-w-xs mb-6">
                Upload a CSV file with your store list to get started. Required columns: name, address, city, postcode, retailer.
              </p>
              <StoreUpload campaignId={campaign.id} organizationId={campaign.organization_id} onSuccess={() => router.refresh()} />
            </div>
          ) : (
            <>
              {/* Selection count badge */}
              {hasStoreSelection && (
                <div className="px-6 py-2.5 border-b border-[#222240] flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#7c6df5]/20 border border-[#7c6df5]/40 text-[#a89cf7]">
                    {selectedStoreCount} selected
                    <button onClick={clearStoreSelection} className="hover:text-white transition-colors ml-0.5">
                      <X size={11} />
                    </button>
                  </span>
                </div>
              )}

              {/* Table header */}
              <div className="grid grid-cols-[36px_2fr_1fr_1fr_110px_80px] gap-4 px-6 py-3 border-b border-[#222240] text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider items-center">
                <div className="flex items-center">
                  <Checkbox
                    checked={allStoresSelected}
                    indeterminate={someStoresSelected && !allStoresSelected}
                    onChange={toggleSelectAllStores}
                    size="sm"
                  />
                </div>
                <span>Store</span>
                <span>City</span>
                <span>Retailer</span>
                <span>Status</span>
                <span className="text-right">Score</span>
              </div>
              <div className="divide-y divide-[#222240]">
                {campaignStores.map((cs) => {
                  const isSelected = selectedStoreIds.has(cs.store_id)
                  return (
                    <div
                      key={cs.id}
                      className={`grid grid-cols-[36px_2fr_1fr_1fr_110px_80px] gap-4 px-6 py-4 items-center transition-colors ${
                        isSelected
                          ? 'bg-[#7c6df5]/[0.06] hover:bg-[#7c6df5]/[0.09]'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleStoreRow(cs.store_id)}
                          size="sm"
                        />
                      </div>
                      <div className="font-medium text-white truncate">
                        {cs.stores ? (
                          <Link
                            href={`/stores/${cs.store_id}`}
                            className="hover:text-[#a89cf7] transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            {cs.stores.name}
                          </Link>
                        ) : '—'}
                      </div>
                      <div className="text-sm text-[#b0b0d0]">{cs.stores?.city ?? '—'}</div>
                      <div className="text-sm text-[#b0b0d0]">{cs.stores?.retailer ?? '—'}</div>
                      <div>
                        <Badge status={cs.status} size="sm" />
                      </div>
                      <div className="text-right">
                        {cs.compliance_score !== null ? (
                          <span
                            className="font-bold text-sm"
                            style={{
                              color:
                                cs.compliance_score >= 80
                                  ? '#00e096'
                                  : cs.compliance_score >= 60
                                  ? '#ffc947'
                                  : '#ff6b9d',
                            }}
                          >
                            {Math.round(cs.compliance_score)}%
                          </span>
                        ) : (
                          <span className="text-[#b0b0d0] text-sm">—</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Upload more */}
              <div className="px-6 py-4 border-t border-[#222240] flex items-center justify-between">
                <span className="text-sm text-[#b0b0d0]">{totalStores} store{totalStores !== 1 ? 's' : ''}</span>
                <StoreUpload campaignId={campaign.id} organizationId={campaign.organization_id} onSuccess={() => router.refresh()} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Submissions */}
      {activeTab === 'submissions' && (
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 size={32} className="text-[#b0b0d0] opacity-30 mb-3" />
          <p className="text-[#b0b0d0] text-sm">Submissions will appear here once collectors start capturing data.</p>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white text-lg">Campaign Settings</h2>
            <div className="grid grid-cols-2 gap-3 text-xs text-[#b0b0d0]">
              <span className="bg-[#030305] border border-[#222240] rounded-lg px-3 py-1.5">
                ID: <span className="font-mono text-white">{campaign.id.slice(0, 8)}…</span>
              </span>
              <span className="bg-[#030305] border border-[#222240] rounded-lg px-3 py-1.5">
                Created: <span className="text-white">{new Date(campaign.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Campaign Name</label>
              <input
                type="text"
                value={settingsName}
                onChange={e => setSettingsName(e.target.value)}
                className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm placeholder-[#b0b0d0]/50 focus:outline-none focus:border-[#7c6df5]/60 transition-colors"
                placeholder="Campaign name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Brief / Compliance Criteria</label>
              <textarea
                value={settingsBrief}
                onChange={e => setSettingsBrief(e.target.value)}
                rows={4}
                className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm placeholder-[#b0b0d0]/50 focus:outline-none focus:border-[#7c6df5]/60 transition-colors resize-none"
                placeholder="Describe the compliance criteria for this campaign…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Payout per Task (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settingsPayout}
                  onChange={e => setSettingsPayout(e.target.value)}
                  className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm placeholder-[#b0b0d0]/50 focus:outline-none focus:border-[#7c6df5]/60 transition-colors"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Status</label>
                <select
                  value={settingsStatus}
                  onChange={e => setSettingsStatus(e.target.value)}
                  className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7c6df5]/60 transition-colors appearance-none cursor-pointer"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#222240]">
            {saveResult ? (
              <span className="text-sm font-medium" style={{ color: saveResult.ok ? '#00e096' : '#ff6b9d' }}>
                {saveResult.msg}
              </span>
            ) : <span />}
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Store bulk action bar */}
      <div
        className="fixed bottom-6 left-1/2 z-50 transition-all duration-300"
        style={{
          transform: hasStoreSelection
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(120%)',
          pointerEvents: hasStoreSelection ? 'auto' : 'none',
          opacity: hasStoreSelection ? 1 : 0,
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
            {selectedStoreCount} store{selectedStoreCount !== 1 ? 's' : ''}
          </span>

          <div className="w-px h-5 bg-[#333360]" />

          {/* Reassign */}
          <button
            onClick={() => setShowReassign(true)}
            disabled={storeBulkLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#7c6df5]/10 border border-[#7c6df5]/30 text-[#a89cf7] hover:bg-[#7c6df5]/20 transition-colors disabled:opacity-50"
          >
            <UserCheck size={13} />
            Reassign tasks
          </button>

          {/* Mark all complete */}
          <button
            onClick={() => runStoreBulkAction('mark_complete')}
            disabled={storeBulkLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#00e096]/10 border border-[#00e096]/30 text-[#00e096] hover:bg-[#00e096]/20 transition-colors disabled:opacity-50"
          >
            <CheckCheck size={13} />
            Mark all complete
          </button>

          {/* Remove from campaign */}
          <button
            onClick={() => setShowRemoveConfirm(true)}
            disabled={storeBulkLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-[#ff6b9d]/10 border border-[#ff6b9d]/30 text-[#ff6b9d] hover:bg-[#ff6b9d]/20 transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} />
            Remove from campaign
          </button>

          <div className="w-px h-5 bg-[#333360]" />

          {storeBulkResult && (
            <span className="text-xs font-medium text-[#00e096]">{storeBulkResult}</span>
          )}

          <button
            onClick={clearStoreSelection}
            className="flex items-center gap-1 text-[#b0b0d0] hover:text-white transition-colors text-sm font-medium"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      </div>

      {/* Reassign modal */}
      {showReassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReassign(false)} />
          <div className="relative bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">Reassign Tasks</h2>
              <button onClick={() => setShowReassign(false)} className="text-[#b0b0d0] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-[#b0b0d0] mb-4">
              All open tasks in the selected {selectedStoreCount} store{selectedStoreCount !== 1 ? 's' : ''} will be assigned to this collector.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Collector ID</label>
              <input
                type="text"
                value={collectorId}
                onChange={e => setCollectorId(e.target.value)}
                className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm placeholder-[#b0b0d0]/50 focus:outline-none focus:border-[#7c6df5]/60 transition-colors"
                placeholder="Enter collector UUID"
                autoFocus
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowReassign(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignSubmit}
                disabled={reassigning || !collectorId.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {reassigning ? 'Reassigning…' : 'Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove confirmation modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRemoveConfirm(false)} />
          <div className="relative bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white text-lg">Remove Stores</h2>
              <button onClick={() => setShowRemoveConfirm(false)} className="text-[#b0b0d0] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-[#b0b0d0] mb-6">
              Remove {selectedStoreCount} store{selectedStoreCount !== 1 ? 's' : ''} from this campaign? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowRemoveConfirm(false)
                  await runStoreBulkAction('remove')
                }}
                disabled={storeBulkLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#ff6b9d] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
