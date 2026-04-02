'use client'
import { TrendingUp, Store, CheckCircle, AlertTriangle, Clock, BarChart3, MapPin } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface TrendPoint {
  date: string
  total: number
  compliant: number
  avg_score: number
}

interface StoreMapPoint {
  store_id: string
  store_name: string
  lat: number
  lng: number
  latest_score: number | null
  is_compliant: boolean | null
  submission_count: number
}

interface Props {
  campaigns: any[]
  submissions: any[]
  trend: TrendPoint[]
  mapData: StoreMapPoint[]
}

// Custom tooltip for the line chart
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as TrendPoint
  return (
    <div className="bg-[#0c0c18] border border-[#222240] rounded-xl px-4 py-3 text-xs shadow-xl">
      <div className="text-[#b0b0d0] mb-1">{label}</div>
      <div className="text-white font-bold text-sm">{Math.round(d?.avg_score ?? 0)}% avg score</div>
      <div className="text-[#7c6df5]">{d?.compliant ?? 0} / {d?.total ?? 0} compliant</div>
    </div>
  )
}

// SVG Store Map — positions dots from lat/lng normalized to bounding box
function StoreSvgMap({ stores }: { stores: StoreMapPoint[] }) {
  const W = 800
  const H = 340
  const PAD = 32

  const lats = stores.map(s => s.lat).filter(Boolean)
  const lngs = stores.map(s => s.lng).filter(Boolean)

  // London fallback bounding box
  const minLat = lats.length ? Math.min(...lats) : 51.3
  const maxLat = lats.length ? Math.max(...lats) : 51.7
  const minLng = lngs.length ? Math.min(...lngs) : -0.35
  const maxLng = lngs.length ? Math.max(...lngs) : 0.15

  const latRange = maxLat - minLat || 0.4
  const lngRange = maxLng - minLng || 0.5

  function project(lat: number, lng: number) {
    const x = PAD + ((lng - minLng) / lngRange) * (W - PAD * 2)
    // latitude increases upward, SVG y increases downward
    const y = PAD + ((maxLat - lat) / latRange) * (H - PAD * 2)
    return { x, y }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-xl"
      style={{ background: '#030305', border: '1px solid #222240' }}
    >
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(f => (
        <g key={f}>
          <line
            x1={PAD} y1={PAD + f * (H - PAD * 2)}
            x2={W - PAD} y2={PAD + f * (H - PAD * 2)}
            stroke="#222240" strokeWidth="1"
          />
          <line
            x1={PAD + f * (W - PAD * 2)} y1={PAD}
            x2={PAD + f * (W - PAD * 2)} y2={H - PAD}
            stroke="#222240" strokeWidth="1"
          />
        </g>
      ))}

      {/* Store dots */}
      {stores.map(s => {
        const { x, y } = project(s.lat, s.lng)
        const color = s.is_compliant === null ? '#b0b0d0'
          : s.is_compliant ? '#00e096'
          : '#ff4d6d'
        const score = s.latest_score != null ? `${Math.round(s.latest_score)}%` : 'No data'
        return (
          <g key={s.store_id}>
            {/* Glow ring */}
            <circle cx={x} cy={y} r={9} fill={color} opacity={0.15} />
            <circle cx={x} cy={y} r={5} fill={color} opacity={0.85}>
              <title>{s.store_name} — {score}</title>
            </circle>
          </g>
        )
      })}

      {/* Legend */}
      <g transform={`translate(${W - PAD - 130}, ${H - PAD - 10})`}>
        <circle cx={6} cy={0} r={5} fill="#00e096" opacity={0.85} />
        <text x={14} y={4} fill="#b0b0d0" fontSize={11}>Compliant</text>
        <circle cx={80} cy={0} r={5} fill="#ff4d6d" opacity={0.85} />
        <text x={88} y={4} fill="#b0b0d0" fontSize={11}>Non-compliant</text>
      </g>

      {/* Empty state */}
      {stores.length === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="#b0b0d0" fontSize={14}>
          No store location data available
        </text>
      )}
    </svg>
  )
}

export default function DashboardClient({ campaigns, submissions, trend, mapData }: Props) {
  const totalSubmissions = submissions.length
  const compliant = submissions.filter(s => s.compliance_results?.[0]?.is_compliant).length
  const score = totalSubmissions > 0 ? Math.round((compliant / totalSubmissions) * 100) : 0

  const stats = [
    { label: 'Compliance Score', value: `${score}%`, delta: '+3.2%', icon: CheckCircle, color: '#00e096' },
    { label: 'Stores Audited', value: totalSubmissions.toString(), delta: '+18 today', icon: Store, color: '#7c6df5' },
    { label: 'Active Campaigns', value: campaigns.length.toString(), delta: '', icon: BarChart3, color: '#00d4d4' },
    { label: 'Avg Delivery', value: '28 min', delta: 'vs 30 min SLA', icon: Clock, color: '#ffc947' },
  ]

  // Format trend data for Recharts
  const chartData = trend.map(t => ({
    ...t,
    dateLabel: (() => {
      try { return format(parseISO(t.date), 'MMM d') }
      catch { return t.date }
    })(),
    compliancePct: t.total > 0 ? Math.round((t.compliant / t.total) * 100) : 0,
  }))

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

      {/* Compliance Trend Chart */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Compliance Trend</h2>
            <p className="text-[#b0b0d0] text-sm mt-0.5">Last 30 days — % of audits passing compliance</p>
          </div>
          <TrendingUp size={18} className="text-[#7c6df5]" />
        </div>

        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-[#b0b0d0] text-sm">
            No trend data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#222240" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: '#b0b0d0', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#b0b0d0', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                width={38}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#7c6df5', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Line
                type="monotone"
                dataKey="compliancePct"
                stroke="#7c6df5"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#7c6df5', stroke: '#0c0c18', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Store Coverage Map */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">Store Coverage</h2>
            <p className="text-[#b0b0d0] text-sm mt-0.5">Geographic distribution of audited stores</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#b0b0d0]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00e096]" />
              {mapData.filter(s => s.is_compliant).length} compliant
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff4d6d]" />
              {mapData.filter(s => s.is_compliant === false).length} non-compliant
            </span>
            <MapPin size={14} className="text-[#7c6df5]" />
          </div>
        </div>
        <StoreSvgMap stores={mapData} />
      </div>

      {/* Active campaigns + Recent activity */}
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
