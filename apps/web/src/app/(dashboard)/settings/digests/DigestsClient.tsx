'use client'

import { useState, useRef } from 'react'
import { Mail, Plus, X, Clock, Calendar, ChevronDown, Eye, RefreshCw, Check } from 'lucide-react'

type Digest = {
  id: string
  subject: string | null
  generated_at: string
  sent_at: string | null
  period_start: string | null
  period_end: string | null
  stats: Record<string, unknown> | null
  html_body: string | null
  text_body: string | null
  recipient_emails: string[] | null
}

type Props = {
  orgId: string
  userRole: string
  initialDigests: Digest[]
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center bg-[#1a1a35] border border-[#222240] rounded-lg px-4 py-3 min-w-[80px]">
      <span className="text-lg font-black text-white leading-none">{value}</span>
      <span className="text-[10px] text-[#8080a0] mt-1 uppercase tracking-wide">{label}</span>
    </div>
  )
}

export default function DigestsClient({ orgId, userRole, initialDigests }: Props) {
  const [digests, setDigests] = useState<Digest[]>(initialDigests)
  const [enabled, setEnabled] = useState(true)
  const [dayOfWeek, setDayOfWeek] = useState(1) // Monday
  const [time, setTime] = useState('09:00')
  const [recipients, setRecipients] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [previewDigest, setPreviewDigest] = useState<Digest | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)

  const isAdmin = userRole === 'enterprise_admin' || userRole === 'superadmin'

  function addEmail() {
    const val = emailInput.trim().toLowerCase()
    if (!val) return
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
    if (!valid) { setEmailError('Invalid email address'); return }
    if (recipients.includes(val)) { setEmailError('Already added'); return }
    setRecipients(r => [...r, val])
    setEmailInput('')
    setEmailError('')
  }

  function removeEmail(email: string) {
    setRecipients(r => r.filter(e => e !== email))
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addEmail()
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError('')
    try {
      const res = await fetch('/api/digests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_days: 7 }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? `HTTP ${res.status}`)
      }
      const { digest } = await res.json()
      setDigests(prev => [digest, ...prev])
    } catch (err) {
      setGenerateError((err as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  function handleSaveSchedule() {
    // In production this would persist to a digest_settings table.
    // For now we just show success feedback.
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Compliance Digests</h1>
        <p className="text-[#b0b0d0] text-sm mt-1">
          AI-generated weekly summaries of your shelf compliance data, delivered to your team.
        </p>
      </div>

      {/* Schedule card */}
      <div className="bg-[#13132a] border border-[#222240] rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-bold text-[#a0a0c0] uppercase tracking-wider">Schedule</h2>

        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">Weekly digest</p>
            <p className="text-[#8080a0] text-xs mt-0.5">Automatically generate and email digests on a schedule</p>
          </div>
          <button
            onClick={() => setEnabled(e => !e)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-[#7c6df5]' : 'bg-[#222240]'}`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : ''}`}
            />
          </button>
        </div>

        {/* Day + Time */}
        <div className={`grid grid-cols-2 gap-4 transition-opacity ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div>
            <label className="block text-xs text-[#8080a0] mb-1.5 font-medium">Day of week</label>
            <div className="relative">
              <select
                value={dayOfWeek}
                onChange={e => setDayOfWeek(Number(e.target.value))}
                className="w-full bg-[#1a1a35] border border-[#222240] rounded-xl px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-[#7c6df5] transition-colors pr-10"
              >
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3 text-[#8080a0] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#8080a0] mb-1.5 font-medium">Time</label>
            <div className="relative">
              <select
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-[#1a1a35] border border-[#222240] rounded-xl px-4 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-[#7c6df5] transition-colors pr-10"
              >
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3 text-[#8080a0] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div>
          <label className="block text-xs text-[#8080a0] mb-1.5 font-medium">Recipients</label>
          <div
            className="min-h-[48px] flex flex-wrap gap-2 items-center bg-[#1a1a35] border border-[#222240] rounded-xl px-3 py-2 focus-within:border-[#7c6df5] transition-colors cursor-text"
            onClick={() => emailInputRef.current?.focus()}
          >
            {recipients.map(email => (
              <span
                key={email}
                className="flex items-center gap-1.5 bg-[#7c6df5]/20 border border-[#7c6df5]/30 text-[#c0b8ff] text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {email}
                <button onClick={() => removeEmail(email)} className="text-[#8080a0] hover:text-white transition-colors">
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              ref={emailInputRef}
              type="email"
              placeholder={recipients.length === 0 ? 'Add email addresses…' : ''}
              value={emailInput}
              onChange={e => { setEmailInput(e.target.value); setEmailError('') }}
              onKeyDown={handleEmailKeyDown}
              onBlur={addEmail}
              className="flex-1 min-w-[180px] bg-transparent text-sm text-white placeholder:text-[#505070] outline-none"
            />
          </div>
          {emailError && <p className="text-[#ff4d6d] text-xs mt-1">{emailError}</p>}
          <p className="text-[#505070] text-xs mt-1">Press Enter or comma to add. Recipients receive read-only digests.</p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSaveSchedule}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #7c6df5, #00d4d4)' }}
          >
            {saveSuccess ? (
              <span className="flex items-center gap-2"><Check size={14} /> Saved</span>
            ) : 'Save schedule'}
          </button>
        </div>
      </div>

      {/* Generate Now */}
      <div className="bg-[#13132a] border border-[#222240] rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-white">Generate now</h2>
            <p className="text-[#8080a0] text-xs mt-0.5">
              Instantly generate a digest for the last 7 days using GPT-4o.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c6df5, #00d4d4)' }}
          >
            {generating ? (
              <><RefreshCw size={14} className="animate-spin" /> Generating…</>
            ) : (
              <><Mail size={14} /> Generate</>
            )}
          </button>
        </div>
        {generateError && (
          <p className="text-[#ff4d6d] text-xs mt-3 bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 rounded-lg px-3 py-2">
            {generateError}
          </p>
        )}
      </div>

      {/* Recent digests */}
      <div className="bg-[#13132a] border border-[#222240] rounded-2xl p-6">
        <h2 className="text-sm font-bold text-[#a0a0c0] uppercase tracking-wider mb-4">Recent digests</h2>

        {digests.length === 0 ? (
          <div className="text-center py-12">
            <Mail size={32} className="text-[#333360] mx-auto mb-3" />
            <p className="text-[#505070] text-sm">No digests generated yet.</p>
            <p className="text-[#404060] text-xs mt-1">Hit "Generate" above to create your first digest.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {digests.map(d => {
              const stats = d.stats as Record<string, number | string> | null
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-4 bg-[#1a1a35] border border-[#222240] rounded-xl px-4 py-3 hover:border-[#333360] transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c6df5 0%, #00d4d4 100%)' }}>
                    <Mail size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{d.subject ?? 'Digest'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[#8080a0] text-xs flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(d.generated_at)}
                      </span>
                      {d.period_start && d.period_end && (
                        <span className="text-[#8080a0] text-xs flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(d.period_start)} – {formatDate(d.period_end)}
                        </span>
                      )}
                    </div>
                  </div>
                  {stats && (
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                      <StatPill label="Avg" value={`${stats.avg_score ?? '—'}`} />
                      <StatPill label="Submissions" value={`${stats.total ?? '—'}`} />
                    </div>
                  )}
                  <button
                    onClick={() => setPreviewDigest(d)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7c6df5] hover:bg-[#7c6df5]/10 transition-colors flex-shrink-0"
                  >
                    <Eye size={12} />
                    View
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewDigest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPreviewDigest(null)}
        >
          <div
            className="bg-[#13132a] border border-[#222240] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-[#222240]">
              <div className="min-w-0 pr-4">
                <p className="text-white font-bold text-sm truncate">{previewDigest.subject}</p>
                <p className="text-[#8080a0] text-xs mt-0.5">{formatDate(previewDigest.generated_at)}</p>
              </div>
              <button
                onClick={() => setPreviewDigest(null)}
                className="p-1.5 rounded-lg text-[#8080a0] hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            {/* Sandboxed iframe */}
            <div className="flex-1 overflow-hidden rounded-b-2xl">
              <iframe
                sandbox="allow-same-origin"
                srcDoc={previewDigest.html_body ?? '<p>No content</p>'}
                className="w-full h-full"
                style={{ minHeight: '600px', border: 'none' }}
                title="Digest preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
