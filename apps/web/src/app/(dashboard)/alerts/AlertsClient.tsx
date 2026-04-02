'use client'
import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'

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

interface Props {
  alerts: Alert[]
}

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', bg: 'bg-[#ff4d6d]/10', border: 'border-[#ff4d6d]/30', text: 'text-[#ff4d6d]', dot: 'bg-[#ff4d6d]' },
  warning:  { label: 'Warning',  bg: 'bg-[#ffc947]/10', border: 'border-[#ffc947]/30', text: 'text-[#ffc947]', dot: 'bg-[#ffc947]' },
  info:     { label: 'Info',     bg: 'bg-[#00d4d4]/10', border: 'border-[#00d4d4]/30', text: 'text-[#00d4d4]', dot: 'bg-[#00d4d4]' },
}

function timeAgo(iso: string) {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return iso
  }
}

export default function AlertsClient({ alerts }: Props) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all')

  const filtered = alerts.filter(a => {
    if (filter === 'all') return true
    return a.severity === filter
  })

  const filters: Array<{ key: 'all' | 'critical' | 'warning'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'warning', label: 'Warning' },
  ]

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Alerts</h1>
          <p className="text-[#b0b0d0] mt-1">Compliance violations and system notifications</p>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-2 bg-[#ff4d6d]/10 border border-[#ff4d6d]/25 rounded-full px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-[#ff4d6d] animate-pulse" />
            <span className="text-[#ff4d6d] text-sm font-bold">
              {alerts.filter(a => a.severity === 'critical').length} Critical
            </span>
          </div>
        )}
      </div>

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
                {alerts.filter(a => a.severity === f.key).length}
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
