'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, MapPin, Building2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface Store {
  id: string
  name: string
  address: string | null
  city: string | null
  postcode: string | null
  retailer: string | null
}

interface AuditEntry {
  submission_id: string
  campaign_name: string
  submitted_at: string
  score: number | null
  is_compliant: boolean | null
  findings: unknown
  summary: string | null
  photo_url: string | null
  collector_display: string
}

interface Health {
  health_score: number | null
  trend: string | null
  total_audits: number
  last_audit_date: string | null
  avg_score_30d: number | null
  avg_score_90d: number | null
}

interface Props {
  store: Store
  auditHistory: AuditEntry[]
  health: Health | null
}

function scoreColor(score: number | null): string {
  if (score === null) return '#b0b0d0'
  if (score >= 80) return '#00e096'
  if (score >= 60) return '#ffc947'
  return '#ff6b9d'
}

function HealthRing({ score }: { score: number | null }) {
  const size = 120
  const stroke = 8
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = score !== null ? Math.min(100, Math.max(0, score)) : 0
  const dash = (pct / 100) * circ
  const color = scoreColor(score)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#222240" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div className="relative text-center">
        <div className="text-3xl font-black" style={{ color }}>
          {score !== null ? Math.round(score) : '—'}
        </div>
        {score !== null && <div className="text-[10px] text-[#b0b0d0]">/ 100</div>}
      </div>
    </div>
  )
}

function TrendIndicator({ trend }: { trend: string | null }) {
  if (trend === 'improving') {
    return (
      <span className="flex items-center gap-1 text-[#00e096] font-semibold text-sm">
        ↑ Improving
      </span>
    )
  }
  if (trend === 'declining') {
    return (
      <span className="flex items-center gap-1 text-[#ff6b9d] font-semibold text-sm">
        ↓ Declining
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[#b0b0d0] font-semibold text-sm">
      → Stable
    </span>
  )
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)

  const findings: string[] = Array.isArray(entry.findings)
    ? entry.findings
    : typeof entry.findings === 'object' && entry.findings !== null
    ? Object.values(entry.findings as Record<string, string>)
    : []

  const color = scoreColor(entry.score)

  return (
    <div className="border-b border-[#222240] last:border-0">
      <div className="flex items-center gap-4 px-6 py-4">
        {/* Photo thumbnail */}
        <div
          className="w-20 h-20 rounded-xl overflow-hidden bg-[#030305] flex-shrink-0 cursor-pointer border border-[#222240] hover:border-[#7c6df5]/50 transition-colors"
          onClick={() => entry.photo_url && setPhotoOpen(true)}
        >
          {entry.photo_url ? (
            <img src={entry.photo_url} alt="Audit" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#b0b0d0] text-xs text-center p-1">
              No photo
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-semibold text-sm truncate">{entry.campaign_name}</span>
            {/* Score badge */}
            {entry.score !== null ? (
              <span
                className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                style={{ background: `${color}20`, color }}
              >
                {entry.is_compliant ? <CheckCircle size={10} /> : <XCircle size={10} />}
                {Math.round(entry.score)}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg bg-[#222240] text-[#b0b0d0] flex-shrink-0">
                <Clock size={10} /> Pending
              </span>
            )}
          </div>
          <div className="text-xs text-[#b0b0d0]">
            {entry.submitted_at
              ? format(new Date(entry.submitted_at), 'd MMM yyyy, HH:mm')
              : '—'}
            {' · '}
            {entry.collector_display}
          </div>
          {entry.summary && (
            <p className="text-xs text-[#b0b0d0] mt-1 line-clamp-2">{entry.summary}</p>
          )}
        </div>

        {/* Expand findings */}
        {findings.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-[#b0b0d0] hover:text-white transition-colors flex-shrink-0"
          >
            {findings.length} finding{findings.length !== 1 ? 's' : ''}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Expanded findings */}
      {expanded && findings.length > 0 && (
        <div className="px-6 pb-4">
          <ul className="bg-[#030305] border border-[#222240] rounded-xl p-4 space-y-2">
            {findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#b0b0d0]">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7c6df5] flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Photo lightbox */}
      {photoOpen && entry.photo_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPhotoOpen(false)}
        >
          <img
            src={entry.photo_url}
            alt="Audit photo"
            className="max-w-3xl max-h-[90vh] rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0c0c18] border border-[#222240] rounded-xl px-3 py-2 text-xs">
      <div className="text-[#b0b0d0] mb-0.5">{label}</div>
      <div className="text-white font-bold">{payload[0].value} / 100</div>
    </div>
  )
}

export default function StoreDetailClient({ store, auditHistory, health }: Props) {
  const router = useRouter()

  const chartData = [...auditHistory]
    .reverse()
    .filter(e => e.score !== null)
    .map((e, i) => ({
      index: i + 1,
      label: e.submitted_at ? format(new Date(e.submitted_at), 'dd MMM') : `#${i + 1}`,
      score: e.score !== null ? Math.round(e.score) : null,
    }))

  const healthScore = health?.health_score ? Number(health.health_score) : null

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-[#b0b0d0] text-sm mb-3">
            <a href="/stores" className="hover:text-white transition-colors">Stores</a>
            <span>/</span>
            <span className="text-white">{store.name}</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">{store.name}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-[#b0b0d0]">
            {store.address && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {store.address}
                {store.city ? `, ${store.city}` : ''}
                {store.postcode ? ` ${store.postcode}` : ''}
              </span>
            )}
            {store.retailer && (
              <span className="flex items-center gap-1">
                <Building2 size={13} />
                {store.retailer}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl border border-[#222240] text-[#b0b0d0] hover:text-white hover:border-[#7c6df5]/50 transition-colors text-sm font-medium"
        >
          ← Back
        </button>
      </div>

      {/* Hero: health score + stats */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-8 flex-wrap">
          {/* Score ring */}
          <div className="flex flex-col items-center gap-2">
            <HealthRing score={healthScore} />
            <div className="text-xs text-[#b0b0d0]">Health Score</div>
            <TrendIndicator trend={health?.trend ?? null} />
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Audits',
                value: health?.total_audits?.toString() ?? '0',
                color: '#7c6df5',
              },
              {
                label: 'Last Audit',
                value: health?.last_audit_date
                  ? formatDistanceToNow(new Date(health.last_audit_date), { addSuffix: true })
                  : '—',
                color: '#00d4d4',
              },
              {
                label: '30d Avg Score',
                value: health?.avg_score_30d != null ? `${health.avg_score_30d}` : '—',
                color: scoreColor(health?.avg_score_30d ?? null),
              },
              {
                label: '90d Avg Score',
                value: health?.avg_score_90d != null ? `${health.avg_score_90d}` : '—',
                color: scoreColor(health?.avg_score_90d ?? null),
              },
            ].map(stat => (
              <div
                key={stat.label}
                className="bg-[#030305] border border-[#222240] rounded-xl p-4"
              >
                <div className="text-2xl font-black" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-xs text-[#b0b0d0] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score trend chart */}
      {chartData.length > 1 && (
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Score Trend</h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#222240" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#b0b0d0', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#b0b0d0', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#7c6df5"
                strokeWidth={2}
                dot={{ fill: '#7c6df5', r: 3, strokeWidth: 0 }}
                activeDot={{ fill: '#00d4d4', r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Audit history */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#222240] flex items-center justify-between">
          <h2 className="font-bold text-white">Audit History</h2>
          <span className="text-xs text-[#b0b0d0]">
            {auditHistory.length} audit{auditHistory.length !== 1 ? 's' : ''}
          </span>
        </div>

        {auditHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock size={32} className="text-[#b0b0d0] opacity-30 mb-3" />
            <p className="text-[#b0b0d0] text-sm">No audits recorded for this store yet.</p>
          </div>
        ) : (
          <div>
            {auditHistory.map(entry => (
              <AuditRow key={entry.submission_id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
