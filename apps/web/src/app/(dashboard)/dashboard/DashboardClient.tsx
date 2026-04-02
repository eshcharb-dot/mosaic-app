'use client'
import { TrendingUp, Store, CheckCircle, AlertTriangle, Clock, BarChart3 } from 'lucide-react'

interface Props {
  campaigns: any[]
  submissions: any[]
}

export default function DashboardClient({ campaigns, submissions }: Props) {
  const totalSubmissions = submissions.length
  const compliant = submissions.filter(s => s.compliance_results?.[0]?.is_compliant).length
  const score = totalSubmissions > 0 ? Math.round((compliant / totalSubmissions) * 100) : 0

  const stats = [
    { label: 'Compliance Score', value: `${score}%`, delta: '+3.2%', icon: CheckCircle, color: '#00e096' },
    { label: 'Stores Audited', value: totalSubmissions.toString(), delta: '+18 today', icon: Store, color: '#7c6df5' },
    { label: 'Active Campaigns', value: campaigns.length.toString(), delta: '', icon: BarChart3, color: '#00d4d4' },
    { label: 'Avg Delivery', value: '28 min', delta: 'vs 30 min SLA', icon: Clock, color: '#ffc947' },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Campaign Overview</h1>
          <p className="text-[#b0b0d0] mt-1">Real-time shelf compliance across all active campaigns</p>
        </div>
        <div className="flex items-center gap-2 bg-[#00e096]/10 border border-[#00e096]/25 rounded-full px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-[#00e096] animate-pulse" />
          <span className="text-[#00e096] text-sm font-bold">LIVE</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#b0b0d0] text-sm font-medium">{stat.label}</span>
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <div className="text-4xl font-black text-white mb-1">{stat.value}</div>
            {stat.delta && <div className="text-xs" style={{ color: stat.color }}>{stat.delta}</div>}
          </div>
        ))}
      </div>

      {/* Active campaigns */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-5">Active Campaigns</h2>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 size={40} className="mx-auto mb-3 text-[#b0b0d0] opacity-30" />
              <p className="text-[#b0b0d0]">No active campaigns yet.</p>
              <a href="/campaigns/new" className="mt-4 inline-block bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white text-sm font-bold px-5 py-2 rounded-xl">
                Create your first campaign
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c: any) => (
                <a key={c.id} href={`/campaigns/${c.id}`}
                  className="flex items-center justify-between p-4 bg-[#030305] border border-[#222240] rounded-xl hover:border-[#7c6df5]/50 transition-colors">
                  <div>
                    <div className="font-semibold text-white">{c.name}</div>
                    <div className="text-[#b0b0d0] text-sm">{c.product_name} · {c.campaign_stores?.[0]?.count ?? 0} stores</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#00e096] font-bold text-lg">{c.compliance_score ?? '—'}%</div>
                    <div className="text-[#b0b0d0] text-xs">compliance</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-5">Recent Submissions</h2>
          <div className="space-y-3">
            {submissions.slice(0, 8).map((s: any) => {
              const result = s.compliance_results?.[0]
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-[#030305] rounded-xl border border-[#222240]">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${result?.is_compliant ? 'bg-[#00e096]' : result ? 'bg-[#ff6b9d]' : 'bg-[#ffc947]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{s.stores?.name ?? 'Unknown store'}</div>
                    <div className="text-xs text-[#b0b0d0]">{s.stores?.city}</div>
                  </div>
                  {result && (
                    <div className="text-sm font-bold" style={{ color: result.is_compliant ? '#00e096' : '#ff6b9d' }}>
                      {Math.round(result.score)}%
                    </div>
                  )}
                </div>
              )
            })}
            {submissions.length === 0 && (
              <p className="text-[#b0b0d0] text-sm text-center py-8">No submissions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
