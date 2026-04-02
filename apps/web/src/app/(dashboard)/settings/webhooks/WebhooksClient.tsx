'use client'

import { useState } from 'react'
import { Webhook, Plus, Eye, EyeOff, RefreshCw, Trash2, Send, ChevronRight, X, CheckCircle, XCircle, Clock } from 'lucide-react'

const ALL_EVENTS = ['compliance.scored', 'compliance.failed', 'campaign.activated']

type WebhookRow = {
  id: string
  url: string
  secret: string
  events: string[]
  is_active: boolean
  created_at: string
  last_triggered_at: string | null
  last_status_code: number | null
  failure_count: number
}

type Delivery = {
  id: string
  event_type: string
  payload: Record<string, unknown>
  status_code: number | null
  response_body: string | null
  delivered_at: string
  success: boolean
}

function StatusDot({ statusCode }: { statusCode: number | null }) {
  if (statusCode === null) return <span className="w-2 h-2 rounded-full bg-[#444460] inline-block" title="Never triggered" />
  if (statusCode >= 200 && statusCode < 300) return <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title={`${statusCode}`} />
  return <span className="w-2 h-2 rounded-full bg-red-400 inline-block" title={`${statusCode}`} />
}

function EventBadge({ event }: { event: string }) {
  const colors: Record<string, string> = {
    'compliance.scored': 'bg-[#7c6df5]/20 text-[#a89cf7]',
    'compliance.failed': 'bg-red-500/20 text-red-400',
    'campaign.activated': 'bg-emerald-500/20 text-emerald-400',
  }
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors[event] ?? 'bg-white/10 text-[#b0b0d0]'}`}>
      {event}
    </span>
  )
}

function timeAgo(iso: string | null) {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function WebhooksClient({
  initialWebhooks,
  orgId,
}: {
  initialWebhooks: WebhookRow[]
  orgId: string
}) {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>(initialWebhooks)
  const [newUrl, setNewUrl] = useState('')
  const [newEvents, setNewEvents] = useState<string[]>(ALL_EVENTS)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set())
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({})

  const [deliveryModal, setDeliveryModal] = useState<string | null>(null) // webhook id
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)

  async function handleAdd() {
    setAddError('')
    if (!newUrl.trim()) { setAddError('URL is required'); return }
    try { new URL(newUrl) } catch { setAddError('Invalid URL'); return }
    if (newEvents.length === 0) { setAddError('Select at least one event'); return }

    setAdding(true)
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl.trim(), events: newEvents }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create webhook')
      setWebhooks(prev => [json.webhook, ...prev])
      setNewUrl('')
      setNewEvents(ALL_EVENTS)
    } catch (err) {
      setAddError((err as Error).message)
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(id: string, current: boolean) {
    const res = await fetch(`/api/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      const { webhook } = await res.json()
      setWebhooks(prev => prev.map(w => w.id === id ? webhook : w))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this webhook? This cannot be undone.')) return
    const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    if (res.ok) setWebhooks(prev => prev.filter(w => w.id !== id))
  }

  async function handleRegenerate(id: string) {
    if (!confirm('Regenerate secret? You will need to update your endpoint.')) return
    const res = await fetch(`/api/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regenerate_secret: true }),
    })
    if (res.ok) {
      const { webhook } = await res.json()
      setWebhooks(prev => prev.map(w => w.id === id ? webhook : w))
      setRevealedSecrets(prev => new Set([...prev, id]))
    }
  }

  async function handleTest(id: string) {
    setTestingId(id)
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' })
      const json = await res.json()
      if (res.ok && json.delivered) {
        setTestResult(prev => ({ ...prev, [id]: { ok: true, msg: `Delivered (${json.status_code})` } }))
      } else {
        setTestResult(prev => ({ ...prev, [id]: { ok: false, msg: json.error ?? `Status ${json.status_code}` } }))
      }
    } catch (err) {
      setTestResult(prev => ({ ...prev, [id]: { ok: false, msg: (err as Error).message } }))
    } finally {
      setTestingId(null)
      setTimeout(() => setTestResult(prev => { const n = { ...prev }; delete n[id]; return n }), 5000)
    }
  }

  async function openDeliveries(id: string) {
    setDeliveryModal(id)
    setLoadingDeliveries(true)
    try {
      const res = await fetch(`/api/webhooks/${id}/deliveries`)
      const json = await res.json()
      setDeliveries(json.deliveries ?? [])
    } finally {
      setLoadingDeliveries(false)
    }
  }

  const toggleSecret = (id: string) => {
    setRevealedSecrets(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleEvent = (ev: string) => {
    setNewEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev])
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Webhook size={24} className="text-[#7c6df5]" />
          Webhooks
        </h1>
        <p className="text-[#b0b0d0] text-sm mt-1">
          Receive real-time compliance events in your own systems. Deliveries are signed with HMAC-SHA256.
        </p>
      </div>

      {/* Add webhook form */}
      <div className="bg-[#12122a] border border-[#222240] rounded-2xl p-6 mb-8">
        <h2 className="text-white font-semibold mb-4 text-sm">Add Webhook</h2>
        <div className="flex gap-3 mb-4">
          <input
            type="url"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="flex-1 bg-[#0c0c18] border border-[#222240] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#555570] focus:outline-none focus:border-[#7c6df5] transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7c6df5] hover:bg-[#6b5de4] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>

        {/* Event checkboxes */}
        <div className="flex flex-wrap gap-3 mb-2">
          {ALL_EVENTS.map(ev => (
            <label key={ev} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newEvents.includes(ev)}
                onChange={() => toggleEvent(ev)}
                className="w-3.5 h-3.5 accent-[#7c6df5]"
              />
              <EventBadge event={ev} />
            </label>
          ))}
        </div>

        {addError && <p className="text-red-400 text-xs mt-2">{addError}</p>}
      </div>

      {/* Webhook list */}
      {webhooks.length === 0 ? (
        <div className="text-center py-16 text-[#555570]">
          <Webhook size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No webhooks yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map(wh => {
            const isRevealed = revealedSecrets.has(wh.id)
            const result = testResult[wh.id]
            return (
              <div key={wh.id} className="bg-[#12122a] border border-[#222240] rounded-2xl p-5">
                {/* Header row */}
                <div className="flex items-start gap-3 mb-4">
                  <StatusDot statusCode={wh.last_status_code} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-mono font-medium truncate max-w-xs" title={wh.url}>
                        {wh.url.length > 50 ? wh.url.slice(0, 50) + '…' : wh.url}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${wh.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#444460]/40 text-[#888]'}`}>
                        {wh.is_active ? 'active' : 'inactive'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {wh.events.map(ev => <EventBadge key={ev} event={ev} />)}
                    </div>
                    <div className="text-[#555570] text-xs mt-2">
                      Last triggered: {timeAgo(wh.last_triggered_at)}
                      {wh.failure_count > 0 && (
                        <span className="ml-3 text-red-400">{wh.failure_count} failure{wh.failure_count !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggle(wh.id, wh.is_active)}
                      className="p-2 rounded-lg text-[#b0b0d0] hover:text-white hover:bg-white/5 transition-colors text-xs"
                      title={wh.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {wh.is_active ? 'Pause' : 'Resume'}
                    </button>

                    {/* Test */}
                    <button
                      onClick={() => handleTest(wh.id)}
                      disabled={testingId === wh.id}
                      className="p-2 rounded-lg text-[#b0b0d0] hover:text-[#7c6df5] hover:bg-[#7c6df5]/10 transition-colors"
                      title="Send test ping"
                    >
                      <Send size={15} />
                    </button>

                    {/* Deliveries */}
                    <button
                      onClick={() => openDeliveries(wh.id)}
                      className="p-2 rounded-lg text-[#b0b0d0] hover:text-white hover:bg-white/5 transition-colors"
                      title="View delivery log"
                    >
                      <ChevronRight size={15} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(wh.id)}
                      className="p-2 rounded-lg text-[#b0b0d0] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Secret row */}
                <div className="flex items-center gap-2 bg-[#0c0c18] rounded-xl px-4 py-2.5 border border-[#222240]">
                  <span className="text-[#555570] text-xs font-medium w-14 flex-shrink-0">Secret</span>
                  <span className="flex-1 text-xs font-mono text-[#b0b0d0] truncate">
                    {isRevealed ? wh.secret : '•'.repeat(48)}
                  </span>
                  <button onClick={() => toggleSecret(wh.id)} className="text-[#555570] hover:text-white transition-colors ml-1">
                    {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button onClick={() => handleRegenerate(wh.id)} className="text-[#555570] hover:text-[#7c6df5] transition-colors ml-1" title="Regenerate secret">
                    <RefreshCw size={13} />
                  </button>
                </div>

                {/* Test result toast */}
                {result && (
                  <div className={`mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${result.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {result.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    {result.msg}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delivery log modal */}
      {deliveryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12122a] border border-[#222240] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#222240]">
              <h3 className="text-white font-semibold">Delivery Log</h3>
              <button onClick={() => setDeliveryModal(null)} className="text-[#b0b0d0] hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingDeliveries ? (
                <div className="text-center text-[#555570] py-8 text-sm">Loading…</div>
              ) : deliveries.length === 0 ? (
                <div className="text-center text-[#555570] py-8 text-sm">No deliveries yet.</div>
              ) : (
                deliveries.map(d => (
                  <div key={d.id} className="bg-[#0c0c18] rounded-xl p-4 border border-[#222240]">
                    <div className="flex items-center gap-3 mb-2">
                      {d.success
                        ? <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                        : <XCircle size={14} className="text-red-400 flex-shrink-0" />
                      }
                      <span className="text-white text-sm font-mono">{d.event_type}</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${d.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {d.status_code ?? 'timeout'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#555570] text-xs">
                      <Clock size={11} />
                      {new Date(d.delivered_at).toLocaleString()}
                    </div>
                    {d.response_body && (
                      <pre className="mt-2 text-[10px] text-[#888] bg-[#0a0a14] rounded p-2 overflow-x-auto max-h-20">
                        {d.response_body}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
