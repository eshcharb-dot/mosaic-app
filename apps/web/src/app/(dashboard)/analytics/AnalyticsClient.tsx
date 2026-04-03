'use client'
import { useState, memo } from 'react'
import { TrendingUp, BarChart3, AlertTriangle, Trophy, Award } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from 'recharts'
import { format, parseISO } from 'date-fns'

// ── Types ────────────────────────────────────────────────────────────────────

interface ScoreBucket {
  range: string
  count: number
}

interface StoreRow {
  store_name: string
  avg_score: number
  submission_count: number
}

interface CampaignRow {
  campaign_name: string
  avg_score: number
  compliant_pct: number
}

interface TrendPoint {
  date: string
  total: number
  compliant: number
  avg_score: number
}

interface TierDistRow {
  tier: string
  tier_name: string
  count: number
  badge_color: string
}

interface Props {
  scoreDistribution: ScoreBucket[]
  topStores: StoreRow[]
  bottomStores: StoreRow[]
  campaignComparison: CampaignRow[]
  trend: TrendPoint[]
  tierDistribution?: TierDistRow[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DATE_RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days']

// Canonical ordered buckets so chart always shows all ranges left-to-right
const RANGE_ORDER = ['Below 60', '60-69', '70-79', '80-89', '90-100']

// Canonical tier order for the distribution chart (highest to lowest)
const TIER_ORDER = ['elite', 'gold', 'silver', 'bronze']

function scoreColor(score: number): string {
  if (score >= 80) return '#00e096'
  if (score >= 70) return '#ffc947'
  return '#ff4d6d'
}

function bucketColor(range: string): string {
  if (range === '90-100' || range === '80-89') return '#00e096'
  if (range === '70-79') return '#ffc947'
  return '#ff4d6d'
}

const RANK_STYLES: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: '#ffc947', text: '#0c0c18', label: '1st' },
  2: { bg: '#b0b0d0', text: '#0c0c18', label: '2nd' },
  3: { bg: '#cd7f32', text: '#fff', label: '3rd' },
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, icon: Icon, children }: {
  title: string
  subtitle?: string
  icon?: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-[var(--text)]">{title}</h2>
          {subtitle && <p className="text-[var(--text-muted)] text-sm mt-0.5">{subtitle}</p>}
        </div>
        {Icon && <Icon size={18} className="text-[#7c6df5]" />}
      </div>
      {children}
    </div>
  )
}

const DistributionTooltip = memo(function DistributionTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)' }} className="rounded-xl px-4 py-3 text-xs shadow-xl">
      <div className="text-[var(--text-muted)] mb-1">{label}</div>
      <div className="text-[var(--text)] font-bold text-sm">{payload[0].value} stores</div>
    </div>
  )
})

const TierTooltip = memo(function TierTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)' }} className="rounded-xl px-4 py-3 text-xs shadow-xl">
      <div className="text-[var(--text-muted)] mb-1">{label}</div>
      <div className="text-[var(--text)] font-bold text-sm">{payload[0].value} collectors</div>
    </div>
  )
})

const TrendTooltip = memo(function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as TrendPoint
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)' }} className="rounded-xl px-4 py-3 text-xs shadow-xl">
      <div className="text-[var(--text-muted)] mb-1">{label}</div>
      <div className="text-[var(--text)] font-bold text-sm">{Math.round(d?.avg_score ?? 0)}% avg score</div>
      <div className="text-[#7c6df5]">{d?.compliant ?? 0} / {d?.total ?? 0} compliant</div>
    </div>
  )
})

const CampaignTooltip = memo(function CampaignTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)' }} className="rounded-xl px-4 py-3 text-xs shadow-xl">
      <div className="text-[var(--text-muted)] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.value}%
        </div>
      ))}
    </div>
  )
})

const StoresTable = memo(function StoresTable({ stores, mode }: { stores: StoreRow[]; mode: 'top' | 'bottom' }) {
  if (stores.length === 0) {
    return (
      <div className="text-center py-10 text-[var(--text-muted)] text-sm">No data available yet</div>
    )
  }
  return (
    <div className="space-y-2">
      {stores.map((s, i) => {
        const rank = i + 1
        const rankStyle = RANK_STYLES[rank]
        const color = scoreColor(s.avg_score)
        return (
          <div
            key={s.store_name}
            className="flex items-center gap-3 p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl"
          >
            {/* Rank badge */}
            <div
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
              style={
                rankStyle
                  ? { background: rankStyle.bg, color: rankStyle.text }
                  : { background: '#1a1a30', color: '#b0b0d0' }
              }
            >
              {rankStyle ? rankStyle.label : `#${rank}`}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text)] truncate">{s.store_name}</div>
              <div className="text-xs text-[var(--text-muted)]">{s.submission_count} submission{s.submission_count !== 1 ? 's' : ''}</div>
            </div>

            {/* Score + label */}
            <div className="text-right flex-shrink-0">
              <div className="text-lg font-black" style={{ color }}>{s.avg_score}%</div>
              {mode === 'bottom' && (
                <div className="text-[10px] font-bold text-[#ff4d6d] uppercase tracking-wide">Needs attention</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})

// ── Tier Distribution chart ───────────────────────────────────────────────────

function TierDistribution({ data }: { data: TierDistRow[] }) {
  // Fill missing tiers with 0 and maintain canonical order
  const chartData = TIER_ORDER.map(tierId => {
    const found = data.find(d => d.tier === tierId)
    return {
      tier: tierId,
      name: found?.tier_name ?? (tierId.charAt(0).toUpperCase() + tierId.slice(1)),
      count: found ? Number(found.count) : 0,
      badge_color: found?.badge_color ?? '#cd7f32',
    }
  })

  if (chartData.every(d => d.count === 0)) {
    return (
      <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-sm">
        No tier data available yet
      </div>
    )
  }

  const total = chartData.reduce((s, d) => s + d.count, 0)

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<TierTooltip />} cursor={{ fill: '#ffffff08' }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {chartData.map(entry => (
              <Cell key={entry.tier} fill={entry.badge_color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3 pt-1">
        {chartData.map(d => (
          <div
            key={d.tier}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold"
            style={{ borderColor: d.badge_color + '40', backgroundColor: d.badge_color + '12', color: d.badge_color }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: d.badge_color }}
            />
            {d.name}: {d.count}
            {total > 0 && (
              <span className="opacity-60">({Math.round((d.count / total) * 100)}%)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsClient({
  scoreDistribution,
  topStores,
  bottomStores,
  campaignComparison,
  trend,
  tierDistribution = [],
}: Props) {
  const [activeRange, setActiveRange] = useState('Last 30 days')

  // Normalise distribution — fill missing buckets with 0
  const distData = RANGE_ORDER.map(range => {
    const found = scoreDistribution.find(b => b.range === range)
    return { range, count: found ? Number(found.count) : 0 }
  })

  // Trend chart data
  const trendData = trend.map(t => ({
    ...t,
    dateLabel: (() => {
      try { return format(parseISO(t.date), 'MMM d') } catch { return t.date }
    })(),
    compliancePct: t.total > 0 ? Math.round((t.compliant / t.total) * 100) : 0,
  }))

  // Campaign comparison — dual-bar data
  const campData = (campaignComparison ?? []).map(c => ({
    name: c.campaign_name,
    avgScore: Number(c.avg_score),
    compliantPct: Number(c.compliant_pct),
  }))

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-[var(--text)] tracking-tight">Analytics</h1>
          <p className="text-[var(--text-muted)] mt-1">Deep compliance insights across campaigns and stores</p>
        </div>

        {/* Date range selector — visual only */}
        <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] rounded-xl p-1">
          {DATE_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setActiveRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeRange === r
                  ? 'bg-[#7c6df5] text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Score Distribution */}
      <div className="mb-5">
        <SectionCard
          title="Score Distribution"
          subtitle="Number of stores in each compliance score bracket"
          icon={BarChart3}
        >
          {distData.every(d => d.count === 0) ? (
            <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-sm">
              No compliance data available yet
            </div>
          ) : (
            <div aria-label="Score distribution bar chart">
              <div className="sr-only" aria-label="Chart data table">
                <table>
                  <caption>Compliance score distribution — stores per bracket</caption>
                  <thead><tr><th scope="col">Score range</th><th scope="col">Store count</th></tr></thead>
                  <tbody>
                    {distData.map(d => <tr key={d.range}><td>{d.range}</td><td>{d.count}</td></tr>)}
                  </tbody>
                </table>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={distData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="range"
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip content={<DistributionTooltip />} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {distData.map(entry => (
                      <Cell key={entry.range} fill={bucketColor(entry.range)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Row 2: Top + Bottom stores */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <SectionCard
          title="Top 5 Stores"
          subtitle="Highest average compliance scores"
          icon={Trophy}
        >
          <StoresTable stores={topStores} mode="top" />
        </SectionCard>

        <SectionCard
          title="Bottom 5 Stores"
          subtitle="Stores requiring the most attention"
          icon={AlertTriangle}
        >
          <StoresTable stores={bottomStores} mode="bottom" />
        </SectionCard>
      </div>

      {/* Row 3: Campaign Comparison */}
      <div className="mb-5">
        <SectionCard
          title="Campaign Comparison"
          subtitle="Average score and compliance rate per campaign"
          icon={BarChart3}
        >
          {campData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-sm">
              No campaign data available yet
            </div>
          ) : campData.length === 1 ? (
            /* Single campaign: horizontal bars */
            <div className="space-y-4 py-4">
              {[
                { label: 'Avg Score', value: campData[0].avgScore, color: '#7c6df5' },
                { label: 'Compliant %', value: campData[0].compliantPct, color: '#00e096' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-[var(--text-muted)]">{campData[0].name} — {label}</span>
                    <span className="font-bold text-[var(--text)]">{value}%</span>
                  </div>
                  <div className="h-3 bg-[#1a1a30] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${value}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={campData}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip content={<CampaignTooltip />} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="avgScore" name="Avg Score" fill="#7c6df5" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="compliantPct" name="Compliant %" fill="#00e096" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Row 4: 30-day Trend */}
      <div className="mb-5">
        <SectionCard
          title="30-Day Compliance Trend"
          subtitle="Percentage of audits passing compliance over time"
          icon={TrendingUp}
        >
          {trendData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-[var(--text-muted)] text-sm">
              No trend data available yet
            </div>
          ) : (
            <div aria-label="30-day compliance trend area chart">
              <div className="sr-only" aria-label="Chart data table">
                <table>
                  <caption>30-day compliance trend — % of audits passing per day</caption>
                  <thead><tr><th scope="col">Date</th><th scope="col">Compliance %</th><th scope="col">Total</th><th scope="col">Compliant</th></tr></thead>
                  <tbody>
                    {trendData.map(d => <tr key={d.date}><td>{d.dateLabel}</td><td>{d.compliancePct}%</td><td>{d.total}</td><td>{d.compliant}</td></tr>)}
                  </tbody>
                </table>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c6df5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c6df5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v}%`}
                    width={38}
                  />
                  <Tooltip
                    content={<TrendTooltip />}
                    cursor={{ stroke: '#7c6df5', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="compliancePct"
                    stroke="#7c6df5"
                    strokeWidth={2.5}
                    fill="url(#trendGradient)"
                    dot={{ r: 4, fill: '#7c6df5', stroke: '#0c0c18', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#7c6df5', stroke: '#0c0c18', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Row 5: Collector Tier Distribution */}
      <div>
        <SectionCard
          title="Collector Tier Distribution"
          subtitle="Number of active collectors in each tier"
          icon={Award}
        >
          <TierDistribution data={tierDistribution} />
        </SectionCard>
      </div>
    </div>
  )
}
