'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { useRouter } from 'next/navigation'
import { Store, CheckCircle, Clock, BarChart3, Zap, Settings, Upload, Download } from 'lucide-react'
import Badge from '@/components/ui/Badge'
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

  // Settings form state
  const [settingsName, setSettingsName] = useState(campaign.name)
  const [settingsBrief, setSettingsBrief] = useState(campaign.brief ?? '')
  const [settingsPayout, setSettingsPayout] = useState(campaign.payout_amount?.toString() ?? '')
  const [settingsStatus, setSettingsStatus] = useState(campaign.status)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Realtime submissions for this campaign
  const { rows: liveSubmissions } = useRealtimeTable<{ id: string }>(
    'submissions',
    `campaign_id=eq.${campaign.id}`
  )
  // liveSubmissions only contains rows that arrived after mount; count them as new
  const newSubmissionsCount = liveSubmissions.length

  // Stats
  const totalStores = campaignStores.length
  const compliantCount = campaignStores.filter(cs => cs.status === 'compliant').length
  const compliancePct = totalStores > 0 ? Math.round((compliantCount / totalStores) * 100) : 0
  const avgScore = totalStores > 0
    ? Math.round(
        campaignStores.reduce((sum, cs) => sum + (cs.compliance_score ?? 0), 0) / totalStores
      )
    : 0

  async function handleActivate() {
    setActivating(true)
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', campaign.id)

    if (!error) {
      setStatus('active')
    }
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
            {/* Live submissions badge on the Submissions tab */}
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
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_110px_80px] gap-4 px-6 py-3 border-b border-[#222240] text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">
                <span>Store</span>
                <span>City</span>
                <span>Retailer</span>
                <span>Status</span>
                <span className="text-right">Score</span>
              </div>
              <div className="divide-y divide-[#222240]">
                {campaignStores.map((cs) => (
                  <div
                    key={cs.id}
                    className="grid grid-cols-[2fr_1fr_1fr_110px_80px] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="font-medium text-white truncate">{cs.stores?.name ?? '—'}</div>
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
                ))}
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
            {/* Campaign Name */}
            <div>
              <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={settingsName}
                onChange={e => setSettingsName(e.target.value)}
                className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm placeholder-[#b0b0d0]/50 focus:outline-none focus:border-[#7c6df5]/60 transition-colors"
                placeholder="Campaign name"
              />
            </div>

            {/* Brief / Compliance Criteria */}
            <div>
              <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">
                Brief / Compliance Criteria
              </label>
              <textarea
                value={settingsBrief}
                onChange={e => setSettingsBrief(e.target.value)}
                rows={4}
                className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm placeholder-[#b0b0d0]/50 focus:outline-none focus:border-[#7c6df5]/60 transition-colors resize-none"
                placeholder="Describe the compliance criteria for this campaign…"
              />
            </div>

            {/* Payout + Status row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">
                  Payout per Task (£)
                </label>
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
                <label className="block text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">
                  Status
                </label>
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

          {/* Save button + feedback */}
          <div className="flex items-center justify-between pt-2 border-t border-[#222240]">
            {saveResult ? (
              <span
                className="text-sm font-medium"
                style={{ color: saveResult.ok ? '#00e096' : '#ff6b9d' }}
              >
                {saveResult.msg}
              </span>
            ) : (
              <span />
            )}
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
    </div>
  )
}
