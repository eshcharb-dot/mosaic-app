'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface Org {
  id: string
  name: string
  plan: string
  is_active: boolean
  created_at: string
  member_count: number
  store_count: number
  campaign_count: number
}

type SortKey = keyof Org
type SortDir = 'asc' | 'desc'

const PLAN_STYLES: Record<string, { bg: string; text: string }> = {
  starter: { bg: '#1a1a30', text: '#b0b0d0' },
  growth: { bg: '#7c6df51a', text: '#7c6df5' },
  enterprise: { bg: '#ffc9471a', text: '#ffc947' },
}

function PlanBadge({ plan }: { plan: string }) {
  const style = PLAN_STYLES[plan] ?? PLAN_STYLES.starter
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: style.bg, color: style.text }}
    >
      {plan}
    </span>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronUp size={12} className="text-[#444460]" />
  return dir === 'asc'
    ? <ChevronUp size={12} className="text-[#7c6df5]" />
    : <ChevronDown size={12} className="text-[#7c6df5]" />
}

export default function OrgListClient({ orgs }: { orgs: Org[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return orgs
      .filter(o => !q || o.name.toLowerCase().includes(q) || o.plan.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [orgs, search, sortKey, sortDir])

  const TH = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-[#b0b0d0] uppercase tracking-wide cursor-pointer hover:text-white select-none"
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <SortIcon active={sortKey === col} dir={sortDir} />
      </div>
    </th>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Organizations</h1>
          <p className="text-[#b0b0d0] mt-1">{orgs.length} total organizations</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0b0d0]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search organizations..."
            className="bg-[#0c0c18] border border-[#222240] rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder-[#b0b0d0] focus:outline-none focus:border-[#7c6df5] w-64"
          />
        </div>
      </div>

      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#222240]">
            <tr>
              <TH label="Name" col="name" />
              <TH label="Plan" col="plan" />
              <TH label="Members" col="member_count" />
              <TH label="Stores" col="store_count" />
              <TH label="Campaigns" col="campaign_count" />
              <TH label="Created" col="created_at" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#b0b0d0] uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[#b0b0d0] text-sm">
                  No organizations found
                </td>
              </tr>
            )}
            {filtered.map((org) => (
              <tr
                key={org.id}
                className="border-b border-[#222240] last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                onClick={() => router.push(`/admin/organizations/${org.id}`)}
              >
                <td className="px-4 py-3.5">
                  <span className="text-sm font-semibold text-white">{org.name}</span>
                </td>
                <td className="px-4 py-3.5">
                  <PlanBadge plan={org.plan} />
                </td>
                <td className="px-4 py-3.5 text-sm text-[#b0b0d0]">{org.member_count}</td>
                <td className="px-4 py-3.5 text-sm text-[#b0b0d0]">{org.store_count}</td>
                <td className="px-4 py-3.5 text-sm text-[#b0b0d0]">{org.campaign_count}</td>
                <td className="px-4 py-3.5 text-sm text-[#b0b0d0]">
                  {(() => { try { return format(parseISO(org.created_at), 'MMM d, yyyy') } catch { return '—' } })()}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      org.is_active
                        ? 'bg-[#00e0961a] text-[#00e096]'
                        : 'bg-[#ff4d6d1a] text-[#ff4d6d]'
                    }`}
                  >
                    {org.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-1 text-xs text-[#7c6df5] hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-[#7c6df5]/10"
                    title="Impersonate (opens dashboard — real impersonation requires service role)"
                  >
                    <ExternalLink size={12} />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
