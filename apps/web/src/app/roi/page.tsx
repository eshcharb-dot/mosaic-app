'use client'
import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
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
import { TrendingUp, DollarSign, Clock, Download, Zap, ArrowRight } from 'lucide-react'

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

// ── Slider ────────────────────────────────────────────────────────────────────

function Slider({
  label,
  sublabel,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string
  sublabel?: string
  value: number
  min: number
  max: number
  step?: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{label}</div>
          {sublabel && <div className="text-xs text-[#b0b0d0] mt-0.5">{sublabel}</div>}
        </div>
        <span className="text-lg font-black text-white whitespace-nowrap">{format(value)}</span>
      </div>
      <div className="relative h-2.5 bg-white/10 rounded-full">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #7c6df5, #00d4d4)',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ROITooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0c0c18] border border-[#333360] rounded-xl px-4 py-3 text-xs shadow-2xl">
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ROIPage() {
  const [revenuePerStore, setRevenuePerStore] = useState(50_000)
  const [revenueMultiplier, setRevenueMultiplier] = useState(0.5)
  const [stores, setStores] = useState(100)
  const [beforeScore, setBeforeScore] = useState(65)
  const [afterScore, setAfterScore] = useState(82)
  const [auditCostPerStore, setAuditCostPerStore] = useState(150)

  const calcs = useMemo(() => {
    const scoreDelta = Math.max(0, afterScore - beforeScore)
    const revenueSavedMonthly = (scoreDelta / 100) * revenuePerStore * stores * (revenueMultiplier / 100)
    const revenueAnnual = revenueSavedMonthly * 12
    const traditionalCost = stores * auditCostPerStore * 4
    const mosaicCost = stores * 12 * 12
    const costSavings = traditionalCost - mosaicCost
    const totalROI = mosaicCost > 0
      ? ((revenueAnnual + Math.max(0, costSavings)) / mosaicCost) * 100
      : 0
    const monthlyBenefit = revenueSavedMonthly + costSavings / 12
    const payback = monthlyBenefit > 0 ? mosaicCost / monthlyBenefit : 0
    return { revenueSavedMonthly, revenueAnnual, traditionalCost, mosaicCost, costSavings, totalROI, payback, scoreDelta }
  }, [revenuePerStore, revenueMultiplier, stores, beforeScore, afterScore, auditCostPerStore])

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const rampFraction = Math.min(1, month / 3)
      const score = beforeScore + (afterScore - beforeScore) * rampFraction
      const riskWithout = (beforeScore / 100) * revenuePerStore * stores * (revenueMultiplier / 100)
      const riskWith = (score / 100) * revenuePerStore * stores * (revenueMultiplier / 100)
      return {
        month: `M${month}`,
        withoutMosaic: Math.round(riskWithout),
        withMosaic: Math.round(riskWith),
        score: Math.round(score),
      }
    })
  }, [beforeScore, afterScore, revenuePerStore, stores, revenueMultiplier])

  const handleDownload = useCallback(() => {
    const report = `
MOSAIC ROI ESTIMATE
Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
═══════════════════════════════════════

INPUTS
──────
Stores monitored:           ${stores}
Revenue per store/month:    £${fmt(revenuePerStore)}
Revenue loss per 1% gap:    ${revenueMultiplier}%
Compliance before Mosaic:   ${beforeScore}%
Compliance after Mosaic:    ${afterScore}%
Traditional audit cost:     £${auditCostPerStore} / store / quarter

ESTIMATED RESULTS
─────────────────
Monthly revenue saved:      ${fmtGBP(calcs.revenueSavedMonthly)}
Annual revenue protected:   ${fmtGBP(calcs.revenueAnnual)}
Traditional audit cost/yr:  ${fmtGBP(calcs.traditionalCost)}
Mosaic cost/yr:             ${fmtGBP(calcs.mosaicCost)}
Cost savings:               ${fmtGBP(Math.max(0, calcs.costSavings))}
Total ROI:                  ${fmt(calcs.totalROI, 0)}%
Payback period:             ${calcs.payback.toFixed(1)} months

Get your real numbers at: https://mosaic.app/onboarding

═══════════════════════════════════════
Powered by Mosaic — Physical World Intelligence
    `.trim()

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mosaic-roi-estimate-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [stores, revenuePerStore, revenueMultiplier, beforeScore, afterScore, auditCostPerStore, calcs])

  const roiColor = calcs.totalROI >= 500 ? '#a89cf7' : '#00e096'

  return (
    <div className="min-h-screen bg-[#030305] text-white">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #7c6df5 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-16">

        {/* ── Header ── */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 mb-6">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c6df5, #00d4d4)' }}
            >
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-black text-xl tracking-tight">Mosaic</span>
          </div>

          <h1 className="text-5xl font-black tracking-tight leading-tight mb-4">
            Calculate your
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #7c6df5, #00d4d4)' }}
            >
              compliance ROI
            </span>
          </h1>
          <p className="text-[#b0b0d0] text-lg max-w-xl mx-auto">
            See exactly how much revenue you're losing to non-compliance — and what Mosaic puts back.
          </p>
        </div>

        {/* ── Big ROI number ── */}
        <div
          className="rounded-3xl p-10 mb-8 text-center border"
          style={{
            background: 'linear-gradient(135deg, #0c0c1880, #0c0c18)',
            borderColor: '#222240',
          }}
        >
          <div className="text-xs font-bold text-[#b0b0d0] uppercase tracking-widest mb-3">
            Your estimated ROI with Mosaic
          </div>
          <div
            className="text-8xl font-black leading-none mb-4 tabular-nums"
            style={{ color: roiColor }}
          >
            {fmt(Math.round(calcs.totalROI))}%
          </div>

          <div className="grid grid-cols-3 gap-6 mt-8 max-w-2xl mx-auto">
            {[
              { icon: DollarSign, label: 'Revenue Protected / yr', value: fmtGBP(calcs.revenueAnnual), color: '#00e096' },
              { icon: TrendingUp, label: 'Cost Savings / yr', value: fmtGBP(Math.max(0, calcs.costSavings)), color: '#7c6df5' },
              { icon: Clock, label: 'Payback Period', value: calcs.payback > 0 ? `${calcs.payback.toFixed(1)} mo` : '< 1 mo', color: '#ffc947' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div
                key={label}
                className="rounded-2xl p-5 border"
                style={{ background: `${color}0d`, borderColor: `${color}30` }}
              >
                <Icon size={18} style={{ color }} className="mx-auto mb-2" />
                <div className="text-2xl font-black text-white">{value}</div>
                <div className="text-[10px] text-[#b0b0d0] mt-1 uppercase tracking-wide font-semibold">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Inputs ── */}
        <div
          className="rounded-3xl p-8 mb-8 border"
          style={{ background: '#0c0c18', borderColor: '#222240' }}
        >
          <h2 className="text-lg font-bold text-white mb-1">Your numbers</h2>
          <p className="text-sm text-[#b0b0d0] mb-8">Adjust the sliders — your ROI updates instantly.</p>

          <div className="grid grid-cols-2 gap-x-10 gap-y-7">
            <Slider
              label="Monthly revenue per store"
              sublabel="Average across your estate"
              value={revenuePerStore}
              min={5_000}
              max={500_000}
              step={5_000}
              format={v => `£${fmt(v)}`}
              onChange={setRevenuePerStore}
            />
            <Slider
              label="Stores monitored"
              sublabel="Total stores in your network"
              value={stores}
              min={1}
              max={2_000}
              step={1}
              format={v => fmt(v)}
              onChange={setStores}
            />
            <Slider
              label="Revenue loss per 1% non-compliance"
              sublabel="Industry avg: 0.5%"
              value={revenueMultiplier}
              min={0.1}
              max={5}
              step={0.1}
              format={v => `${v.toFixed(1)}%`}
              onChange={setRevenueMultiplier}
            />
            <Slider
              label="Traditional audit cost / store / quarter"
              sublabel="Field rep or agency cost"
              value={auditCostPerStore}
              min={50}
              max={500}
              step={10}
              format={v => `£${fmt(v)}`}
              onChange={setAuditCostPerStore}
            />
            <Slider
              label="Compliance score today"
              sublabel="Your estimated current score"
              value={beforeScore}
              min={40}
              max={90}
              step={1}
              format={v => `${v}%`}
              onChange={setBeforeScore}
            />
            <Slider
              label="Expected score with Mosaic"
              sublabel="Typical improvement: +15-20pp"
              value={afterScore}
              min={50}
              max={100}
              step={1}
              format={v => `${v}%`}
              onChange={setAfterScore}
            />
          </div>
        </div>

        {/* ── Chart ── */}
        <div
          className="rounded-3xl p-8 mb-8 border"
          style={{ background: '#0c0c18', borderColor: '#222240' }}
        >
          <h2 className="text-lg font-bold text-white mb-1">12-Month Trajectory</h2>
          <p className="text-sm text-[#b0b0d0] mb-6">Revenue protected grows as compliance improves</p>

          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 24, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="pubWithout" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4d6d" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pubWith" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c6df5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c6df5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1a1a30" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#b0b0d0', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="rev"
                orientation="left"
                tick={{ fill: '#b0b0d0', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => fmtGBP(v)}
                width={60}
              />
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
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(v) => <span style={{ color: '#b0b0d0' }}>{v}</span>}
              />
              <Area
                yAxisId="rev"
                type="monotone"
                dataKey="withoutMosaic"
                name="Revenue at risk (before)"
                stroke="#ff4d6d"
                strokeWidth={1.5}
                fill="url(#pubWithout)"
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
                fill="url(#pubWith)"
                dot={false}
              />
              <Line
                yAxisId="score"
                type="monotone"
                dataKey="score"
                name="Compliance score"
                stroke="#00e096"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#00e096', stroke: '#030305', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ── Cost comparison ── */}
        <div
          className="rounded-3xl p-8 mb-10 border"
          style={{ background: '#0c0c18', borderColor: '#222240' }}
        >
          <h2 className="text-lg font-bold text-white mb-6">Annual Cost Comparison</h2>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2.5">
                <span className="text-[#b0b0d0] font-medium">Without Mosaic (traditional audits)</span>
                <span className="font-bold text-white">{fmtGBP(calcs.traditionalCost)}</span>
              </div>
              <div className="h-5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: '100%', background: 'linear-gradient(90deg, #ff4d6d, #ff6b9d)' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2.5">
                <span className="text-[#b0b0d0] font-medium">With Mosaic</span>
                <span className="font-bold text-white">{fmtGBP(calcs.mosaicCost)}</span>
              </div>
              <div className="h-5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (calcs.mosaicCost / calcs.traditionalCost) * 100)}%`,
                    background: 'linear-gradient(90deg, #7c6df5, #00d4d4)',
                  }}
                />
              </div>
            </div>

            <div
              className="flex items-center justify-between pt-4 border-t"
              style={{ borderColor: '#222240' }}
            >
              <span className="text-[#b0b0d0] font-medium">You save on audit costs alone</span>
              <span
                className="text-2xl font-black"
                style={{ color: calcs.costSavings >= 0 ? '#00e096' : '#ff4d6d' }}
              >
                {calcs.costSavings >= 0 ? '+' : ''}{fmtGBP(calcs.costSavings)}
              </span>
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div
          className="rounded-3xl p-10 mb-8 text-center border"
          style={{
            background: 'linear-gradient(135deg, #7c6df510, #00d4d408)',
            borderColor: '#7c6df530',
          }}
        >
          <h2 className="text-3xl font-black mb-3">
            Ready to see your real numbers?
          </h2>
          <p className="text-[#b0b0d0] mb-8 max-w-md mx-auto">
            Connect your store data and get a verified ROI analysis — not an estimate.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-white text-base transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c6df5, #00d4d4)' }}
            >
              See Your Real Numbers
              <ArrowRight size={18} />
            </Link>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border font-semibold text-[#b0b0d0] hover:text-white transition-colors text-sm"
              style={{ borderColor: '#333360' }}
            >
              <Download size={15} />
              Download Estimate
            </button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center text-xs text-[#b0b0d0]/50">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c6df5, #00d4d4)' }}
            >
              <Zap size={10} className="text-white" />
            </div>
            <span className="font-semibold text-[#b0b0d0]/70">Powered by Mosaic</span>
          </div>
          <p>Estimates based on industry benchmarks. Actual results depend on your specific data.</p>
        </div>
      </div>
    </div>
  )
}
