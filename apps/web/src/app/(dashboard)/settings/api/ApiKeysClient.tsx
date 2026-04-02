'use client'

import { useState } from 'react'
import { Key, Plus, Copy, Trash2, Check, X, ExternalLink, ShieldCheck, ShieldOff } from 'lucide-react'

type ApiKeyRow = {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at: string | null
  created_at: string
  is_active: boolean
}

function ScopeBadge({ scope }: { scope: string }) {
  const styles: Record<string, string> = {
    read: 'bg-[#7c6df5]/20 text-[#a89cf7]',
    write: 'bg-amber-500/20 text-amber-400',
  }
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[scope] ?? 'bg-white/10 text-[#b0b0d0]'}`}>
      {scope}
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

export default function ApiKeysClient({
  initialKeys,
  orgId: _orgId,
}: {
  initialKeys: ApiKeyRow[]
  orgId: string
}) {
  const [keys, setKeys] = useState<ApiKeyRow[]>(initialKeys)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newScopes, setNewScopes] = useState<string[]>(['read'])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [revealedKey, setRevealedKey] = useState<{ key: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    setCreateError('')
    if (!newName.trim()) { setCreateError('Name is required'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), scopes: newScopes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create key')
      setKeys(prev => [json.key, ...prev])
      setRevealedKey({ key: json.full_key, name: json.key.name })
      setShowCreate(false)
      setNewName('')
      setNewScopes(['read'])
    } catch (err) {
      setCreateError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function handleToggle(id: string, current: boolean) {
    const res = await fetch(`/api/settings/api-keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      const { key } = await res.json()
      setKeys(prev => prev.map(k => k.id === id ? key : k))
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete API key "${name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/settings/api-keys/${id}`, { method: 'DELETE' })
    if (res.ok) setKeys(prev => prev.filter(k => k.id !== id))
  }

  function handleCopy() {
    if (!revealedKey) return
    navigator.clipboard.writeText(revealedKey.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleScope(scope: string) {
    setNewScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Key size={24} className="text-[#7c6df5]" />
            API Keys
          </h1>
          <p className="text-[#b0b0d0] text-sm mt-1">
            Manage API keys for programmatic access to Mosaic data.{' '}
            <a href="/api-docs" className="text-[#7c6df5] hover:underline inline-flex items-center gap-1">
              Documentation <ExternalLink size={11} />
            </a>
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#7c6df5] hover:bg-[#6b5de4] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} />
          Create API Key
        </button>
      </div>

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="text-center py-16 text-[#555570]">
          <Key size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No API keys yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(k => (
            <div key={k.id} className="bg-[#12122a] border border-[#222240] rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <span className="text-white font-semibold text-sm">{k.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${k.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#444460]/40 text-[#888]'}`}>
                      {k.is_active ? 'active' : 'inactive'}
                    </span>
                    {k.scopes.map(s => <ScopeBadge key={s} scope={s} />)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#555570]">
                    <span className="font-mono text-[#888]">{k.key_prefix}••••••••••••••••</span>
                    <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
                    <span>Last used: {timeAgo(k.last_used_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(k.id, k.is_active)}
                    className="p-2 rounded-lg text-[#b0b0d0] hover:text-white hover:bg-white/5 transition-colors"
                    title={k.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {k.is_active ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                  </button>
                  <button
                    onClick={() => handleDelete(k.id, k.name)}
                    className="p-2 rounded-lg text-[#b0b0d0] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12122a] border border-[#222240] rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-[#222240]">
              <h3 className="text-white font-semibold">Create API Key</h3>
              <button onClick={() => { setShowCreate(false); setCreateError('') }} className="text-[#b0b0d0] hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-[#b0b0d0] mb-2">Key Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Production dashboard"
                  maxLength={80}
                  className="w-full bg-[#0c0c18] border border-[#222240] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#555570] focus:outline-none focus:border-[#7c6df5] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#b0b0d0] mb-2">Scopes</label>
                <div className="flex gap-3">
                  {['read', 'write'].map(scope => (
                    <label key={scope} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newScopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        className="w-3.5 h-3.5 accent-[#7c6df5]"
                      />
                      <ScopeBadge scope={scope} />
                    </label>
                  ))}
                </div>
                <p className="text-[#555570] text-xs mt-2">
                  <strong className="text-[#888]">read</strong> — list campaigns, stores, submissions, compliance.{' '}
                  <strong className="text-[#888]">write</strong> — reserved for future write operations.
                </p>
              </div>
              {createError && <p className="text-red-400 text-xs">{createError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setShowCreate(false); setCreateError('') }}
                  className="flex-1 px-4 py-2.5 border border-[#222240] text-[#b0b0d0] text-sm rounded-xl hover:text-white hover:border-[#444460] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-[#7c6df5] hover:bg-[#6b5de4] text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create Key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reveal key modal */}
      {revealedKey && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12122a] border border-[#222240] rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-[#222240]">
              <h3 className="text-white font-semibold">API Key Created</h3>
              <button onClick={() => { setRevealedKey(null); setCopied(false) }} className="text-[#b0b0d0] hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm">
                Store this key somewhere safe — it will not be shown again.
              </div>
              <div>
                <div className="text-xs font-medium text-[#b0b0d0] mb-2">
                  {revealedKey.name}
                </div>
                <div className="flex items-center gap-2 bg-[#0c0c18] border border-[#222240] rounded-xl px-4 py-3">
                  <span className="flex-1 text-sm font-mono text-[#a89cf7] break-all">{revealedKey.key}</span>
                  <button
                    onClick={handleCopy}
                    className="flex-shrink-0 p-1.5 rounded-lg text-[#b0b0d0] hover:text-white hover:bg-white/5 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setRevealedKey(null); setCopied(false) }}
                className="w-full px-4 py-2.5 bg-[#7c6df5] hover:bg-[#6b5de4] text-white text-sm font-medium rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
