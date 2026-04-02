import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Trophy } from 'lucide-react-native'
import { supabase } from '../../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type LeaderboardRow = {
  rank: number
  collector_id: string
  display_name: string
  tasks_completed: number
  avg_score: number | null
  total_earned_pence: number
  acceptance_rate: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rankLabel(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return String(rank)
}

function scoreColor(score: number | null): string {
  if (score == null) return '#b0b0d0'
  if (score >= 85) return '#00e096'
  if (score >= 65) return '#f0c040'
  return '#ff4d6d'
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setMyId(user?.id ?? null)

    // Get org_id from profile
    let orgId: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      orgId = profile?.organization_id ?? null
    }

    const { data } = await supabase.rpc('get_collector_leaderboard', {
      p_org_id: orgId,
      p_period: 'all_time',
    })

    setRows((data ?? []).slice(0, 20))
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color="#7c6df5" />
      </View>
    )
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Leaderboard</Text>
        <Trophy size={22} color="#7c6df5" />
      </View>

      <FlatList
        data={rows}
        keyExtractor={item => item.collector_id}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c6df5" />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No ranked collectors yet</Text>
            <Text style={s.emptyText}>Complete scored tasks to appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.collector_id === myId
          const medal = item.rank <= 3
          return (
            <View style={[s.row, isMe && s.rowMe, medal && s.rowMedal]}>
              {/* Rank */}
              <View style={s.rankCol}>
                {item.rank <= 3 ? (
                  <Text style={s.medalEmoji}>{rankLabel(item.rank)}</Text>
                ) : (
                  <View style={s.rankBadge}>
                    <Text style={s.rankNum}>{item.rank}</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={s.info}>
                <Text style={[s.name, isMe && s.nameMe]} numberOfLines={1}>
                  {item.display_name}{isMe ? ' (You)' : ''}
                </Text>
                <Text style={s.tasks}>{item.tasks_completed} tasks</Text>
              </View>

              {/* Score + earned */}
              <View style={s.right}>
                <Text style={[s.score, { color: scoreColor(item.avg_score) }]}>
                  {item.avg_score != null ? `${item.avg_score}%` : '—'}
                </Text>
                <Text style={s.earned}>
                  £{((item.total_earned_pence ?? 0) / 100).toFixed(2)}
                </Text>
              </View>
            </View>
          )
        }}
      />
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030305' },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#222240',
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#ffffff', letterSpacing: -0.5 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
  },
  rowMe: {
    borderColor: '#7c6df5',
    backgroundColor: '#7c6df5/10',
  },
  rowMedal: {
    borderColor: '#7c6df5/40',
    backgroundColor: '#7c6df5/05',
  },

  rankCol: { width: 40, alignItems: 'center' },
  medalEmoji: { fontSize: 26 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: { fontSize: 12, fontWeight: '700', color: '#b0b0d0' },

  info: { flex: 1, marginLeft: 10 },
  name: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  nameMe: { color: '#a89cf7' },
  tasks: { fontSize: 12, color: '#b0b0d0', marginTop: 2 },

  right: { alignItems: 'flex-end', gap: 4 },
  score: { fontSize: 14, fontWeight: '800' },
  earned: { fontSize: 12, color: '#00e096', fontWeight: '600' },

  empty: { alignItems: 'center', padding: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#b0b0d0', textAlign: 'center' },
})
