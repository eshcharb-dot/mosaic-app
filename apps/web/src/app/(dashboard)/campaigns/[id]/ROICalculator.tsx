'use client'
import { useState, useMemo, useCallback } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp, DollarSign, Clock, Download } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Pre-filled from campaign data */
  storeCount: number
  /** Campaign avg_score (0–100) — used as default "after Mosaic" score */
  avgScore: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtGBP(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `£${(n / 1_000).toFixed(0)}K`
  return `£${fmt(n)}`
}

// ── Slider component ──────────────────────────────────────────────────────────

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  locked,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format: (v: number) => string
  onChange: (v: number) => void
  locked?: boolean
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">
          {label}
          {locked && (
            <span className="ml-2 px-1.5 py-0.5 rounded-md bg-[#7c6df5]/20 text-[#a89cf7] text-[10px] normal-case font-bold tracking-normal">
              from campaign
            </span>
          )}
        </label>
        <span className="text-sm font-bold text-white">{format(value)}</span>
      </div>
      <div className="relative h-2 bg-[#1a1a30] rounded-full">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: locked ? 'linear-gradient(90deg, #00d4d4, #00e096)' : 'linear-gradient(90deg, #7c6df5, #a89cf7)',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          disabled={locked}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#b0b0d0]/60">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )
}

// ── ROI Tooltip ───────────────────────────────────────────────────────────────

function ROITooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0c0c18] border border-[#222240] rounded-xl px-4 py-3 text-xs shadow-xl">
      <div className="text-[#b0b0d0] mb-2 font-semibold">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#b0b0d0]">{p.name}:</span>
          <span className="text-white font-bold">
            {p.dataKey === 'score' ? `${p.value}%` : `£${fmt(p.value)}`}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ROICalculator({ storeCount, avgScore }: Props) {
  const afterScoreDefault = avgScore !== null ? Math.round(avgScore) : 78

  const [revenuePerStore, setRevenuePerStore] = useState(50_000)
  const [revenueMultiplier, setRevenueMultiplier] = useState(0.5)
  const [stores, setStores] = useState(storeCount > 0 ? storeCount : 50)
  const [beforeScore, setBeforeScore] = useState(65)
  const [afterScore, setAfterScore] = useState(afterScoreDefault)
  const [auditCostPerStore, setAuditCostPerStore] = useState(150)

  const scoreLocked = avgScore !== null
  const storeLocked = storeCount > 0

  // ── Calculations ─────────────────────────────────────────────────────────

  const calcs = useMemo(() => {
    const scoreDelta = Math.max(0, afterScore - beforeScore)

    // Revenue saved per month
    const revenueSavedMonthly = (scoreDelta / 100) * revenuePerStore * stores * (revenueMultiplier / 100)

    // Annual revenue protected
    const revenueAnnual = revenueSavedMonthly * 12

    // Traditional audit cost (quarterly × 4 per year)
    const traditionalCost = stores * auditCostPerStore * 4

    // Mosaic cost: stores × 12 tasks/year × £12 per task
    const mosaicCost = stores * 12 * 12

    // Cost savings
    const costSavings = traditionalCost - mosaicCost

    // Total ROI %
    const totalROI = mosaicCost > 0
      ? ((revenueAnnual + Math.max(0, costSavings)) / mosaicCost) * 100
      : 0

    // Payback in months
    const monthlyBenefit = revenueSavedMonthly + costSavings / 12
    const payback = monthlyBenefit > 0 ? mosaicCost / monthlyBenefit : 0

    return {
      revenueSavedMonthly,
      revenueAnnual,
      traditionalCost,
      mosaicCost,
      costSavings,
      totalROI,
      payback,
      scoreDelta,
    }
  }, [revenuePerStore, revenueMultiplier, stores, beforeScore, afterScore, auditCostPerStore])

  // ── Time-series chart data (12 months) ──────────────────────────────────

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      // Linear ramp from beforeScore to afterScore over 3 months, then stable
      const rampFraction = Math.min(1, month / 3)
      const score = beforeScore + (afterScore - beforeScore) * rampFraction
      // Revenue at risk without Mosaic — stays flat at the "before" level
      const riskWithout = (beforeScore / 100) * revenuePerStore * stores * (revenueMultiplier / 100)
      // Revenue at risk with Mosaic — improves as score ramps
      const riskWith = (score / 100) * revenuePerStore * stores * (revenueMultiplier / 100)
      return {
        month: `M${month}`,
        withoutMosaic: Math.round(riskWithout),
        withMosaic: Math.round(riskWith),
        score: Math.round(score),
      }
    })
  }, [beforeScore, afterScore, revenuePerStore, stores, revenueMultiplier])

  // ── Print / export ───────────────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    const report = `
MOSAIC ROI REPORT
Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
═══════════════════════════════════════

INPUTS
──────
Stores monitored:           ${stores}
Revenue per store/month:    £${fmt(revenuePerStore)}
Revenue loss per 1% non-compliance: ${revenueMultiplier}%
Compliance before Mosaic:   ${beforeScore}%
Compliance after Mosaic:    ${afterScore}%
Traditional audit cost:     £${auditCostPerStore} / store / quarter

RESULTS
───────
Monthly revenue saved:      ${fmtGBP(calcs.revenueSavedMonthly)}
Annual revenue protected:   ${fmtGBP(calcs.revenueAnnual)}
Traditional audit cost/yr:  ${fmtGBP(calcs.traditionalCost)}
Mosaic cost/yr:             ${fmtGBP(calcs.mosaicCost)}
Cost savings vs traditional: ${fmtGBP(Math.max(0, calcs.costSavings))}
Total ROI:                  ${fmt(calcs.totalROI, 0)}%
Payback period:             ${calcs.payback.toFixed(1)} months

═══════════════════════════════════════
Powered by Mosaic — Physical World Intelligence
https://mosaic.app
    `.trim()

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mosaic-roi-report-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [stores, revenuePerStore, revenueMultiplier, beforeScore, afterScore, auditCostPerStore, calcs])

  // ── ROI colour (green high, purple very high) ────────────────────────────

  const roiColor = calcs.totalROI >= 500 ? '#7c6df5' : '#00e096'

  return (
    <div className="space-y-6">

      {/* ── Big ROI headline ── */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-8 flex flex-col items-center text-center">
        <div className="text-xs font-bold text-[#b0b0d0] uppercase tracking-widest mb-3">
          Estimated Total ROI
        </div>
        <div
          className="text-7xl font-black leading-none mb-2 tabular-nums"
          style={{ color: roiColor }}
        >
          {fmt(Math.round(calcs.totalROI))}%
        </div>
        <div className="text-[#b0b0d0] text-sm mt-2">
          Return on your Mosaic investment — based on compliance improvement and cost savings
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-3 gap-6 mt-8 w-full max-w-2xl">
          {[
            {
              icon: DollarSign,
              label: 'Revenue Protected / yr',
              value: fmtGBP(calcs.revenueAnnual),
              color: '#00e096',
            },
            {
              icon: TrendingUp,
              label: 'Cost Savings / yr',
              value: fmtGBP(Math.max(0, calcs.costSavings)),
              color: '#7c6df5',
            },
            {
              icon: Clock,
              label: 'Payback Period',
              value: calcs.payback > 0 ? `${calcs.payback.toFixed(1)} mo` : '< 1 mo',
              color: '#ffc947',
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="rounded-xl p-4 border"
              style={{ background: `${color}0d`, borderColor: `${color}30` }}
            >
              <Icon size={16} style={{ color }} className="mx-auto mb-2" />
              <div className="text-xl font-black text-white">{value}</div>
              <div className="text-[10px] text-[#b0b0d0] mt-1 uppercase tracking-wide font-semibold">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column: inputs + comparison ── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Inputs */}
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">Calculator Inputs</h2>
            <p className="text-xs text-[#b0b0d0] mt-0.5">Adjust to match your business</p>
          </div>

          <Slider
            label="Monthly revenue per store (£)"
            value={revenuePerStore}
            min={5_000}
            max={500_000}
            step={5_000}
            format={v => `£${fmt(v)}`}
            onChange={setRevenuePerStore}
          />
          <Slider
            label="Revenue loss per 1% non-compliance"
            value={revenueMultiplier}
            min={0.1}
            max={5}
            step={0.1}
            format={v => `${v.toFixed(1)}%`}
            onChange={setRevenueMultiplier}
          />
          <Slider
            label="Stores monitored"
            value={stores}
            min={1}
            max={2_000}
            step={1}
            format={v => fmt(v)}
            onChange={setStores}
            locked={storeLocked}
          />
          <Slider
            label="Compliance before Mosaic"
            value={beforeScore}
            min={40}
            max={90}
            step={1}
            format={v => `${v}%`}
            onChange={setBeforeScore}
          />
          <Slider
            label="Compliance after Mosaic"
            value={afterScore}
            min={50}
            max={100}
            step={1}
            format={v => `${v}%`}
            onChange={v => { if (!scoreLocked) setAfterScore(v) }}
            locked={scoreLocked}
          />
          <Slider
            label="Traditional audit cost / store / quarter"
            value={auditCostPerStore}
            min={50}
            max={500}
            step={10}
            format={v => `£${fmt(v)}`}
            onChange={setAuditCostPerStore}
          />
        </div>

        {/* Without vs With comparison */}
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-white">Cost Comparison</h2>
            <p className="text-xs text-[#b0b0d0] mt-0.5">Annual spend — traditional vs Mosaic</p>
          </div>

          {/* Traditional */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#b0b0d0] font-medium">Without Mosaic</span>
              <span className="font-bold text-white">{fmtGBP(calcs.traditionalCost)}</span>
            </div>
            <div className="h-4 bg-[#1a1a30] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: '100%',
                  background: 'linear-gradient(90deg, #ff4d6d, #ff6b9d)',
                }}
              />
            </div>
            <div className="text-[10px] text-[#b0b0d0] mt-1.5">
              {stores} stores × £{auditCostPerStore} × 4 quarters
            </div>
          </div>

          {/* Mosaic */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#b0b0d0] font-medium">With Mosaic</span>
              <span className="font-bold text-white">{fmtGBP(calcs.mosaicCost)}</span>
            </div>
            <div className="h-4 bg-[#1a1a30] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (calcs.mosaicCost / calcs.traditionalCost) * 100)}%`,
                  background: 'linear-gradient(90deg, #7c6df5, #00d4d4)',
                }}
              />
            </div>
            <div className="text-[10px] text-[#b0b0d0] mt-1.5">
              {stores} stores × 12 audits × £12 platform cost
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#222240] pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#b0b0d0] font-medium">You save</span>
              <span
                className="text-lg font-black"
                style={{ color: calcs.costSavings > 0 ? '#00e096' : '#ff4d6d' }}
              >
                {calcs.costSavings >= 0 ? '+' : ''}{fmtGBP(calcs.costSavings)}
              </span>
            </div>
            <div className="text-[10px] text-[#b0b0d0] mt-1">on audit costs alone — before revenue impact</div>
          </div>

          {/* Revenue impact breakdown */}
          <div className="border-t border-[#222240] pt-4 space-y-3">
            <div className="text-xs font-bold text-[#b0b0d0] uppercase tracking-wider">Revenue impact</div>
            {[
              { label: 'Compliance gap closed', value: `${calcs.scoreDelta}pp`, color: '#ffc947' },
              { label: 'Monthly revenue saved', value: fmtGBP(calcs.revenueSavedMonthly), color: '#00e096' },
              { label: 'Annual revenue protected', value: fmtGBP(calcs.revenueAnnual), color: '#00e096' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <span className="text-[#b0b0d0]">{label}</span>
                <span className="font-bold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-white">12-Month Compliance & Revenue Trajectory</h2>
          <p className="text-xs text-[#b0b0d0] mt-0.5">Revenue protected (area) and compliance score improvement (line)</p>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="roiWithout" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff4d6d" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="roiWith" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c6df5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7c6df5" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#222240" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#b0b0d0', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            {/* Left Y — revenue */}
            <YAxis
              yAxisId="rev"
              orientation="left"
              tick={{ fill: '#b0b0d0', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => fmtGBP(v)}
              width={60}
            />
            {/* Right Y — score */}
            <YAxis
              yAxisId="score"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: '#b0b0d0', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}%`}
              width={40}
            />
            <Tooltip content={<ROITooltip />} cursor={{ stroke: '#7c6df5', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#b0b0d0', paddingTop: 12 }}
              formatter={(value) => <span style={{ color: '#b0b0d0' }}>{value}</span>}
            />
            <Area
              yAxisId="rev"
              type="monotone"
              dataKey="withoutMosaic"
              name="Revenue at risk (before)"
              stroke="#ff4d6d"
              strokeWidth={1.5}
              fill="url(#roiWithout)"
              strokeDasharray="5 3"
              dot={false}
            />
            <Area
              yAxisId="rev"
              type="monotone"
              dataKey="withMosaic"
              name="Revenue protected (after)"
              stroke="#7c6df5"
              strokeWidth={2}
              fill="url(#roiWith)"
              dot={false}
            />
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="score"
              name="Compliance score"
              stroke="#00e096"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#00e096', stroke: '#0c0c18', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Export button ── */}
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#7c6df5]/40 bg-[#7c6df5]/10 text-[#a89cf7] hover:bg-[#7c6df5]/20 hover:text-white transition-colors text-sm font-semibold"
        >
          <Download size={15} />
          Download ROI Report
        </button>
      </div>
    </div>
  )
}
