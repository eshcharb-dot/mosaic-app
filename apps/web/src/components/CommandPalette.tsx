'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Megaphone, Store, Image, Loader2 } from 'lucide-react'

interface SearchResults {
  campaigns: { id: string; name: string; status: string; compliance_score: number | null }[]
  stores: { id: string; name: string; city: string | null; address: string | null }[]
  submissions: { id: string; store_name: string | null; campaign_name: string | null; submitted_at: string | null; score: number | null }[]
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <strong className="text-white font-bold">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  )
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ campaigns: [], stores: [], submissions: [] })
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults({ campaigns: [], stores: [], submissions: [] })
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced search
  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) {
      setResults({ campaigns: [], stores: [], submissions: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data)
        setActiveIndex(0)
      } catch {
        // silently ignore
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  useEffect(() => {
    doSearch(query)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, doSearch])

  // Build flat list for keyboard nav
  const flatItems: { type: 'campaign' | 'store' | 'submission'; id: string; href: string }[] = [
    ...results.campaigns.map(c => ({ type: 'campaign' as const, id: c.id, href: `/campaigns/${c.id}` })),
    ...results.stores.map(s => ({ type: 'store' as const, id: s.id, href: `/stores/${s.id}` })),
    ...results.submissions.map(s => ({ type: 'submission' as const, id: s.id, href: `/gallery` })),
  ]

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, flatItems.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && flatItems[activeIndex]) {
      router.push(flatItems[activeIndex].href)
      onClose()
    }
  }

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  const totalResults = results.campaigns.length + results.stores.length + results.submissions.length
  const hasQuery = query.length >= 2

  if (!open) return null

  let itemIdx = 0

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full mx-4 bg-[#0c0c18] border border-[#222240] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#222240]">
          {loading
            ? <Loader2 size={18} className="text-[#7c6df5] animate-spin flex-shrink-0" />
            : <Search size={18} className="text-[#b0b0d0] flex-shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search campaigns, stores, submissions..."
            className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-[#b0b0d0]/50"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[#222240] rounded text-[10px] text-[#b0b0d0] font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {!hasQuery && (
            <div className="px-5 py-8 text-center text-[#b0b0d0] text-sm">
              Start typing to search...
            </div>
          )}

          {hasQuery && !loading && totalResults === 0 && (
            <div className="px-5 py-8 text-center text-[#b0b0d0] text-sm">
              No results for <span className="text-white font-medium">"{query}"</span>
            </div>
          )}

          {results.campaigns.length > 0 && (
            <div>
              <div className="px-5 py-2 text-[10px] font-semibold text-[#b0b0d0] uppercase tracking-wider border-b border-[#222240]/50 bg-[#030305]/40">
                Campaigns
              </div>
              {results.campaigns.map(c => {
                const myIdx = itemIdx++
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                      activeIndex === myIdx ? 'bg-[#7c6df5]/15' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#7c6df5]/15 flex items-center justify-center flex-shrink-0">
                      <Megaphone size={15} className="text-[#7c6df5]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#b0b0d0]">{highlight(c.name, query)}</div>
                      <div className="text-xs text-[#b0b0d0]/60 mt-0.5 capitalize">{c.status}</div>
                    </div>
                    {c.compliance_score !== null && (
                      <span className="text-xs font-bold text-[#00e096] flex-shrink-0">{Math.round(c.compliance_score)}%</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {results.stores.length > 0 && (
            <div>
              <div className="px-5 py-2 text-[10px] font-semibold text-[#b0b0d0] uppercase tracking-wider border-b border-[#222240]/50 bg-[#030305]/40">
                Stores
              </div>
              {results.stores.map(s => {
                const myIdx = itemIdx++
                const subtitle = [s.city, s.address].filter(Boolean).join(' · ')
                return (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/stores/${s.id}`)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                      activeIndex === myIdx ? 'bg-[#7c6df5]/15' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#00d4d4]/10 flex items-center justify-center flex-shrink-0">
                      <Store size={15} className="text-[#00d4d4]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#b0b0d0]">{highlight(s.name, query)}</div>
                      {subtitle && <div className="text-xs text-[#b0b0d0]/60 mt-0.5 truncate">{subtitle}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {results.submissions.length > 0 && (
            <div>
              <div className="px-5 py-2 text-[10px] font-semibold text-[#b0b0d0] uppercase tracking-wider border-b border-[#222240]/50 bg-[#030305]/40">
                Recent Submissions
              </div>
              {results.submissions.map(s => {
                const myIdx = itemIdx++
                return (
                  <button
                    key={s.id}
                    onClick={() => navigate('/gallery')}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                      activeIndex === myIdx ? 'bg-[#7c6df5]/15' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#ffc947]/10 flex items-center justify-center flex-shrink-0">
                      <Image size={15} className="text-[#ffc947]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#b0b0d0]">{highlight(s.store_name ?? 'Unknown store', query)}</div>
                      <div className="text-xs text-[#b0b0d0]/60 mt-0.5">{s.campaign_name ?? '—'}</div>
                    </div>
                    {s.score !== null && (
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: s.score >= 80 ? '#00e096' : s.score >= 60 ? '#ffc947' : '#ff4d6d' }}>
                        {Math.round(s.score)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-5 py-3 border-t border-[#222240] bg-[#030305]/40">
          <span className="text-[10px] text-[#b0b0d0]/50 flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-[#222240] rounded text-[9px] font-mono">↑↓</kbd> navigate
          </span>
          <span className="text-[10px] text-[#b0b0d0]/50 flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-[#222240] rounded text-[9px] font-mono">↵</kbd> open
          </span>
          <span className="text-[10px] text-[#b0b0d0]/50 flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-[#222240] rounded text-[9px] font-mono">?</kbd> shortcuts
          </span>
        </div>
      </div>
    </div>
  )
}
