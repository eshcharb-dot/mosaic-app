'use client'

import { useState, useMemo } from 'react'
import type { AuditLogRow } from './page'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function anonymizeEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  return `${local[0]}***@${domain}`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

const ACTION_COLORS: Record<string, string> = {
  'campaign.activated':    'bg-green-500/15 text-green-400 border-green-500/30',
  'user.invited':          'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'webhook.created':       'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'api_key.created':       'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'org.branding_updated':  'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? 'bg-[#222240] text-[#b0b0d0] border-[#333360]'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-mono border ${cls}`}>
      {action}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Unique action list for filter dropdown
// ---------------------------------------------------------------------------

const ALL_ACTIONS = [
  'campaign.activated',
  'user.invited',
  'webhook.created',
  'api_key.created',
  'org.branding_updated',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  logs: AuditLogRow[]
}

export default function AuditLogClient({ logs }: Props) {
  const [actionFilter, setActionFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [resourceSearch, setResourceSearch] = useState<string>('')

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (actionFilter && log.action !== actionFilter) return false
      if (dateFrom && new Date(log.created_at) < new Date(dateFrom)) return false
      if (dateTo) {
        const toEnd = new Date(dateTo)
        toEnd.setHours(23, 59, 59, 999)
        if (new Date(log.created_at) > toEnd) return false
      }
      if (resourceSearch) {
        const q = resourceSearch.toLowerCase()
        if (!log.resource_id?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [logs, actionFilter, dateFrom, dateTo, resourceSearch])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-xs text-[#b0b0d0]">Action type</label>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-[#030305] border border-[#222240] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#7c6df5]"
          >
            <option value="">All actions</option>
            {ALL_ACTIONS.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#b0b0d0]">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-[#030305] border border-[#222240] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#7c6df5]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#b0b0d0]">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-[#030305] border border-[#222240] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#7c6df5]"
          />
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs text-[#b0b0d0]">Search resource ID</label>
          <input
            type="text"
            value={resourceSearch}
            onChange={e => setResourceSearch(e.target.value)}
            placeholder="UUID..."
            className="bg-[#030305] border border-[#222240] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#7c6df5]"
          />
        </div>

        {(actionFilter || dateFrom || dateTo || resourceSearch) && (
          <button
            onClick={() => { setActionFilter(''); setDateFrom(''); setDateTo(''); setResourceSearch('') }}
            className="px-3 py-2 text-sm text-[#b0b0d0] hover:text-white border border-[#222240] rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-[#b0b0d0]">
        Showing {filtered.length} of {logs.length} events
      </p>

      {/* Table */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#222240]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#b0b0d0] whitespace-nowrap">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#b0b0d0]">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#b0b0d0]">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#b0b0d0]">Resource</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#b0b0d0]">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#b0b0d0] text-sm">
                    No audit events match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((log, i) => (
                  <tr
                    key={log.id}
                    className={`border-b border-[#222240]/50 hover:bg-[#111128] transition-colors ${
                      i % 2 === 0 ? '' : 'bg-[#0a0a16]'
                    }`}
                  >
                    <td className="px-4 py-3 text-[#b0b0d0] text-xs whitespace-nowrap font-mono">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-white text-xs">
                      <div className="truncate max-w-[160px]">
                        {log.user_email ? anonymizeEmail(log.user_email) : (
                          <span className="text-[#b0b0d0]">{log.user_id ? log.user_id.slice(0, 8) + '…' : '—'}</span>
                        )}
                      </div>
                      {log.org_name && (
                        <div className="text-[#b0b0d0] text-xs truncate max-w-[160px]">{log.org_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {log.resource_type && (
                        <span className="text-[#b0b0d0]">{log.resource_type}</span>
                      )}
                      {log.resource_id && (
                        <div className="font-mono text-[#7c6df5] text-xs truncate max-w-[120px]" title={log.resource_id}>
                          {log.resource_id.slice(0, 8)}…
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#b0b0d0] text-xs font-mono whitespace-nowrap">
                      {log.ip_address ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
