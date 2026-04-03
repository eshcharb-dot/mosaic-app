'use client'
import { Building2, Store, FileCheck, ClipboardCheck, Activity, Zap, CheckCircle2 } from 'lucide-react'
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
import { memo } from 'react'

interface DailyPoint { date: string; count: number }

interface AdminStats {
  total_orgs?: number
  total_stores?: number
  total_submissions?: number
  total_compliance_results?: number
  submissions_today?: number
  active_campaigns?: number
  daily_trend?: DailyPoint[]
}

interface Props { stats: AdminStats }

const STAT_CARDS = (s: AdminStats) => [
  { label: 'Organizations', value: s.total_orgs ?? 0, icon: Building2, accent: '#7c6df5' },
  { label: 'Stores', value: s.total_stores ?? 0, icon: Store, accent: '#00e096' },
  { label: 'Total Submissions', value: s.total_submissions ?? 0, icon: FileCheck, accent: '#ffc947' },
  { label: 'Compliance Results', value: s.total_compliance_results ?? 0, icon: ClipboardCheck, accent: '#7c6df5' },
  { label: 'Submissions Today', value: s.submissions_today ?? 0, icon: Activity, accent: '#00e096' },
  { label: 'Active Campaigns', value: s.active_campaigns ?? 0, icon: Zap, accent: '#ffc947' },
]

const HEALTH_ITEMS = [
  { label: 'Database', status: 'Healthy' },
  { label: 'Edge Functions', status: 'Operational' },
  { label: 'Storage', status: 'Operational' },
  { label: 'Auth', status: 'Healthy' },
]

const TrendTooltip = memo(function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0c0c18] border border-[#222240] rounded-xl px-4 py-3 text-xs shadow-xl">
      <div className="text-[#b0b0d0] mb-1">{label}</div>
      <div className="text-white font-bold">{payload[0].value} submissions</div>
    </div>
  )
})

export default function AdminOverviewClient({ stats }: Props) {
  const cards = STAT_CARDS(stats)

  const trendData = (stats.daily_trend ?? []).map((p) => ({
    ...p,
    dateLabel: (() => {
      try { return format(parseISO(String(p.date)), 'MMM d') } catch { return String(p.date) }
    })(),
    count: Number(p.count),
  }))

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Admin Overview</h1>
        <p className="text-[#b0b0d0] mt-1">Platform-wide health and usage at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-5 flex items-center gap-4"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: accent + '1a' }}
            >
              <Icon size={20} style={{ color: accent }} />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{value.toLocaleString()}</div>
              <div className="text-sm text-[#b0b0d0] mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Row: chart + health */}
      <div className="grid grid-cols-3 gap-6">
        {/* Trend chart */}
        <div className="col-span-2 bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-1">Submission Volume</h2>
          <p className="text-[#b0b0d0] text-sm mb-5">Daily submissions across all organizations — last 30 days</p>
          {trendData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-[#b0b0d0] text-sm">
              No submission data in the last 30 days
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#222240" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: '#b0b0d0', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#b0b0d0', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#7c6df5', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#7c6df5"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#7c6df5', stroke: '#0c0c18', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#7c6df5', stroke: '#0c0c18', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* System Health */}
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-1">System Health</h2>
          <p className="text-[#b0b0d0] text-sm mb-5">Infrastructure status</p>
          <div className="space-y-3">
            {HEALTH_ITEMS.map(({ label, status }) => (
              <div
                key={label}
                className="flex items-center justify-between p-3 bg-[#030305] border border-[#222240] rounded-xl"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-[#00e096]" />
                  <span className="text-sm text-white">{label}</span>
                </div>
                <span className="text-xs font-semibold text-[#00e096]">{status}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[#222240] text-xs text-[#b0b0d0]">
            All systems operational
          </div>
        </div>
      </div>
    </div>
  )
}
