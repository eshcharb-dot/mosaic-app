'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store, CheckCircle, Clock, BarChart3, Zap, Settings, Upload, Download, Copy, MoreHorizontal, LayoutTemplate, X, UserCheck, CheckCheck, Trash2, Plus, AlertTriangle, Shield, ShieldAlert, TrendingUp, Route } from 'lucide-react'
import ROICalculator from './ROICalculator'
import Badge from '@/components/ui/Badge'
import Checkbox from '@/components/ui/Checkbox'
import StoreUpload from './StoreUpload'

// ─── Compliance Rules Types ───────────────────────────────────────────────────

type RuleType = 'must_have' | 'must_not_have' | 'count_check' | 'position_check' | 'label_check'

interface ComplianceRule {
  id: string
  campaign_id: string
  rule_type: RuleType
  description: string
  weight: number
  is_blocking: boolean
  created_at: string
}

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  must_have: 'Must Have',
  must_not_have: 'Must Not Have',
  count_check: 'Count Check',
  position_check: 'Position Check',
  label_check: 'Label Check',
}

const RULE_TYPE_COLORS: Record<RuleType, { bg: string; border: string; text: string }> = {
  must_have:     { bg: '#00e09615', border: '#00e09640', text: '#00e096' },
  must_not_have: { bg: '#ff6b9d15', border: '#ff6b9d40', text: '#ff6b9d' },
  count_check:   { bg: '#ffc94715', border: '#ffc94740', text: '#ffc947' },
  position_check:{ bg: '#00d4d415', border: '#00d4d440', text: '#00d4d4' },
  label_check:   { bg: '#7c6df515', border: '#7c6df540', text: '#a89cf7' },
}

const RULE_TYPE_PLACEHOLDERS: Record<RuleType, string> = {
  must_have:     'e.g. Product X must be on shelf',
  must_not_have: 'e.g. No competitor products in display',
  count_check:   'e.g. At least 4 units visible',
  position_check:'e.g. Product at eye level (shelves 2-4)',
  label_check:   'e.g. Price label visible and correct',
}

const RULE_PRESETS: Record<string, Array<{ rule_type: RuleType; description: string; weight: number; is_blocking?: boolean }>> = {
  'FMCG Standard': [
    { rule_type: 'must_have',      description: 'All product variants present on shelf', weight: 25 },
    { rule_type: 'count_check',    description: 'Minimum 3 facings per SKU', weight: 20 },
    { rule_type: 'label_check',    description: 'Price label visible and correct', weight: 20 },
    { rule_type: 'position_check', description: 'Product at eye level (shelves 2-4)', weight: 20 },
    { rule_type: 'must_not_have',  description: 'No out-of-stock gaps in display', weight: 15 },
  ],
  'Promotional Display': [
    { rule_type: 'must_have',      description: 'Promotional POS material visible', weight: 30, is_blocking: true },
    { rule_type: 'position_check', description: 'Display placed at store entrance or end-cap', weight: 30 },
    { rule_type: 'count_check',    description: 'Minimum 6 promotional units stocked', weight: 25 },
    { rule_type: 'label_check',    description: 'Promotional price clearly marked', weight: 15 },
  ],
  'Cold Chain': [
    { rule_type: 'must_have',      description: 'Product stored in refrigerated unit (0-4°C)', weight: 40, is_blocking: true },
    { rule_type: 'must_not_have',  description: 'No products placed outside refrigeration', weight: 35, is_blocking: true },
    { rule_type: 'label_check',    description: 'Best-before date visible and within range', weight: 25 },
  ],
}

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

type Tab = 'stores' | 'submissions' | 'roi' | 'settings' | 'journey'

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) {
    return (
      <span className="text-xs text-[#b0b0d0] italic">—</span>
    )
  }
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1
  const w = 80
  const h = 28
  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * w
    const y = h - ((s - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  const last = scores[scores.length - 1]
  const first = scores[0]
  const color = last >= first ? '#00e096' : '#ff6b9d'
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Compliance Journey Tab ───────────────────────────────────────────────────

function ComplianceJourneyTab({ campaignStores }: { campaignStores: CampaignStore[] }) {
  const storesWithScore = campaignStores.filter(cs => cs.compliance_score != null)
  const storesWithoutScore = campaignStores.filter(cs => cs.compliance_score == null)

  // For this tab we treat compliance_score as the single data point per store.
  // "score progression" is simulated as [first=60, last=compliance_score] since
  // we only have one score per campaign_store here. Real sparklines would need
  // per-store submission history fetched separately.
  const storeJourneys = storesWithScore.map(cs => ({
    id: cs.store_id,
    name: cs.stores?.name ?? 'Unknown store',
    city: cs.stores?.city ?? '',
    score: cs.compliance_score as number,
  }))

  const sorted = [...storeJourneys].sort((a, b) => b.score - a.score)
  const best = sorted[0] ?? null
  const worst = sorted[sorted.length - 1] ?? null

  const improved = storesWithScore.filter(cs => (cs.compliance_score ?? 0) >= 70).length
  const total = campaignStores.length
  const avg = storesWithScore.length > 0
    ? Math.round(storesWithScore.reduce((sum, cs) => sum + (cs.compliance_score ?? 0), 0) / storesWithScore.length)
    : null

  const narrative =
    total === 0
      ? 'No stores have been audited yet for this campaign.'
      : `Since campaign launch, ${improved} of ${total} store${total !== 1 ? 's' : ''} ${improved === 1 ? 'has' : 'have'} achieved a compliance score of 70 or above.${avg != null ? ` Campaign average: ${avg} points.` : ''}`

  return (
    <div className="space-y-6">
      {/* Narrative */}
      <div className="bg-[#0c0c18] border border-[#7c6df5]/25 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Route size={16} className="text-[#7c6df5]" />
          <span className="text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Compliance Journey</span>
        </div>
        <p className="text-white text-base leading-relaxed">{narrative}</p>
      </div>

      {/* Best / Worst highlight */}
      {(best || worst) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {best && (
            <div className="bg-[#0c0c18] border border-[#00e09630] rounded-2xl p-5">
              <div className="text-xs font-semibold text-[#00e096] uppercase tracking-wider mb-2">Best Compliance</div>
              <div className="text-white font-bold text-lg truncate">{best.name}</div>
              {best.city && <div className="text-[#b0b0d0] text-xs">{best.city}</div>}
              <div className="text-4xl font-black mt-3" style={{ color: '#00e096' }}>{Math.round(best.score)}</div>
            </div>
          )}
          {worst && worst.id !== best?.id && (
            <div className="bg-[#0c0c18] border border-[#ff6b9d30] rounded-2xl p-5">
              <div className="text-xs font-semibold text-[#ff6b9d] uppercase tracking-wider mb-2">Needs Attention</div>
              <div className="text-white font-bold text-lg truncate">{worst.name}</div>
              {worst.city && <div className="text-[#b0b0d0] text-xs">{worst.city}</div>}
              <div className="text-4xl font-black mt-3" style={{ color: '#ff6b9d' }}>{Math.round(worst.score)}</div>
            </div>
          )}
        </div>
      )}

      {/* Store score table with sparklines */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#222240]">
          <h2 className="font-bold text-white text-sm">Store Compliance Scores</h2>
        </div>
        {storeJourneys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-[#b0b0d0] text-sm">No scored stores yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#222240]">
            {sorted.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm truncate">{s.name}</div>
                  {s.city && <div className="text-[#b0b0d0] text-xs">{s.city}</div>}
                </div>
                {/* Sparkline — single point shown as flat line */}
                <Sparkline scores={[s.score, s.score]} />
                <div
                  className="text-xl font-black w-12 text-right"
                  style={{ color: s.score >= 80 ? '#00e096' : s.score >= 60 ? '#ffc947' : '#ff6b9d' }}
                >
                  {Math.round(s.score)}
                </div>
              </div>
            ))}
          </div>
        )}
        {storesWithoutScore.length > 0 && (
          <div className="px-6 py-3 border-t border-[#222240] text-xs text-[#b0b0d0]">
            {storesWithoutScore.length} store{storesWithoutScore.length !== 1 ? 's' : ''} not yet scored
          </div>
        )}
      </div>
    </div>
  )
}

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

  // SLA config state
  const slaRef = useRef<HTMLDivElement>(null)
  const [slaConfig, setSlaConfig] = useState<{
    min_compliance_score: number
    audit_frequency_days: number
    response_time_hours: number
    target_compliant_pct: number
  } | null>(null)
  const [slaStatus, setSlaStatus] = useState<{
    sla: Record<string, unknown>
    overdue_stores: number
    current_compliant_pct: number | null
    total_stores: number
    open_breaches: number
    is_meeting_sla: boolean | null
  } | null>(null)
  const [slaLoading, setSlaLoading] = useState(false)
  const [slaSaving, setSlaSaving] = useState(false)
  const [slaSaveResult, setSlaSaveResult] = useState<{ ok: boolean; msg: string } | null>(null)
  // Local SLA form values
  const [slaMinScore, setSlaMinScore] = useState(70)
  const [slaAuditDays, setSlaAuditDays] = useState(30)
  const [slaResponseHours, setSlaResponseHours] = useState(24)
  const [slaTargetPct, setSlaTargetPct] = useState(90)

  // Compliance rules state
  const [rules, setRules] = useState<ComplianceRule[]>([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [newRuleType, setNewRuleType] = useState<RuleType>('must_have')
  const [newRuleDesc, setNewRuleDesc] = useState('')
  const [newRuleWeight, setNewRuleWeight] = useState(20)
  const [newRuleBlocking, setNewRuleBlocking] = useState(false)
  const [addingRule, setAddingRule] = useState(false)
  const [addRuleError, setAddRuleError] = useState<string | null>(null)
  const [selectedPreset, setSelectedPreset] = useState('')

  const router = useRouter()
  const supabase = createClient()

  async function fetchRules() {
    setRulesLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/rules`)
      if (res.ok) {
        const json = await res.json()
        setRules(json.rules ?? [])
      }
    } finally {
      setRulesLoading(false)
    }
  }

  async function fetchSlaConfig() {
    setSlaLoading(true)
    try {
      const [cfgRes, statusRes] = await Promise.all([
        fetch(`/api/campaigns/${campaign.id}/sla`),
        fetch(`/api/campaigns/${campaign.id}/sla/status`),
      ])
      if (cfgRes.ok) {
        const json = await cfgRes.json()
        if (json.sla) {
          setSlaConfig(json.sla)
          setSlaMinScore(json.sla.min_compliance_score ?? 70)
          setSlaAuditDays(json.sla.audit_frequency_days ?? 30)
          setSlaResponseHours(json.sla.response_time_hours ?? 24)
          setSlaTargetPct(json.sla.target_compliant_pct ?? 90)
        }
      }
      if (statusRes.ok) {
        const json = await statusRes.json()
        if (json.status) setSlaStatus(json.status)
      }
    } finally {
      setSlaLoading(false)
    }
  }

  async function handleSaveSla() {
    setSlaSaving(true)
    setSlaSaveResult(null)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/sla`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_compliance_score: slaMinScore,
          audit_frequency_days: slaAuditDays,
          response_time_hours: slaResponseHours,
          target_compliant_pct: slaTargetPct,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSlaSaveResult({ ok: false, msg: json.error ?? 'Failed to save SLA' })
      } else {
        setSlaConfig(json.sla)
        setSlaSaveResult({ ok: true, msg: 'SLA configuration saved' })
        // Refresh status
        const statusRes = await fetch(`/api/campaigns/${campaign.id}/sla/status`)
        if (statusRes.ok) {
          const statusJson = await statusRes.json()
          if (statusJson.status) setSlaStatus(statusJson.status)
        }
      }
    } catch {
      setSlaSaveResult({ ok: false, msg: 'Network error — please try again' })
    } finally {
      setSlaSaving(false)
    }
  }

  async function handleAddRule() {
    if (!newRuleDesc.trim()) { setAddRuleError('Description is required'); return }
    setAddingRule(true)
    setAddRuleError(null)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_type: newRuleType,
          description: newRuleDesc.trim(),
          weight: newRuleWeight,
          is_blocking: newRuleBlocking,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAddRuleError(json.error ?? 'Failed to add rule')
      } else {
        setRules(prev => [...prev, json.rule])
        setNewRuleDesc('')
        setNewRuleWeight(20)
        setNewRuleBlocking(false)
        setSelectedPreset('')
      }
    } catch {
      setAddRuleError('Network error')
    } finally {
      setAddingRule(false)
    }
  }

  async function handleDeleteRule(ruleId: string) {
    const res = await fetch(`/api/campaigns/${campaign.id}/rules/${ruleId}`, { method: 'DELETE' })
    if (res.ok) setRules(prev => prev.filter(r => r.id !== ruleId))
  }

  async function handleToggleBlocking(rule: ComplianceRule) {
    const res = await fetch(`/api/campaigns/${campaign.id}/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_blocking: !rule.is_blocking }),
    })
    if (res.ok) {
      const json = await res.json()
      setRules(prev => prev.map(r => r.id === rule.id ? json.rule : r))
    }
  }

  function applyPreset(presetName: string) {
    const presets = RULE_PRESETS[presetName]
    if (!presets || presets.length === 0) return
    const first = presets[0]
    setNewRuleType(first.rule_type)
    setNewRuleDesc(first.description)
    setNewRuleWeight(first.weight)
    setNewRuleBlocking(first.is_blocking ?? false)
    setSelectedPreset(presetName)
  }

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

  // Tab change clears selection; fetch rules + SLA when settings tab opens
  useEffect(() => {
    clearStoreSelection()
    if (activeTab === 'settings') {
      fetchRules()
      fetchSlaConfig()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Also fetch SLA status on mount for the header badge
  useEffect(() => {
    fetch(`/api/campaigns/${campaign.id}/sla/status`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.status) setSlaStatus(json.status) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    { key: 'roi', label: 'ROI', icon: TrendingUp },
    { key: 'journey', label: 'Journey', icon: Route },
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

      {/* SLA status badge */}
      {slaStatus && (
        <div className="mb-5">
          {(() => {
            const pct = slaStatus.current_compliant_pct ?? 0
            const target = (slaStatus.sla as any)?.target_compliant_pct ?? 90
            const overdue = slaStatus.overdue_stores ?? 0
            const isMet = slaStatus.is_meeting_sla === true
            const isAtRisk = !isMet && pct >= target - 5
            const isBreached = !isMet && pct < target - 5

            const color = isMet ? '#00e096' : isAtRisk ? '#ffc947' : '#ff4d6d'
            const label = isMet ? 'SLA: MET \u2713' : isAtRisk ? 'SLA: AT RISK \u26a0' : 'SLA: BREACHED \u2717'

            return (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    setActiveTab('settings')
                    setTimeout(() => slaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-colors hover:opacity-80"
                  style={{ background: `${color}12`, border: `1px solid ${color}40`, color }}
                >
                  {label}
                </button>
                {overdue > 0 && (
                  <span className="text-xs text-[#ffc947] font-semibold">
                    {overdue} store{overdue !== 1 ? 's' : ''} overdue for audit
                  </span>
                )}
                {slaStatus.open_breaches > 0 && (
                  <span className="text-xs text-[#ff4d6d] font-semibold">
                    {slaStatus.open_breaches} open breach{slaStatus.open_breaches !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>
            )
          })()}
        </div>
      )}

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

      {/* Tab: ROI */}
      {activeTab === 'roi' && (
        <ROICalculator
          storeCount={campaignStores.length}
          avgScore={campaign.compliance_score}
        />
      )}

      {/* Tab: Journey */}
      {activeTab === 'journey' && (
        <ComplianceJourneyTab campaignStores={campaignStores} />
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Campaign Settings card */}
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
                <label htmlFor="settings-name" className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Campaign Name</label>
                <input
                  id="settings-name"
                  type="text"
                  value={settingsName}
                  onChange={e => setSettingsName(e.target.value)}
                  aria-required="true"
                  aria-describedby={saveResult && !saveResult.ok ? 'settings-save-error' : undefined}
                  className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm placeholder-[#b0b0d0]/50 focus:outline-none focus:border-[#7c6df5]/60 transition-colors"
                  placeholder="Campaign name"
                />
              </div>
              <div>
                <label htmlFor="settings-brief" className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Brief / Compliance Criteria</label>
                <textarea
                  id="settings-brief"
                  value={settingsBrief}
                  onChange={e => setSettingsBrief(e.target.value)}
                  rows={4}
                  className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm placeholder-[#b0b0d0]/50 focus:outline-none focus:border-[#7c6df5]/60 transition-colors resize-none"
                  placeholder="Describe the compliance criteria for this campaign…"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-payout" className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Payout per Task (£)</label>
                  <input
                    id="settings-payout"
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
                  <label htmlFor="settings-status" className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Status</label>
                  <select
                    id="settings-status"
                    value={settingsStatus}
                    onChange={e => setSettingsStatus(e.target.value)}
                    aria-required="true"
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
                <span
                  id={saveResult.ok ? 'settings-save-success' : 'settings-save-error'}
                  role="status"
                  aria-live="polite"
                  className="text-sm font-medium"
                  style={{ color: saveResult.ok ? '#00e096' : '#ff6b9d' }}
                >
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

          {/* Compliance Rules card */}
          <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#7c6df5]/15 border border-[#7c6df5]/30 flex items-center justify-center">
                  <Shield size={15} className="text-[#a89cf7]" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg">Compliance Rules</h2>
                  <p className="text-xs text-[#b0b0d0]">Rules enforced by the AI scorer on every submission</p>
                </div>
              </div>
              {rules.length > 0 && (
                <div className="text-xs text-[#b0b0d0]">
                  {rules.length} rule{rules.length !== 1 ? 's' : ''}
                  {' · '}
                  <span style={{ color: rules.reduce((s, r) => s + r.weight, 0) > 100 ? '#ff6b9d' : '#00e096' }}>
                    {rules.reduce((s, r) => s + r.weight, 0)}% total weight
                  </span>
                </div>
              )}
            </div>

            {/* Weight sum warning */}
            {rules.reduce((s, r) => s + r.weight, 0) > 100 && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#ff6b9d]/10 border border-[#ff6b9d]/30">
                <AlertTriangle size={14} className="text-[#ff6b9d] flex-shrink-0" />
                <span className="text-sm text-[#ff6b9d]">Rule weights sum to {rules.reduce((s, r) => s + r.weight, 0)}% — values above 100% may distort scoring. Consider rebalancing.</span>
              </div>
            )}

            {/* Weight donut visualiser */}
            {rules.length > 0 && (() => {
              const total = rules.reduce((s, r) => s + r.weight, 0)
              const capped = Math.min(total, 100)
              const r = 28
              const circ = 2 * Math.PI * r
              const colors = ['#7c6df5', '#00d4d4', '#00e096', '#ffc947', '#ff6b9d']
              let offset = 0
              return (
                <div className="flex items-center gap-5 py-3 px-4 bg-[#030305] border border-[#222240] rounded-xl">
                  <svg width={72} height={72} viewBox="0 0 72 72">
                    <circle cx={36} cy={36} r={r} fill="none" stroke="#222240" strokeWidth={8} />
                    {rules.map((rule, i) => {
                      const pct = Math.min(rule.weight, 100) / Math.max(total, 1)
                      const dash = pct * capped / 100 * circ
                      const gap = circ - dash
                      const el = (
                        <circle
                          key={rule.id}
                          cx={36} cy={36} r={r}
                          fill="none"
                          stroke={colors[i % colors.length]}
                          strokeWidth={8}
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={-offset}
                          strokeLinecap="round"
                          style={{ transform: 'rotate(-90deg)', transformOrigin: '36px 36px' }}
                        />
                      )
                      offset += dash
                      return el
                    })}
                    <text x={36} y={40} textAnchor="middle" fontSize={13} fontWeight={800} fill="white">{Math.min(total, 100)}%</text>
                  </svg>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                    {rules.map((rule, i) => (
                      <div key={rule.id} className="flex items-center gap-1.5 text-xs text-[#b0b0d0]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                        <span className="truncate max-w-[140px]">{rule.description}</span>
                        <span className="font-bold text-white">{rule.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Rules table */}
            {rulesLoading ? (
              <div className="text-sm text-[#b0b0d0] py-4 text-center">Loading rules…</div>
            ) : rules.length > 0 ? (
              <div className="border border-[#222240] rounded-xl overflow-hidden">
                <div className="grid grid-cols-[1fr_2.5fr_80px_90px_44px] gap-4 px-5 py-2.5 border-b border-[#222240] text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">
                  <span>Type</span>
                  <span>Description</span>
                  <span className="text-center">Weight</span>
                  <span className="text-center">Blocking</span>
                  <span />
                </div>
                <div className="divide-y divide-[#222240]">
                  {rules.map(rule => {
                    const colors = RULE_TYPE_COLORS[rule.rule_type]
                    return (
                      <div key={rule.id} className="grid grid-cols-[1fr_2.5fr_80px_90px_44px] gap-4 px-5 py-3.5 items-center hover:bg-white/[0.015] transition-colors">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold w-fit"
                          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
                        >
                          {RULE_TYPE_LABELS[rule.rule_type]}
                        </span>
                        <span className="text-sm text-white truncate">{rule.description}</span>
                        <span className="text-center text-sm font-bold text-white">{rule.weight}%</span>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleToggleBlocking(rule)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              rule.is_blocking
                                ? 'bg-[#ff6b9d]/15 border border-[#ff6b9d]/40 text-[#ff6b9d]'
                                : 'bg-[#222240] border border-[#333360] text-[#b0b0d0] hover:text-white'
                            }`}
                            title={rule.is_blocking ? 'Blocking — click to disable' : 'Not blocking — click to enable'}
                          >
                            {rule.is_blocking ? <ShieldAlert size={11} /> : <Shield size={11} />}
                            {rule.is_blocking ? 'Blocking' : 'Off'}
                          </button>
                        </div>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg text-[#b0b0d0] hover:text-[#ff6b9d] hover:bg-[#ff6b9d]/10 transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#b0b0d0] py-6 text-center border border-dashed border-[#222240] rounded-xl">
                No rules yet — add your first rule below or load a preset.
              </div>
            )}

            {/* Add rule form */}
            <div className="border border-[#222240] rounded-xl p-5 space-y-4 bg-[#030305]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Add Rule</span>
                {/* Preset loader */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#b0b0d0]">Load preset:</span>
                  <select
                    value={selectedPreset}
                    onChange={e => { if (e.target.value) applyPreset(e.target.value) }}
                    className="bg-[#0c0c18] border border-[#222240] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#7c6df5]/60 transition-colors cursor-pointer"
                  >
                    <option value="">Choose preset…</option>
                    {Object.keys(RULE_PRESETS).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedPreset && (
                <div className="flex flex-wrap gap-2 p-3 bg-[#7c6df5]/10 border border-[#7c6df5]/20 rounded-xl">
                  <span className="text-xs font-semibold text-[#a89cf7] w-full mb-1">{selectedPreset} — click a rule to load it into the form:</span>
                  {RULE_PRESETS[selectedPreset].map((pr, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setNewRuleType(pr.rule_type)
                        setNewRuleDesc(pr.description)
                        setNewRuleWeight(pr.weight)
                        setNewRuleBlocking(pr.is_blocking ?? false)
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[#7c6df5]/30 text-[#a89cf7] hover:bg-[#7c6df5]/20 transition-colors"
                    >
                      {pr.description}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-[180px_1fr] gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Rule Type</label>
                  <select
                    value={newRuleType}
                    onChange={e => { setNewRuleType(e.target.value as RuleType); setNewRuleDesc('') }}
                    className="w-full bg-[#0c0c18] border border-[#222240] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#7c6df5]/60 transition-colors appearance-none cursor-pointer"
                  >
                    {(Object.keys(RULE_TYPE_LABELS) as RuleType[]).map(t => (
                      <option key={t} value={t}>{RULE_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Description</label>
                  <input
                    type="text"
                    value={newRuleDesc}
                    onChange={e => setNewRuleDesc(e.target.value)}
                    placeholder={RULE_TYPE_PLACEHOLDERS[newRuleType]}
                    className="w-full bg-[#0c0c18] border border-[#222240] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#b0b0d0]/40 focus:outline-none focus:border-[#7c6df5]/60 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Weight</label>
                    <span className="text-xs font-bold text-white">Worth {newRuleWeight}% of score</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={newRuleWeight}
                    onChange={e => setNewRuleWeight(Number(e.target.value))}
                    className="w-full accent-[#7c6df5]"
                  />
                  <div className="flex justify-between text-xs text-[#b0b0d0] mt-1">
                    <span>1%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Blocking</label>
                  <button
                    onClick={() => setNewRuleBlocking(v => !v)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                      newRuleBlocking
                        ? 'bg-[#ff6b9d]/15 border-[#ff6b9d]/40 text-[#ff6b9d]'
                        : 'bg-[#0c0c18] border-[#222240] text-[#b0b0d0] hover:text-white'
                    }`}
                  >
                    {newRuleBlocking ? <ShieldAlert size={14} /> : <Shield size={14} />}
                    {newRuleBlocking ? 'Blocking ON' : 'Blocking OFF'}
                  </button>
                  <p className="text-xs text-[#b0b0d0] mt-1.5 max-w-[160px]">
                    {newRuleBlocking ? 'Violation = non-compliant regardless of score' : 'Violation reduces score only'}
                  </p>
                </div>
              </div>

              {addRuleError && (
                <p className="text-xs text-[#ff6b9d]">{addRuleError}</p>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleAddRule}
                  disabled={addingRule || !newRuleDesc.trim()}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                >
                  <Plus size={15} />
                  {addingRule ? 'Adding…' : 'Add Rule'}
                </button>
              </div>
            </div>
          </div>

          {/* SLA Configuration card */}
          <div ref={slaRef} className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#ffc947]/15 border border-[#ffc947]/30 flex items-center justify-center">
                <Clock size={15} className="text-[#ffc947]" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">SLA Configuration</h2>
                <p className="text-xs text-[#b0b0d0]">Set compliance targets and audit cadence for this campaign</p>
              </div>
              {slaConfig && (
                <span className="ml-auto text-xs text-[#b0b0d0]">Last updated {new Date((slaConfig as any).updated_at ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              )}
            </div>

            {slaLoading ? (
              <div className="text-sm text-[#b0b0d0] py-4 text-center">Loading SLA config…</div>
            ) : (
              <div className="space-y-6">
                {/* Min compliance score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Min Compliance Score</label>
                    <span className="text-xs font-bold text-white">Fail below {slaMinScore}/100</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={slaMinScore}
                    onChange={e => setSlaMinScore(Number(e.target.value))}
                    className="w-full accent-[#ffc947]"
                  />
                  <div className="flex justify-between text-xs text-[#b0b0d0] mt-1">
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Target compliant % */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Target Compliant Stores</label>
                    <span className="text-xs font-bold text-white">{slaTargetPct}% of stores must be compliant</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={slaTargetPct}
                    onChange={e => setSlaTargetPct(Number(e.target.value))}
                    className="w-full accent-[#00d4d4]"
                  />
                  <div className="flex justify-between text-xs text-[#b0b0d0] mt-1">
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Audit frequency */}
                  <div>
                    <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Audit Frequency</label>
                    <select
                      value={slaAuditDays}
                      onChange={e => setSlaAuditDays(Number(e.target.value))}
                      className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7c6df5]/60 transition-colors appearance-none cursor-pointer"
                    >
                      <option value={7}>Every 7 days</option>
                      <option value={14}>Every 14 days</option>
                      <option value={30}>Every 30 days</option>
                      <option value={90}>Every 90 days</option>
                    </select>
                  </div>

                  {/* Response time */}
                  <div>
                    <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Response Time to Fix</label>
                    <select
                      value={slaResponseHours}
                      onChange={e => setSlaResponseHours(Number(e.target.value))}
                      className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#7c6df5]/60 transition-colors appearance-none cursor-pointer"
                    >
                      <option value={4}>4 hours</option>
                      <option value={24}>24 hours</option>
                      <option value={48}>48 hours</option>
                      <option value={72}>72 hours</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#222240]">
                  {slaSaveResult ? (
                    <span className="text-sm font-medium" style={{ color: slaSaveResult.ok ? '#00e096' : '#ff6b9d' }}>
                      {slaSaveResult.msg}
                    </span>
                  ) : <span />}
                  <button
                    onClick={handleSaveSla}
                    disabled={slaSaving}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#ffc947] to-[#ff9f43] text-[#030305] font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                  >
                    {slaSaving ? 'Saving…' : 'Save SLA'}
                  </button>
                </div>
              </div>
            )}
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
