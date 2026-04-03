'use client'
import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface Collector {
  id: string
  full_name: string | null
  email: string | null
  collector_tier: string | null
  tasks_completed: number | null
  total_earnings_cents: number | null
  created_at: string
}

const TIERS = ['all', 'elite', 'gold', 'silver', 'bronze']

const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  elite: { bg: '#7c6df51a', text: '#7c6df5' },
  gold: { bg: '#ffc9471a', text: '#ffc947' },
  silver: { bg: '#b0b0d01a', text: '#b0b0d0' },
  bronze: { bg: '#cd7f321a', text: '#cd7f32' },
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-xs text-[#b0b0d0]">—</span>
  const style = TIER_STYLES[tier] ?? { bg: '#1a1a30', text: '#b0b0d0' }
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: style.bg, color: style.text }}
    >
      {tier}
    </span>
  )
}

function fmt(d: string) {
  try { return format(parseISO(d), 'MMM d, yyyy') } catch { return '—' }
}

export default function CollectorsClient({ collectors }: { collectors: Collector[] }) {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return collectors.filter(c => {
      if (tierFilter !== 'all' && c.collector_tier !== tierFilter) return false
      if (q) {
        const name = (c.full_name ?? '').toLowerCase()
        const email = (c.email ?? '').toLowerCase()
        return name.includes(q) || email.includes(q)
      }
      return true
    })
  }, [collectors, search, tierFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Collectors</h1>
          <p className="text-[#b0b0d0] mt-1">{collectors.length} total collectors</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tier filter */}
          <div className="flex items-center gap-1 bg-[#0c0c18] border border-[#222240] rounded-xl p-1">
            {TIERS.map(t => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  tierFilter === t
                    ? 'bg-[#7c6df5] text-white'
                    : 'text-[#b0b0d0] hover:text-white hover:bg-white/5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0d0]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search collectors..."
              className="bg-[#0c0c18] border border-[#222240] rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder-[#b0b0d0] focus:outline-none focus:border-[#7c6df5] w-56"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#222240]">
            <tr>
              {['Name', 'Email', 'Tier', 'Tasks Completed', 'Earnings', 'Joined'].map(h => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-[#b0b0d0] uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[#b0b0d0] text-sm">
                  No collectors found
                </td>
              </tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-[#222240] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3.5 text-sm font-medium text-white">{c.full_name ?? '—'}</td>
                <td className="px-4 py-3.5 text-sm text-[#b0b0d0]">{c.email ?? '—'}</td>
                <td className="px-4 py-3.5"><TierBadge tier={c.collector_tier} /></td>
                <td className="px-4 py-3.5 text-sm text-[#b0b0d0]">{c.tasks_completed ?? 0}</td>
                <td className="px-4 py-3.5 text-sm text-[#b0b0d0]">
                  {c.total_earnings_cents != null ? `$${(c.total_earnings_cents / 100).toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3.5 text-sm text-[#b0b0d0]">{fmt(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
