'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Users, TrendingUp } from 'lucide-react'

type LeaderboardRow = {
  rank: number
  collector_id: string
  display_name: string
  tasks_completed: number
  avg_score: number
  total_earned_pence: number
  acceptance_rate: number
}

type Period = 'all_time' | 'month' | 'week'

const PERIOD_LABELS: Record<Period, string> = {
  all_time: 'All Time',
  month: 'This Month',
  week: 'This Week',
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl" title="Gold">🥇</span>
  if (rank === 2) return <span className="text-2xl" title="Silver">🥈</span>
  if (rank === 3) return <span className="text-2xl" title="Bronze">🥉</span>
  return (
    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1a1a2e] text-[#b0b0d0] text-sm font-bold">
      {rank}
    </span>
  )
}

function ScoreColor(score: number | null): string {
  if (score == null) return '#b0b0d0'
  if (score >= 85) return '#00e096'
  if (score >= 65) return '#f0c040'
  return '#ff4d6d'
}

function TaskBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-white font-bold text-sm w-8 text-right">{value}</span>
      <div className="w-20 h-1.5 rounded-full bg-[#222240] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#7c6df5]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function CollectorsClient({
  initialLeaderboard,
  orgId,
}: {
  initialLeaderboard: LeaderboardRow[]
  orgId: string | null
}) {
  const [period, setPeriod] = useState<Period>('all_time')
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>(initialLeaderboard)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (period === 'all_time' && leaderboard === initialLeaderboard) return
    setLoading(true)
    const supabase = createClient()
    supabase
      .rpc('get_collector_leaderboard', { p_org_id: orgId, p_period: period })
      .then(({ data }) => {
        setLeaderboard(data ?? [])
        setLoading(false)
      })
  }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  const maxTasks = Math.max(...leaderboard.map(r => r.tasks_completed), 1)
  const totalCollectors = leaderboard.length
  const avgTasks =
    totalCollectors > 0
      ? Math.round(leaderboard.reduce((s, r) => s + r.tasks_completed, 0) / totalCollectors)
      : 0

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Collector Leaderboard</h1>
        <p className="text-[#b0b0d0] mt-1">Top performers across your campaigns</p>
      </div>

      {/* Performance summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#7c6df5]/15 flex items-center justify-center">
            <Users size={20} className="text-[#7c6df5]" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{totalCollectors}</div>
            <div className="text-xs text-[#b0b0d0] font-semibold mt-0.5">Active Collectors</div>
          </div>
        </div>
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#00d4d4]/15 flex items-center justify-center">
            <TrendingUp size={20} className="text-[#00d4d4]" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{avgTasks}</div>
            <div className="text-xs text-[#b0b0d0] font-semibold mt-0.5">Avg Tasks / Collector</div>
          </div>
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 mb-6 bg-[#0c0c18] border border-[#222240] rounded-xl p-1 w-fit">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              period === p
                ? 'bg-[#7c6df5] text-white'
                : 'text-[#b0b0d0] hover:text-white'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#b0b0d0]">Loading…</div>
        ) : leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Trophy size={32} className="text-[#222240]" />
            <span className="text-[#b0b0d0] text-sm">No scored submissions yet</span>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#222240]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider w-16">Rank</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Collector</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Tasks</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Avg Score</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-[#b0b0d0] uppercase tracking-wider">Earned</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, i) => (
                <tr
                  key={row.collector_id}
                  className={`border-b border-[#222240]/50 last:border-0 transition-colors hover:bg-white/[0.02] ${
                    i < 3 ? 'bg-[#7c6df5]/[0.03]' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <RankBadge rank={row.rank} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-white font-semibold text-sm">{row.display_name}</span>
                  </td>
                  <td className="px-4 py-4">
                    <TaskBar value={row.tasks_completed} max={maxTasks} />
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className="text-sm font-bold"
                      style={{ color: ScoreColor(row.avg_score) }}
                    >
                      {row.avg_score != null ? `${row.avg_score}%` : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[#00e096] font-bold text-sm">
                      £{((row.total_earned_pence ?? 0) / 100).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
