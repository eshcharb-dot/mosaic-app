'use client'
import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import Link from 'next/link'

interface Alert {
  id: string
  alert_name: string
  severity: 'critical' | 'warning' | 'info'
  payload: {
    summary?: string
    store_name?: string
    campaign_name?: string
    [key: string]: any
  }
  created_at: string
  is_read?: boolean
}

interface Campaign {
  id: string
  name: string
  status: string
}

interface SlaStatus {
  sla: {
    min_compliance_score: number
    audit_frequency_days: number
    response_time_hours: number
    target_compliant_pct: number
  }
  overdue_stores: number
  current_compliant_pct: number | null
  total_stores: number
  open_breaches: number
  is_meeting_sla: boolean | null
}

interface Props {
  alerts: Alert[]
  campaigns?: Campaign[]
  slaStatuses?: Record<string, SlaStatus>
}

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', bg: 'bg-[#ff4d6d]/10', border: 'border-[#ff4d6d]/30', text: 'text-[#ff4d6d]', dot: 'bg-[#ff4d6d]', hex: '#ff4d6d' },
  warning:  { label: 'Warning',  bg: 'bg-[#ffc947]/10', border: 'border-[#ffc947]/30', text: 'text-[#ffc947]', dot: 'bg-[#ffc947]', hex: '#ffc947' },
  info:     { label: 'Info',     bg: 'bg-[#00d4d4]/10', border: 'border-[#00d4d4]/30', text: 'text-[#00d4d4]', dot: 'bg-[#00d4d4]', hex: '#00d4d4' },
}

function timeAgo(iso: string) {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return iso
  }
}

// Toast banner for incoming realtime alerts
interface ToastProps {
  alert: Alert
  onDismiss: () => void
}
function AlertToast({ alert, onDismiss }: ToastProps) {
  const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info

  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      style={{
        animation: 'mosaic-slidein 0.3s ease',
        background: `${cfg.hex}14`,
        border: `1px solid ${cfg.hex}40`,
        borderRadius: 14,
        padding: '12px 16px',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: cfg.hex,
          flexShrink: 0,
          marginTop: 4,
          animation: 'mosaic-pulse 1.8s ease-in-out infinite',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: cfg.hex, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          New alert: {alert.alert_name}
        </span>
        {alert.payload?.summary && (
          <p style={{ color: '#b0b0d0', fontSize: 13, margin: '3px 0 0', lineHeight: 1.4 }}>
            {alert.payload.summary}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        style={{ color: '#b0b0d0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

export default function AlertsClient({ alerts: initialAlerts, campaigns = [], slaStatuses = {} }: Props) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all')
  const [campaignFilter, setCampaignFilter] = useState<string>('all')

  // Realtime subscription
  const { rows: liveRows, isConnected } = useRealtimeTable<Alert>('alert_events')
  const [toasts, setToasts] = useState<Alert[]>([])
  const prevLiveLen = useRef(0)

  useEffect(() => {
    const incoming = liveRows.length - prevLiveLen.current
    if (incoming > 0) {
      const newOnes = liveRows.slice(0, incoming)
      setToasts(prev => [...newOnes, ...prev])
    }
    prevLiveLen.current = liveRows.length
  }, [liveRows])

  function dismissToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Merge live rows (prepend) into initial server-fetched alerts
  const allAlerts: Alert[] = [...liveRows, ...initialAlerts]

  const filtered = allAlerts.filter(a => {
    if (filter !== 'all' && a.severity !== filter) return false
    if (campaignFilter !== 'all' && a.payload?.campaign_name) {
      const campaign = campaigns.find(c => c.id === campaignFilter)
      if (campaign && a.payload.campaign_name !== campaign.name) return false
    }
    return true
  })

  const filters: Array<{ key: 'all' | 'critical' | 'warning'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'warning', label: 'Warning' },
  ]

  const criticalCount = allAlerts.filter(a => a.severity === 'critical').length

  return (
    <div className="p-8 max-w-4xl">
      {/* Keyframes */}
      <style>{`
        @keyframes mosaic-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes mosaic-slidein {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Alerts</h1>
          <p className="text-[#b0b0d0] mt-1">Compliance violations and system notifications</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 border text-xs font-bold ${
              isConnected
                ? 'bg-[#00e096]/10 border-[#00e096]/25 text-[#00e096]'
                : 'bg-[#555577]/10 border-[#555577]/25 text-[#b0b0d0]'
            }`}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isConnected ? '#00e096' : '#555577',
                flexShrink: 0,
                animation: isConnected ? 'mosaic-pulse 1.8s ease-in-out infinite' : 'none',
                display: 'inline-block',
              }}
            />
            {isConnected ? 'Live' : 'Reconnecting…'}
          </div>

          {criticalCount > 0 && (
            <div className="flex items-center gap-2 bg-[#ff4d6d]/10 border border-[#ff4d6d]/25 rounded-full px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-[#ff4d6d] animate-pulse" />
              <span className="text-[#ff4d6d] text-sm font-bold">
                {criticalCount} Critical
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SLA Status overview */}
      {campaigns.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-[#b0b0d0] uppercase tracking-wider mb-3">SLA Status — Active Campaigns</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map(campaign => {
              const sla = slaStatuses[campaign.id]
              if (!sla) {
                return (
                  <Link
                    key={campaign.id}
                    href={`/campaigns/${campaign.id}`}
                    className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-4 hover:border-[#7c6df5]/40 transition-colors"
                  >
                    <div className="text-sm font-bold text-white mb-1 truncate">{campaign.name}</div>
                    <div className="text-xs text-[#b0b0d0]">No SLA configured</div>
                  </Link>
                )
              }

              const pct = sla.current_compliant_pct ?? 0
              const target = sla.sla?.target_compliant_pct ?? 90
              const isMet = sla.is_meeting_sla === true
              const isAtRisk = !isMet && pct >= target - 5
              const color = isMet ? '#00e096' : isAtRisk ? '#ffc947' : '#ff4d6d'
              const statusLabel = isMet ? 'MET \u2713' : isAtRisk ? 'AT RISK \u26a0' : 'BREACHED \u2717'

              return (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="bg-[#0c0c18] border rounded-2xl p-4 hover:opacity-80 transition-opacity"
                  style={{ borderColor: `${color}30` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-bold text-white truncate flex-1 mr-2">{campaign.name}</div>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#b0b0d0]">
                    <span>
                      <span className="font-bold" style={{ color }}>{pct ?? 0}%</span>
                      <span className="ml-1">compliant</span>
                    </span>
                    {sla.overdue_stores > 0 && (
                      <span className="text-[#ffc947] font-semibold">
                        {sla.overdue_stores} overdue
                      </span>
                    )}
                    {sla.open_breaches > 0 && (
                      <span className="text-[#ff4d6d] font-semibold">
                        {sla.open_breaches} breach{sla.open_breaches !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Toast banners for incoming realtime alerts */}
      {toasts.length > 0 && (
        <div className="mb-5">
          {toasts.map(t => (
            <AlertToast key={t.id} alert={t} onDismiss={() => dismissToast(t.id)} />
          ))}
        </div>
      )}

      {/* Campaign selector */}
      {campaigns.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-[#b0b0d0] font-semibold uppercase tracking-wider">Filter by campaign:</span>
          <select
            value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
            className="bg-[#0c0c18] border border-[#222240] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7c6df5]/60 transition-colors cursor-pointer"
          >
            <option value="all">All campaigns</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-[#7c6df5]/15 text-white border border-[#7c6df5]/30'
                : 'text-[#b0b0d0] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-2 text-xs opacity-60">
                {allAlerts.filter(a => a.severity === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-[#00e096]/10 border border-[#00e096]/20 flex items-center justify-center mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00e096" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-lg mb-2">All clear — no compliance alerts</h3>
          <p className="text-[#b0b0d0] text-sm">
            {filter === 'all'
              ? 'No alerts have been triggered yet.'
              : `No ${filter} alerts at the moment.`}
          </p>
        </div>
      )}

      {/* Alert feed */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info
            return (
              <div
                key={alert.id}
                className={`bg-[#0c0c18] border ${cfg.border} rounded-2xl p-5 transition-colors hover:border-opacity-60`}
              >
                <div className="flex items-start gap-4">
                  {/* Severity dot */}
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      {/* Severity badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      {/* Alert name */}
                      <span className="text-white font-semibold text-sm">{alert.alert_name}</span>
                    </div>

                    {/* Summary */}
                    {alert.payload?.summary && (
                      <p className="text-[#b0b0d0] text-sm leading-relaxed mb-3">
                        {alert.payload.summary}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 text-xs text-[#b0b0d0] flex-wrap">
                      {alert.payload?.store_name && (
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          </svg>
                          {alert.payload.store_name}
                        </span>
                      )}
                      {alert.payload?.campaign_name && (
                        <span className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M3 9h18M9 21V9" />
                          </svg>
                          {alert.payload.campaign_name}
                        </span>
                      )}
                      <span className="ml-auto">{timeAgo(alert.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
