'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Store, CheckCircle, Clock, BarChart3, Zap, Settings, Upload } from 'lucide-react'
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
  const router = useRouter()
  const supabase = createClient()

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
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-white">Campaign Settings</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Campaign ID', value: campaign.id },
              { label: 'Status', value: status },
              { label: 'SLA', value: `${campaign.sla_minutes} minutes` },
              { label: 'Created', value: new Date(campaign.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#030305] border border-[#222240] rounded-xl p-4">
                <div className="text-[#b0b0d0] text-xs mb-1">{label}</div>
                <div className="text-white font-medium font-mono text-xs break-all">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
