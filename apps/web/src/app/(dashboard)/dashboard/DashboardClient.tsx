'use client'
import { useCallback, useEffect, useRef, useState, memo } from 'react'
import {
  TrendingUp, TrendingDown, Store, CheckCircle,
  Clock, BarChart3, ExternalLink, Image as ImageIcon,
  ZoomIn, ZoomOut, Maximize2, X, Layers, Pin,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO, formatDistanceToNowStrict } from 'date-fns'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'

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
  last_audit_date?: string | null
  submission_count: number
  territory_id?: string | null
  territory_name?: string | null
  territory_color?: string | null
}

interface CampaignOverview {
  campaign_id: string
  campaign_name: string
  status: string
  store_count: number
  submitted_count: number
  scored_count: number
  avg_score: number | null
  compliant_pct: number | null
  last_submission_at: string | null
  open_tasks: number
}

interface Props {
  campaigns: CampaignOverview[]
  submissions: any[]
  trend: TrendPoint[]
  mapData: StoreMapPoint[]
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = memo(function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as TrendPoint
  return (
    <div className="bg-[#0c0c18] border border-[#222240] rounded-xl px-4 py-3 text-xs shadow-xl">
      <div className="text-[#b0b0d0] mb-1">{label}</div>
      <div className="text-white font-bold text-sm">{Math.round(d?.avg_score ?? 0)}% avg score</div>
      <div className="text-[#7c6df5]">{d?.compliant ?? 0} / {d?.total ?? 0} compliant</div>
    </div>
  )
})

// ─── Score → color helpers ────────────────────────────────────────────────────
function scoreColor(score: number | null, isCompliant: boolean | null): string {
  if (score === null) return '#b0b0d0'
  if (score >= 80) return '#00e096'
  if (score >= 60) return '#ffc947'
  return '#ff4d6d'
}

function scoreToHeatColor(score: number | null): string {
  if (score === null) return '#7c6df5'
  if (score >= 80) return '#00e096'
  if (score >= 60) return '#ffc947'
  return '#ff4d6d'
}

// ─── Store detail tooltip (hover card) ────────────────────────────────────────
function StoreTooltip({
  store,
  x,
  y,
  svgW,
  svgH,
}: {
  store: StoreMapPoint
  x: number
  y: number
  svgW: number
  svgH: number
}) {
  const W_CARD = 180
  const H_CARD = 100
  const PAD = 8
  // Offset from pin, clamp to SVG boundaries
  let tx = x + 12
  let ty = y - H_CARD / 2
  if (tx + W_CARD > svgW - PAD) tx = x - W_CARD - 12
  if (ty < PAD) ty = PAD
  if (ty + H_CARD > svgH - PAD) ty = svgH - H_CARD - PAD

  const score = store.latest_score != null ? `${Math.round(store.latest_score)}%` : 'No data'
  const auditDate = store.last_audit_date
    ? (() => { try { return format(parseISO(store.last_audit_date!), 'MMM d, yyyy') } catch { return store.last_audit_date! } })()
    : 'Never audited'
  const col = scoreColor(store.latest_score, store.is_compliant)

  return (
    <foreignObject x={tx} y={ty} width={W_CARD} height={H_CARD} style={{ overflow: 'visible' }}>
      <div
        style={{
          background: '#0c0c18',
          border: '1px solid #333360',
          borderRadius: 10,
          padding: '8px 10px',
          fontSize: 11,
          color: '#fff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
          width: W_CARD,
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 4, lineHeight: 1.3 }}>{store.store_name}</div>
        <div style={{ color: col, fontWeight: 700, marginBottom: 2 }}>Score: {score}</div>
        <div style={{ color: '#b0b0d0', marginBottom: 6 }}>Last audit: {auditDate}</div>
        <a
          href={`/stores/${store.store_id}`}
          style={{ color: '#a89cf7', fontWeight: 600, textDecoration: 'none', pointerEvents: 'auto' }}
        >
          View store →
        </a>
      </div>
    </foreignObject>
  )
}

// ─── SVG Store Map ────────────────────────────────────────────────────────────
const StoreSvgMap = memo(function StoreSvgMap({
  stores,
  viewMode,
  displayMode,
  zoom,
}: {
  stores: StoreMapPoint[]
  viewMode: 'compliance' | 'territory'
  displayMode: 'pins' | 'heatmap'
  zoom: number
}) {
  const W = 800
  const H = 340
  const PAD = 32
  const [hoveredStore, setHoveredStore] = useState<StoreMapPoint | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const lats = stores.map(s => s.lat).filter(Boolean)
  const lngs = stores.map(s => s.lng).filter(Boolean)

  const minLat = lats.length ? Math.min(...lats) : 51.3
  const maxLat = lats.length ? Math.max(...lats) : 51.7
  const minLng = lngs.length ? Math.min(...lngs) : -0.35
  const maxLng = lngs.length ? Math.max(...lngs) : 0.15

  const latRange = maxLat - minLat || 0.4
  const lngRange = maxLng - minLng || 0.5

  function project(lat: number, lng: number) {
    const x = PAD + ((lng - minLng) / lngRange) * (W - PAD * 2)
    const y = PAD + ((maxLat - lat) / latRange) * (H - PAD * 2)
    return { x, y }
  }

  const territoriesInView = Array.from(
    new Map(
      stores
        .filter(s => s.territory_id)
        .map(s => [s.territory_id, { id: s.territory_id!, name: s.territory_name ?? 'Unknown', color: s.territory_color ?? '#7c6df5' }])
    ).values()
  ).slice(0, 5)

  // Build unique radial gradient defs for heatmap
  const gradientDefs = displayMode === 'heatmap' ? stores.map(s => {
    const col = scoreToHeatColor(s.latest_score)
    return (
      <radialGradient key={`grad-${s.store_id}`} id={`grad-${s.store_id}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={col} stopOpacity={0.55} />
        <stop offset="60%" stopColor={col} stopOpacity={0.18} />
        <stop offset="100%" stopColor={col} stopOpacity={0} />
      </radialGradient>
    )
  }) : []

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-xl"
      style={{
        background: '#030305',
        border: '1px solid #222240',
        transform: `scale(${zoom})`,
        transformOrigin: 'center center',
        transition: 'transform 0.2s ease',
      }}
    >
      <defs>{gradientDefs}</defs>

      {/* Grid */}
      {[0.25, 0.5, 0.75].map(f => (
        <g key={f}>
          <line x1={PAD} y1={PAD + f * (H - PAD * 2)} x2={W - PAD} y2={PAD + f * (H - PAD * 2)} stroke="#222240" strokeWidth="1" />
          <line x1={PAD + f * (W - PAD * 2)} y1={PAD} x2={PAD + f * (W - PAD * 2)} y2={H - PAD} stroke="#222240" strokeWidth="1" />
        </g>
      ))}

      {/* Stores */}
      {stores.map(s => {
        const { x, y } = project(s.lat, s.lng)
        const R = 40 // heatmap blob radius

        if (displayMode === 'heatmap') {
          return (
            <g key={s.store_id}
              onMouseEnter={() => { setHoveredStore(s); setTooltipPos({ x, y }) }}
              onMouseLeave={() => setHoveredStore(null)}
              style={{ cursor: 'pointer' }}
            >
              <ellipse
                cx={x} cy={y}
                rx={R} ry={R * 0.65}
                fill={`url(#grad-${s.store_id})`}
              />
            </g>
          )
        }

        // Pin mode
        let color: string
        if (viewMode === 'territory') {
          color = s.territory_color ?? '#606080'
        } else {
          color = scoreColor(s.latest_score, s.is_compliant)
        }

        return (
          <g key={s.store_id}
            onMouseEnter={() => { setHoveredStore(s); setTooltipPos({ x, y }) }}
            onMouseLeave={() => setHoveredStore(null)}
            style={{ cursor: 'pointer' }}
          >
            <circle cx={x} cy={y} r={9} fill={color} opacity={0.15} />
            <circle cx={x} cy={y} r={5} fill={color} opacity={0.85} />
          </g>
        )
      })}

      {/* Hover tooltip */}
      {hoveredStore && (
        <StoreTooltip
          store={hoveredStore}
          x={tooltipPos.x}
          y={tooltipPos.y}
          svgW={W}
          svgH={H}
        />
      )}

      {/* Legend */}
      {displayMode === 'pins' && viewMode === 'compliance' && (
        <g transform={`translate(${W - PAD - 190}, ${H - PAD - 10})`}>
          <circle cx={6} cy={0} r={5} fill="#00e096" opacity={0.85} />
          <text x={14} y={4} fill="#b0b0d0" fontSize={11}>≥80 Compliant</text>
          <circle cx={96} cy={0} r={5} fill="#ffc947" opacity={0.85} />
          <text x={104} y={4} fill="#b0b0d0" fontSize={11}>60-79</text>
          <circle cx={6} cy={18} r={5} fill="#ff4d6d" opacity={0.85} />
          <text x={14} y={22} fill="#b0b0d0" fontSize={11}>&lt;60 At-risk</text>
          <circle cx={96} cy={18} r={5} fill="#b0b0d0" opacity={0.85} />
          <text x={104} y={22} fill="#b0b0d0" fontSize={11}>Unaudited</text>
        </g>
      )}
      {displayMode === 'pins' && viewMode === 'territory' && (
        <g transform={`translate(${PAD}, ${H - PAD - 10})`}>
          {territoriesInView.map((t, i) => (
            <g key={t.id} transform={`translate(${i * 110}, 0)`}>
              <circle cx={6} cy={0} r={5} fill={t.color} opacity={0.85} />
              <text x={14} y={4} fill="#b0b0d0" fontSize={11}>{t.name.slice(0, 10)}</text>
            </g>
          ))}
          {stores.some(s => !s.territory_id) && (
            <g transform={`translate(${territoriesInView.length * 110}, 0)`}>
              <circle cx={6} cy={0} r={5} fill="#606080" opacity={0.85} />
              <text x={14} y={4} fill="#b0b0d0" fontSize={11}>Unassigned</text>
            </g>
          )}
        </g>
      )}
      {displayMode === 'heatmap' && (
        <g transform={`translate(${W - PAD - 190}, ${H - PAD - 10})`}>
          <circle cx={6} cy={0} r={6} fill="#00e096" opacity={0.6} />
          <text x={16} y={4} fill="#b0b0d0" fontSize={11}>≥80% compliant</text>
          <circle cx={116} cy={0} r={6} fill="#ffc947" opacity={0.6} />
          <text x={126} y={4} fill="#b0b0d0" fontSize={11}>60-79%</text>
          <circle cx={6} cy={18} r={6} fill="#ff4d6d" opacity={0.6} />
          <text x={16} y={22} fill="#b0b0d0" fontSize={11}>&lt;60% at-risk</text>
        </g>
      )}

      {stores.length === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="#b0b0d0" fontSize={14}>
          No store location data available
        </text>
      )}
    </svg>
  )
})

// ─── Map Controls Panel ───────────────────────────────────────────────────────
function MapControls({
  campaigns,
  selectedCampaign,
  onCampaignChange,
  statusFilter,
  onStatusChange,
  scoreThreshold,
  onScoreChange,
  displayMode,
  onDisplayModeChange,
  viewMode,
  onViewModeChange,
  zoom,
  onZoomIn,
  onZoomOut,
}: {
  campaigns: CampaignOverview[]
  selectedCampaign: string
  onCampaignChange: (v: string) => void
  statusFilter: string
  onStatusChange: (v: string) => void
  scoreThreshold: number
  onScoreChange: (v: number) => void
  displayMode: 'pins' | 'heatmap'
  onDisplayModeChange: (v: 'pins' | 'heatmap') => void
  viewMode: 'compliance' | 'territory'
  onViewModeChange: (v: 'compliance' | 'territory') => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Campaign filter */}
      <select
        value={selectedCampaign}
        onChange={e => onCampaignChange(e.target.value)}
        className="bg-[#030305] border border-[#222240] text-[#b0b0d0] text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#7c6df5]"
      >
        <option value="">All campaigns</option>
        {campaigns.map(c => (
          <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={e => onStatusChange(e.target.value)}
        className="bg-[#030305] border border-[#222240] text-[#b0b0d0] text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#7c6df5]"
      >
        <option value="all">All statuses</option>
        <option value="compliant">Compliant only</option>
        <option value="non_compliant">Non-compliant only</option>
        <option value="unaudited">Unaudited only</option>
      </select>

      {/* Score threshold slider */}
      <div className="flex items-center gap-2">
        <span className="text-[#b0b0d0] text-xs whitespace-nowrap">Below:</span>
        <input
          type="range"
          min={50}
          max={100}
          value={scoreThreshold}
          onChange={e => onScoreChange(parseInt(e.target.value, 10))}
          className="w-24 accent-[#7c6df5]"
        />
        <span className="text-[#7c6df5] text-xs font-bold w-8">{scoreThreshold}%</span>
      </div>

      {/* Display mode toggle: Pins | Heatmap */}
      <div className="flex items-center gap-1 bg-[#030305] border border-[#222240] rounded-xl p-1">
        <button
          onClick={() => onDisplayModeChange('pins')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
          style={displayMode === 'pins' ? { background: '#7c6df5', color: '#fff' } : { color: '#b0b0d0' }}
        >
          <Pin size={10} />
          Pins
        </button>
        <button
          onClick={() => onDisplayModeChange('heatmap')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
          style={displayMode === 'heatmap' ? { background: '#7c6df5', color: '#fff' } : { color: '#b0b0d0' }}
        >
          <Layers size={10} />
          Heatmap
        </button>
      </div>

      {/* Compliance | Territory toggle */}
      <div className="flex items-center gap-1 bg-[#030305] border border-[#222240] rounded-xl p-1">
        <button
          onClick={() => onViewModeChange('compliance')}
          className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
          style={viewMode === 'compliance' ? { background: '#444460', color: '#fff' } : { color: '#b0b0d0' }}
        >
          Compliance
        </button>
        <button
          onClick={() => onViewModeChange('territory')}
          className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
          style={viewMode === 'territory' ? { background: '#444460', color: '#fff' } : { color: '#b0b0d0' }}
        >
          Territory
        </button>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={onZoomOut}
          className="w-7 h-7 flex items-center justify-center bg-[#030305] border border-[#222240] rounded-lg text-[#b0b0d0] hover:border-[#7c6df5] hover:text-white transition-colors"
        >
          <ZoomOut size={12} />
        </button>
        <button
          onClick={onZoomIn}
          className="w-7 h-7 flex items-center justify-center bg-[#030305] border border-[#222240] rounded-lg text-[#b0b0d0] hover:border-[#7c6df5] hover:text-white transition-colors"
        >
          <ZoomIn size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Full-screen map modal ────────────────────────────────────────────────────
function MapModal({
  open,
  onClose,
  stores,
  totalStores,
  campaigns,
  selectedCampaign,
  onCampaignChange,
  statusFilter,
  onStatusChange,
  scoreThreshold,
  onScoreChange,
  displayMode,
  onDisplayModeChange,
  viewMode,
  onViewModeChange,
}: {
  open: boolean
  onClose: () => void
  stores: StoreMapPoint[]
  totalStores: number
  campaigns: CampaignOverview[]
  selectedCampaign: string
  onCampaignChange: (v: string) => void
  statusFilter: string
  onStatusChange: (v: string) => void
  scoreThreshold: number
  onScoreChange: (v: number) => void
  displayMode: 'pins' | 'heatmap'
  onDisplayModeChange: (v: 'pins' | 'heatmap') => void
  viewMode: 'compliance' | 'territory'
  onViewModeChange: (v: 'compliance' | 'territory') => void
}) {
  const [modalZoom, setModalZoom] = useState(1)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(3,3,5,0.92)',
        display: 'flex',
        flexDirection: 'column',
        padding: 24,
      }}
    >
      {/* Modal header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-white">Store Coverage Map</h2>
          <p className="text-[#b0b0d0] text-sm mt-0.5">
            Showing {stores.length} of {totalStores} stores
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center bg-[#0c0c18] border border-[#222240] rounded-xl text-[#b0b0d0] hover:border-[#ff4d6d] hover:text-[#ff4d6d] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Controls */}
      <MapControls
        campaigns={campaigns}
        selectedCampaign={selectedCampaign}
        onCampaignChange={onCampaignChange}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        scoreThreshold={scoreThreshold}
        onScoreChange={onScoreChange}
        displayMode={displayMode}
        onDisplayModeChange={onDisplayModeChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        zoom={modalZoom}
        onZoomIn={() => setModalZoom(z => Math.min(z + 0.2, 3))}
        onZoomOut={() => setModalZoom(z => Math.max(z - 0.2, 0.5))}
      />

      {/* Map — fills remaining space */}
      <div className="flex-1 overflow-hidden rounded-2xl" style={{ minHeight: 0 }}>
        <StoreSvgMap
          stores={stores}
          viewMode={viewMode}
          displayMode={displayMode}
          zoom={modalZoom}
        />
      </div>
    </div>
  )
}

// ─── Misc UI helpers ──────────────────────────────────────────────────────────
function LiveDot({ connected }: { connected: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: connected ? '#00e096' : '#555577',
        animation: connected ? 'mosaic-pulse 1.8s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }}
    />
  )
}

function MiniScoreRing({ score, compliantPct }: { score: number | null; compliantPct: number | null }) {
  const size = 48
  const stroke = 4
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = compliantPct !== null ? Math.min(100, Math.max(0, compliantPct)) : 0
  const dash = (pct / 100) * circ
  const color = compliantPct === null ? '#555577' : compliantPct >= 80 ? '#00e096' : compliantPct >= 50 ? '#ffc947' : '#ff4d6d'
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#222240" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="relative text-center">
        <div className="text-[10px] font-black leading-none" style={{ color }}>
          {compliantPct !== null ? `${Math.round(compliantPct)}` : '—'}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    active:    { label: 'Active',    color: '#00e096', bg: 'rgba(0,224,150,0.12)' },
    draft:     { label: 'Draft',     color: '#b0b0d0', bg: 'rgba(176,176,208,0.10)' },
    paused:    { label: 'Paused',    color: '#ffc947', bg: 'rgba(255,201,71,0.12)' },
    completed: { label: 'Completed', color: '#7c6df5', bg: 'rgba(124,109,245,0.12)' },
  }
  const s = map[status] ?? { label: status, color: '#b0b0d0', bg: 'rgba(176,176,208,0.10)' }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'No activity'
  try { return formatDistanceToNowStrict(new Date(iso), { addSuffix: true }) }
  catch { return iso }
}

const CampaignCard = memo(function CampaignCard({ c }: { c: CampaignOverview }) {
  const compliantPct = c.compliant_pct ?? null
  const progressColor = compliantPct === null ? '#555577'
    : compliantPct >= 80 ? '#00e096'
    : compliantPct >= 50 ? '#ffc947'
    : '#ff4d6d'

  return (
    <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-4 flex flex-col gap-3 hover:border-[#7c6df5]/40 transition-colors max-w-sm w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm leading-tight truncate">{c.campaign_name}</div>
          <div className="mt-1"><StatusBadge status={c.status} /></div>
        </div>
        <MiniScoreRing score={c.avg_score} compliantPct={compliantPct} />
      </div>
      <div className="grid grid-cols-4 gap-1 text-center">
        {[
          { label: 'Stores',     value: c.store_count },
          { label: 'Submitted',  value: c.submitted_count },
          { label: 'Scored',     value: c.scored_count },
          { label: 'Open Tasks', value: c.open_tasks },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#030305] rounded-xl p-2">
            <div className="text-white font-black text-base leading-none">{value}</div>
            <div className="text-[#b0b0d0] text-[9px] mt-0.5 leading-tight">{label}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[#b0b0d0] text-xs">Compliant</span>
          <span className="text-xs font-bold" style={{ color: progressColor }}>
            {compliantPct !== null ? `${Math.round(compliantPct)}%` : '—'}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[#222240] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${compliantPct ?? 0}%`, background: progressColor }} />
        </div>
      </div>
      <div className="text-[#b0b0d0] text-xs flex items-center gap-1">
        <Clock size={10} className="flex-shrink-0" />
        {relativeTime(c.last_submission_at)}
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-[#222240]">
        <a href={`/campaigns/${c.campaign_id}`} className="flex-1 flex items-center justify-center gap-1.5 bg-[#7c6df5]/15 border border-[#7c6df5]/30 hover:bg-[#7c6df5]/25 text-[#a89cf7] text-xs font-semibold py-1.5 rounded-xl transition-colors">
          <ExternalLink size={11} /> View
        </a>
        <a href={`/gallery?campaign=${c.campaign_id}`} className="flex-1 flex items-center justify-center gap-1.5 bg-[#222240] hover:bg-[#2a2a50] text-[#b0b0d0] text-xs font-semibold py-1.5 rounded-xl transition-colors">
          <ImageIcon size={11} /> Gallery
        </a>
      </div>
    </div>
  )
})

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function DashboardClient({ campaigns, submissions, trend, mapData }: Props) {
  const [mapViewMode, setMapViewMode] = useState<'compliance' | 'territory'>('compliance')
  const [mapDisplayMode, setMapDisplayMode] = useState<'pins' | 'heatmap'>('pins')
  const [zoom, setZoom] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)

  // Filter state
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [scoreThreshold, setScoreThreshold] = useState(100)
  const [filteredStores, setFilteredStores] = useState<StoreMapPoint[]>(mapData)
  const [isLoadingMap, setIsLoadingMap] = useState(false)

  // Realtime
  const { rows: liveSubmissions, isConnected } = useRealtimeTable<any>('submissions')
  const [liveCount, setLiveCount] = useState(0)
  const [showNewBadge, setShowNewBadge] = useState(false)
  const badgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const prevLiveLen = useRef(0)
  useEffect(() => {
    const incoming = liveSubmissions.length - prevLiveLen.current
    if (incoming > 0) {
      setLiveCount(c => c + incoming)
      setShowNewBadge(true)
      if (badgeTimerRef.current) clearTimeout(badgeTimerRef.current)
      badgeTimerRef.current = setTimeout(() => setShowNewBadge(false), 3000)
    }
    prevLiveLen.current = liveSubmissions.length
  }, [liveSubmissions])

  // Fetch filtered map data from API
  const fetchMapData = useCallback(async () => {
    setIsLoadingMap(true)
    try {
      const params = new URLSearchParams()
      if (selectedCampaign) params.set('campaign_id', selectedCampaign)
      params.set('status', statusFilter)
      params.set('min_score', '0')
      params.set('max_score', scoreThreshold.toString())
      const res = await fetch(`/api/dashboard/map?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setFilteredStores(json.stores ?? [])
      }
    } catch (e) {
      console.error('[map] fetch error', e)
    } finally {
      setIsLoadingMap(false)
    }
  }, [selectedCampaign, statusFilter, scoreThreshold])

  // Re-fetch when filters change (debounced for slider)
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
    fetchTimerRef.current = setTimeout(fetchMapData, 300)
    return () => { if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current) }
  }, [fetchMapData])

  const mergedSubmissions = [...liveSubmissions, ...submissions].slice(0, 20)
  const totalSubmissions = mergedSubmissions.length
  const compliant = mergedSubmissions.filter(s => s.compliance_results?.[0]?.is_compliant).length
  const score = totalSubmissions > 0 ? Math.round((compliant / totalSubmissions) * 100) : 0

  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const totalStores = campaigns.reduce((acc, c) => acc + (c.store_count ?? 0), 0)
  const portfolioCompliance = (() => {
    const withData = campaigns.filter(c => c.compliant_pct !== null)
    if (!withData.length) return null
    return Math.round(withData.reduce((acc, c) => acc + (c.compliant_pct ?? 0), 0) / withData.length)
  })()

  const stats = [
    { label: 'Compliance Score', value: `${score}%`,           delta: '+3.2%',        icon: CheckCircle, color: '#00e096' },
    { label: 'Stores Audited',   value: totalSubmissions.toString(), delta: '+18 today', icon: Store,       color: '#7c6df5' },
    { label: 'Active Campaigns', value: activeCampaigns.length.toString(), delta: '', icon: BarChart3,    color: '#00d4d4' },
    { label: 'Avg Delivery',     value: '28 min',              delta: 'vs 30 min SLA', icon: Clock,       color: '#ffc947' },
  ]

  const chartData = trend.map(t => ({
    ...t,
    dateLabel: (() => { try { return format(parseISO(t.date), 'MMM d') } catch { return t.date } })(),
    compliancePct: t.total > 0 ? Math.round((t.compliant / t.total) * 100) : 0,
  }))

  return (
    <div className="p-8">
      <style>{`
        @keyframes mosaic-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes mosaic-fadein { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Full-screen modal */}
      <MapModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        stores={filteredStores}
        totalStores={mapData.length}
        campaigns={campaigns}
        selectedCampaign={selectedCampaign}
        onCampaignChange={setSelectedCampaign}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        scoreThreshold={scoreThreshold}
        onScoreChange={setScoreThreshold}
        displayMode={mapDisplayMode}
        onDisplayModeChange={setMapDisplayMode}
        viewMode={mapViewMode}
        onViewModeChange={setMapViewMode}
      />

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

      {/* Portfolio Health */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#b0b0d0] uppercase tracking-wider">Portfolio Health</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-4xl font-black leading-none" style={{ color: portfolioCompliance === null ? '#b0b0d0' : portfolioCompliance >= 80 ? '#00e096' : portfolioCompliance >= 50 ? '#ffc947' : '#ff4d6d' }}>
                {portfolioCompliance !== null ? `${portfolioCompliance}%` : '—'}
              </div>
              <div className="text-[#b0b0d0] text-xs mt-1">Overall Compliance</div>
            </div>
            <div className="flex items-center gap-1 bg-[#00e096]/10 px-2 py-1 rounded-lg">
              <TrendingUp size={12} className="text-[#00e096]" />
              <span className="text-[#00e096] text-xs font-bold">+4%</span>
            </div>
          </div>
          <div>
            <div className="text-4xl font-black text-white leading-none">{activeCampaigns.length}</div>
            <div className="text-[#b0b0d0] text-xs mt-1">Active Campaigns</div>
            <div className="flex items-center gap-1 mt-1"><TrendingUp size={11} className="text-[#7c6df5]" /><span className="text-[#7c6df5] text-xs">+1 this week</span></div>
          </div>
          <div>
            <div className="text-4xl font-black text-white leading-none">{totalStores}</div>
            <div className="text-[#b0b0d0] text-xs mt-1">Stores Monitored</div>
            <div className="flex items-center gap-1 mt-1"><TrendingUp size={11} className="text-[#00d4d4]" /><span className="text-[#00d4d4] text-xs">+12 vs last week</span></div>
          </div>
          <div>
            <div className="text-4xl font-black text-white leading-none">{campaigns.reduce((acc, c) => acc + (c.open_tasks ?? 0), 0)}</div>
            <div className="text-[#b0b0d0] text-xs mt-1">Open Tasks</div>
            <div className="flex items-center gap-1 mt-1"><TrendingDown size={11} className="text-[#ffc947]" /><span className="text-[#ffc947] text-xs">-5 vs last week</span></div>
          </div>
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

      {/* Campaign Cards */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">All Campaigns</h2>
          <span className="text-[#b0b0d0] text-sm">{campaigns.length} total</span>
        </div>
        {campaigns.length === 0 ? (
          <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-12 text-center">
            <BarChart3 size={40} className="mx-auto mb-3 text-[#b0b0d0] opacity-30" />
            <p className="text-[#b0b0d0]">No campaigns yet.</p>
            <a href="/campaigns/new" className="mt-4 inline-block bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white text-sm font-bold px-5 py-2 rounded-xl">
              Create your first campaign
            </a>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
            {campaigns.map((c) => (
              <div key={c.campaign_id} className="flex-shrink-0 w-72 sm:w-auto">
                <CampaignCard c={c} />
              </div>
            ))}
          </div>
        )}
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
          <div className="h-48 flex items-center justify-center text-[#b0b0d0] text-sm">No trend data available yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#222240" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fill: '#b0b0d0', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fill: '#b0b0d0', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} width={38} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#7c6df5', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Line type="monotone" dataKey="compliancePct" stroke="#7c6df5" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#7c6df5', stroke: '#0c0c18', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Store Coverage Map */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 mb-5">
        {/* Map header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Store Coverage</h2>
            <p className="text-[#b0b0d0] text-sm mt-0.5">Geographic distribution of audited stores</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Store count badge */}
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: '#7c6df520', color: '#a89cf7', border: '1px solid #7c6df540' }}>
              {isLoadingMap ? '…' : `${filteredStores.length} / ${mapData.length} stores`}
            </span>
            {/* Expand button */}
            <button
              onClick={() => setModalOpen(true)}
              className="w-8 h-8 flex items-center justify-center bg-[#030305] border border-[#222240] rounded-xl text-[#b0b0d0] hover:border-[#7c6df5] hover:text-white transition-colors"
              title="Expand map"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <MapControls
          campaigns={campaigns}
          selectedCampaign={selectedCampaign}
          onCampaignChange={setSelectedCampaign}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          scoreThreshold={scoreThreshold}
          onScoreChange={setScoreThreshold}
          displayMode={mapDisplayMode}
          onDisplayModeChange={setMapDisplayMode}
          viewMode={mapViewMode}
          onViewModeChange={setMapViewMode}
          zoom={zoom}
          onZoomIn={() => setZoom(z => Math.min(z + 0.2, 3))}
          onZoomOut={() => setZoom(z => Math.max(z - 0.2, 0.5))}
        />

        {/* Map */}
        <div style={{ overflow: 'hidden', borderRadius: 12 }}>
          <StoreSvgMap
            stores={filteredStores}
            viewMode={mapViewMode}
            displayMode={mapDisplayMode}
            zoom={zoom}
          />
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <h2 className="text-lg font-bold text-white">Recent Submissions</h2>
          <div className="flex items-center gap-1.5 bg-[#00e096]/10 border border-[#00e096]/25 rounded-full px-2.5 py-1">
            <LiveDot connected={isConnected} />
            <span className="text-[#00e096] text-xs font-bold">LIVE</span>
          </div>
          {showNewBadge && (
            <span style={{ animation: 'mosaic-fadein 0.25s ease', background: '#7c6df520', border: '1px solid #7c6df550', borderRadius: 999, padding: '2px 10px', color: '#a89cf7', fontSize: 12, fontWeight: 700 }}>
              +{liveCount} new
            </span>
          )}
        </div>
        <div className="space-y-3">
          {mergedSubmissions.slice(0, 8).map((s: any) => {
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
          {mergedSubmissions.length === 0 && (
            <p className="text-[#b0b0d0] text-sm text-center py-8">No submissions yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
