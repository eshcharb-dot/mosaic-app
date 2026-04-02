'use client'
import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { X, RefreshCw, CheckCircle, XCircle, Clock, Search, ChevronDown } from 'lucide-react'

export interface Submission {
  id: string
  photo_url: string | null
  submitted_at: string | null
  store_name: string | null
  campaign_name: string | null
  score: number | null
  is_compliant: boolean | null
  findings: string[]
  summary: string | null
}

interface Props {
  submissions: Submission[]
}

type StatusFilter = 'all' | 'compliant' | 'non-compliant' | 'pending'

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return iso
  }
}

function ScoreBadge({ score, isCompliant }: { score: number | null; isCompliant: boolean | null }) {
  if (score === null) {
    return (
      <span className="flex items-center gap-1 bg-[#222240] text-[#b0b0d0] text-xs font-bold px-2 py-1 rounded-lg">
        <Clock size={10} />
        Pending
      </span>
    )
  }
  if (isCompliant) {
    return (
      <span className="flex items-center gap-1 bg-[#00e096]/20 text-[#00e096] text-xs font-bold px-2 py-1 rounded-lg">
        <CheckCircle size={10} />
        {Math.round(score)}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 bg-[#ff4d6d]/20 text-[#ff4d6d] text-xs font-bold px-2 py-1 rounded-lg">
      <XCircle size={10} />
      {Math.round(score)}
    </span>
  )
}

function ScoreRing({ score, isCompliant }: { score: number | null; isCompliant: boolean | null }) {
  const size = 96
  const stroke = 6
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = score !== null ? Math.min(100, Math.max(0, score)) : 0
  const dash = (pct / 100) * circ
  const color = score === null ? '#b0b0d0' : isCompliant ? '#00e096' : '#ff4d6d'

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
        <div className="text-2xl font-black" style={{ color }}>
          {score !== null ? Math.round(score) : '—'}
        </div>
        {score !== null && <div className="text-[10px] text-[#b0b0d0]">/ 100</div>}
      </div>
    </div>
  )
}

function SubmissionModal({
  sub,
  onClose,
}: {
  sub: Submission
  onClose: () => void
}) {
  const [rescoring, setRescoring] = useState(false)
  const [rescored, setRescored] = useState(false)
  const [rescoreError, setRescoreError] = useState<string | null>(null)

  async function handleRescore() {
    setRescoring(true)
    setRescoreError(null)
    try {
      const res = await fetch(`/api/submissions/${sub.id}/score`, { method: 'POST' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setRescored(true)
    } catch (e: any) {
      setRescoreError(e.message ?? 'Failed to rescore')
    } finally {
      setRescoring(false)
    }
  }

  const findings: string[] = Array.isArray(sub.findings) ? sub.findings : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative z-10 bg-[#0c0c18] border border-[#222240] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#b0b0d0] hover:text-white transition-colors z-10 bg-[#030305] rounded-lg p-1.5"
        >
          <X size={18} />
        </button>

        {/* Photo */}
        {sub.photo_url ? (
          <div className="w-full aspect-video bg-[#030305] rounded-t-2xl overflow-hidden">
            <img
              src={sub.photo_url}
              alt={sub.store_name ?? 'Submission'}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full aspect-video bg-[#030305] rounded-t-2xl flex items-center justify-center">
            <span className="text-[#b0b0d0] text-sm">No photo</span>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Score + meta */}
          <div className="flex items-start gap-6">
            <ScoreRing score={sub.score} isCompliant={sub.is_compliant} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {sub.is_compliant === true && (
                  <span className="flex items-center gap-1 text-xs font-bold text-[#00e096] bg-[#00e096]/10 border border-[#00e096]/25 px-2 py-0.5 rounded-full">
                    <CheckCircle size={11} /> COMPLIANT
                  </span>
                )}
                {sub.is_compliant === false && (
                  <span className="flex items-center gap-1 text-xs font-bold text-[#ff4d6d] bg-[#ff4d6d]/10 border border-[#ff4d6d]/25 px-2 py-0.5 rounded-full">
                    <XCircle size={11} /> NON-COMPLIANT
                  </span>
                )}
                {sub.is_compliant === null && (
                  <span className="flex items-center gap-1 text-xs font-bold text-[#b0b0d0] bg-[#222240] px-2 py-0.5 rounded-full">
                    <Clock size={11} /> PENDING
                  </span>
                )}
              </div>
              <div className="text-white font-bold text-lg leading-tight truncate">{sub.store_name ?? 'Unknown store'}</div>
              <div className="text-[#b0b0d0] text-sm">{sub.campaign_name ?? '—'}</div>
              <div className="text-[#b0b0d0] text-xs mt-1">{relativeTime(sub.submitted_at)}</div>
            </div>
          </div>

          {/* Summary */}
          {sub.summary && (
            <div className="bg-[#030305] border border-[#222240] rounded-xl p-4">
              <div className="text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">AI Summary</div>
              <p className="text-white text-sm leading-relaxed">{sub.summary}</p>
            </div>
          )}

          {/* Findings */}
          {findings.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-3">Findings</div>
              <ul className="space-y-2">
                {findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7c6df5] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rescore */}
          <div className="pt-2 border-t border-[#222240]">
            {rescored ? (
              <p className="text-[#00e096] text-sm font-medium">Re-score queued. Refresh shortly.</p>
            ) : (
              <button
                onClick={handleRescore}
                disabled={rescoring}
                className="flex items-center gap-2 bg-[#7c6df5]/15 border border-[#7c6df5]/30 hover:bg-[#7c6df5]/25 text-[#7c6df5] font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw size={15} className={rescoring ? 'animate-spin' : ''} />
                {rescoring ? 'Scoring…' : 'Re-score with AI'}
              </button>
            )}
            {rescoreError && (
              <p className="text-[#ff4d6d] text-xs mt-2">{rescoreError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SubmissionCard({
  sub,
  onClick,
}: {
  sub: Submission
  onClick: () => void
}) {
  const findings: string[] = Array.isArray(sub.findings) ? sub.findings : []
  const borderColor = sub.score === null
    ? '#222240'
    : sub.is_compliant
    ? 'rgba(0,224,150,0.3)'
    : 'rgba(255,77,109,0.3)'

  return (
    <div
      onClick={onClick}
      className="group bg-[#0c0c18] rounded-2xl overflow-hidden cursor-pointer transition-transform hover:-translate-y-0.5"
      style={{ border: `1px solid ${borderColor}` }}
    >
      {/* Photo */}
      <div className="relative aspect-square overflow-hidden bg-[#030305]">
        {sub.photo_url ? (
          <img
            src={sub.photo_url}
            alt={sub.store_name ?? 'Submission'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#b0b0d0] text-xs">
            No photo
          </div>
        )}

        {/* Score overlay badge */}
        <div className="absolute bottom-2 right-2">
          <ScoreBadge score={sub.score} isCompliant={sub.is_compliant} />
        </div>

        {/* Hover overlay: score + findings */}
        <div className="absolute inset-0 bg-[#030305]/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-4 gap-2">
          {sub.score !== null && (
            <div
              className="text-5xl font-black"
              style={{ color: sub.is_compliant ? '#00e096' : '#ff4d6d' }}
            >
              {Math.round(sub.score)}
            </div>
          )}
          {findings.length > 0 && (
            <ul className="text-xs text-[#b0b0d0] space-y-1 text-center max-h-24 overflow-hidden">
              {findings.slice(0, 3).map((f, i) => (
                <li key={i} className="truncate">{f}</li>
              ))}
              {findings.length > 3 && (
                <li className="text-[#7c6df5]">+{findings.length - 3} more…</li>
              )}
            </ul>
          )}
          {sub.score === null && (
            <span className="text-[#b0b0d0] text-sm">Not yet scored</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="font-semibold text-white text-sm truncate">{sub.store_name ?? 'Unknown store'}</div>
        <div className="text-[#b0b0d0] text-xs truncate mt-0.5">{sub.campaign_name ?? '—'}</div>
        <div className="text-[#b0b0d0] text-xs mt-1 opacity-60">{relativeTime(sub.submitted_at)}</div>
      </div>
    </div>
  )
}

export default function GalleryClient({ submissions }: Props) {
  const [campaignFilter, setCampaignFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null)

  const campaigns = useMemo(() => {
    const names = new Set<string>()
    submissions.forEach(s => { if (s.campaign_name) names.add(s.campaign_name) })
    return Array.from(names).sort()
  }, [submissions])

  const filtered = useMemo(() => {
    return submissions.filter(s => {
      // Campaign
      if (campaignFilter !== 'all' && s.campaign_name !== campaignFilter) return false
      // Status
      if (statusFilter === 'compliant' && s.is_compliant !== true) return false
      if (statusFilter === 'non-compliant' && s.is_compliant !== false) return false
      if (statusFilter === 'pending' && s.score !== null) return false
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!(s.store_name ?? '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [submissions, campaignFilter, statusFilter, searchQuery])

  const statusCounts = useMemo(() => ({
    all: submissions.length,
    compliant: submissions.filter(s => s.is_compliant === true).length,
    'non-compliant': submissions.filter(s => s.is_compliant === false).length,
    pending: submissions.filter(s => s.score === null).length,
  }), [submissions])

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Gallery</h1>
          <p className="text-[#b0b0d0] mt-1">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} · AI compliance scores
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#7c6df5]/10 border border-[#7c6df5]/25 rounded-full px-4 py-2">
          <span className="text-[#7c6df5] text-sm font-bold">{filtered.length} shown</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0d0]" />
          <input
            type="text"
            placeholder="Search by store…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#0c0c18] border border-[#222240] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none focus:border-[#7c6df5] transition-colors placeholder:text-[#b0b0d0]/50"
          />
        </div>

        {/* Campaign dropdown */}
        <div className="relative">
          <select
            value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
            className="appearance-none bg-[#0c0c18] border border-[#222240] rounded-xl pl-4 pr-9 py-2.5 text-sm text-white outline-none focus:border-[#7c6df5] transition-colors cursor-pointer"
          >
            <option value="all">All campaigns</option>
            {campaigns.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#b0b0d0]" />
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-[#0c0c18] border border-[#222240] rounded-xl p-1">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'compliant', label: 'Compliant' },
              { key: 'non-compliant', label: 'Non-Compliant' },
              { key: 'pending', label: 'Pending' },
            ] as { key: StatusFilter; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === key
                  ? 'bg-[#7c6df5] text-white'
                  : 'text-[#b0b0d0] hover:text-white'
              }`}
            >
              {label}
              <span className={`ml-1.5 text-[10px] ${statusFilter === key ? 'text-white/60' : 'text-[#b0b0d0]/50'}`}>
                {statusCounts[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0c0c18] border border-[#222240] flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#b0b0d0" strokeWidth="1.5" className="w-8 h-8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          {submissions.length === 0 ? (
            <>
              <p className="text-white font-semibold text-lg">No submissions yet</p>
              <p className="text-[#b0b0d0] text-sm mt-1">Activate a campaign to start collecting.</p>
              <a
                href="/campaigns"
                className="mt-5 inline-block bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white text-sm font-bold px-5 py-2.5 rounded-xl"
              >
                Go to Campaigns
              </a>
            </>
          ) : (
            <>
              <p className="text-white font-semibold text-lg">No matches</p>
              <p className="text-[#b0b0d0] text-sm mt-1">Try adjusting your filters.</p>
              <button
                onClick={() => { setCampaignFilter('all'); setStatusFilter('all'); setSearchQuery('') }}
                className="mt-4 text-[#7c6df5] text-sm font-semibold hover:underline"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(sub => (
            <SubmissionCard
              key={sub.id}
              sub={sub}
              onClick={() => setSelectedSub(sub)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedSub && (
        <SubmissionModal
          sub={selectedSub}
          onClose={() => setSelectedSub(null)}
        />
      )}
    </div>
  )
}
