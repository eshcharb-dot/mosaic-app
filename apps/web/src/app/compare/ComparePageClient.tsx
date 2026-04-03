'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react'
import PhotoComparison from '@/components/PhotoComparison'

interface CompareSubmission {
  id: string
  photo_url: string | null
  submitted_at: string | null
  store_name: string | null
  store_city: string | null
  campaign_name: string | null
  score: number | null
  is_compliant: boolean | null
  findings: string[]
  summary: string | null
}

interface Props {
  subA: CompareSubmission
  subB: CompareSubmission
}

function scoreColor(score: number | null) {
  if (score === null) return '#b0b0d0'
  if (score >= 80) return '#00e096'
  if (score >= 60) return '#ffc947'
  return '#ff6b9d'
}

function SubmissionMeta({ sub, slot }: { sub: CompareSubmission; slot: 'A' | 'B' }) {
  const slotColor = slot === 'A' ? '#a855f7' : '#06b6d4'
  const findings: string[] = Array.isArray(sub.findings) ? sub.findings : []

  return (
    <div
      className="bg-[#0c0c18] rounded-2xl p-6 space-y-4 border"
      style={{ borderColor: `${slotColor}40` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-black px-2.5 py-1 rounded-full"
          style={{ background: `${slotColor}20`, color: slotColor, border: `1px solid ${slotColor}50` }}
        >
          Photo {slot}
        </span>
        {sub.is_compliant === true && (
          <span className="flex items-center gap-1 text-xs font-bold text-[#00e096] bg-[#00e096]/10 border border-[#00e096]/25 px-2 py-0.5 rounded-full">
            <CheckCircle size={10} /> COMPLIANT
          </span>
        )}
        {sub.is_compliant === false && (
          <span className="flex items-center gap-1 text-xs font-bold text-[#ff6b9d] bg-[#ff6b9d]/10 border border-[#ff6b9d]/25 px-2 py-0.5 rounded-full">
            <XCircle size={10} /> NON-COMPLIANT
          </span>
        )}
        {sub.is_compliant === null && (
          <span className="flex items-center gap-1 text-xs font-bold text-[#b0b0d0] bg-[#222240] px-2 py-0.5 rounded-full">
            <Clock size={10} /> PENDING
          </span>
        )}
      </div>

      <div>
        <div className="text-white font-bold text-lg">{sub.store_name ?? 'Unknown store'}</div>
        {sub.store_city && <div className="text-[#b0b0d0] text-sm">{sub.store_city}</div>}
        <div className="text-[#b0b0d0] text-xs mt-0.5">{sub.campaign_name ?? '—'}</div>
        {sub.submitted_at && (
          <div className="text-[#b0b0d0] text-xs mt-0.5">
            {format(new Date(sub.submitted_at), 'd MMM yyyy, HH:mm')}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div
          className="text-4xl font-black"
          style={{ color: scoreColor(sub.score) }}
        >
          {sub.score != null ? Math.round(sub.score) : '—'}
        </div>
        {sub.score != null && <span className="text-sm text-[#b0b0d0]">/ 100</span>}
      </div>

      {sub.summary && (
        <div className="bg-[#030305] border border-[#222240] rounded-xl p-3">
          <div className="text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-1.5">Summary</div>
          <p className="text-sm text-white leading-relaxed">{sub.summary}</p>
        </div>
      )}

      {findings.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider mb-2">Findings</div>
          <ul className="space-y-1.5">
            {findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#b0b0d0]">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#7c6df5] flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function ComparePageClient({ subA, subB }: Props) {
  const findingsA: string[] = Array.isArray(subA.findings) ? subA.findings : []
  const findingsB: string[] = Array.isArray(subB.findings) ? subB.findings : []
  const resolved = findingsA.filter(f => !findingsB.includes(f))
  const appeared = findingsB.filter(f => !findingsA.includes(f))

  const scoreDelta =
    subA.score != null && subB.score != null
      ? Math.round(subB.score - subA.score)
      : null

  return (
    <div className="min-h-screen bg-[#030305] text-white">
      {/* Topbar */}
      <div className="border-b border-[#222240] bg-[#0c0c18] px-6 py-4 flex items-center gap-4">
        <a
          href="/gallery"
          className="flex items-center gap-1.5 text-sm text-[#b0b0d0] hover:text-white transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Gallery
        </a>
        <div className="flex-1" />
        <h1 className="text-sm font-bold text-white">Photo Comparison</h1>
        <div className="flex-1" />
        {scoreDelta !== null && (
          <span
            className="text-sm font-black px-3 py-1 rounded-lg"
            style={
              scoreDelta > 0
                ? { background: '#00e09620', color: '#00e096' }
                : scoreDelta < 0
                ? { background: '#ff6b9d20', color: '#ff6b9d' }
                : { background: '#22224050', color: '#b0b0d0' }
            }
          >
            {scoreDelta > 0 ? '+' : ''}{scoreDelta} pts
          </span>
        )}
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Full-screen comparison slider */}
        {subA.photo_url && subB.photo_url ? (
          <PhotoComparison
            beforeUrl={subA.photo_url}
            afterUrl={subB.photo_url}
            beforeLabel={subA.store_name ?? 'Photo A'}
            afterLabel={subB.store_name ?? 'Photo B'}
            beforeScore={subA.score}
            afterScore={subB.score}
          />
        ) : (
          <div className="aspect-video bg-[#0c0c18] border border-[#222240] rounded-2xl flex items-center justify-center">
            <p className="text-[#b0b0d0] text-sm">One or both submissions have no photo.</p>
          </div>
        )}

        {/* Meta cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SubmissionMeta sub={subA} slot="A" />
          <SubmissionMeta sub={subB} slot="B" />
        </div>

        {/* Findings diff */}
        {(resolved.length > 0 || appeared.length > 0) && (
          <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
            <h2 className="font-bold text-white text-sm uppercase tracking-wider mb-4">Findings Difference</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#00e096] uppercase tracking-wider">
                  In A only — likely resolved ({resolved.length})
                </div>
                {resolved.length === 0 ? (
                  <p className="text-xs text-[#b0b0d0] italic">None</p>
                ) : (
                  <ul className="space-y-1.5">
                    {resolved.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#b0b0d0]">
                        <span className="text-[#00e096] font-bold mt-0.5 flex-shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#ff6b9d] uppercase tracking-wider">
                  In B only — new issues ({appeared.length})
                </div>
                {appeared.length === 0 ? (
                  <p className="text-xs text-[#b0b0d0] italic">None</p>
                ) : (
                  <ul className="space-y-1.5">
                    {appeared.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#b0b0d0]">
                        <span className="text-[#ff6b9d] font-bold mt-0.5 flex-shrink-0">!</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
