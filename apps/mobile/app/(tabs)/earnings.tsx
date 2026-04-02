import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { TrendingUp, Settings } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type Earnings = {
  total_earned: number
  pending_payout: number
  this_week_earned: number
}

type TaskHistoryItem = {
  task_id: string
  store_name: string
  campaign_name: string
  payout_amount: number
  status: string
  submitted_at: string
}

type MyRank = {
  rank: number
  total_collectors: number
  percentile: number
}

// ── Tier helpers ──────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold:   '#ffd700',
  elite:  '#7c6df5',
}

function TierPill({ tier }: { tier: string | null }) {
  if (!tier) return null
  const color = TIER_COLORS[tier] ?? '#b0b0d0'
  const label = tier.charAt(0).toUpperCase() + tier.slice(1)
  return (
    <View style={[tp.pill, { borderColor: color + '55', backgroundColor: color + '18' }]}>
      <View style={[tp.dot, { backgroundColor: color }]} />
      <Text style={[tp.text, { color }]}>{label}</Text>
    </View>
  )
}

const tp = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '700' },
})

// ── Status badge colours ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  approved: '#00e096',
  pending: '#7c6df5',
  submitted: '#00d4d4',
  rejected: '#ff4d6d',
}

// ── Skeleton placeholder ───────────────────────────────────────────────────────

function SkeletonBlock({ height = 16, width = '100%' as any, radius = 8, style = {} }) {
  return <View style={[{ height, width, borderRadius: radius, backgroundColor: '#1a1a2e' }, style]} />
}

function HeroSkeleton() {
  return (
    <View style={s.heroCard}>
      <SkeletonBlock height={13} width={80} />
      <SkeletonBlock height={52} width={160} radius={10} style={{ marginTop: 8 }} />
      <View style={{ flexDirection: 'row', gap: 24, marginTop: 8 }}>
        <SkeletonBlock height={13} width={90} />
        <SkeletonBlock height={13} width={90} />
      </View>
      <SkeletonBlock height={46} width={200} radius={14} style={{ marginTop: 12 }} />
    </View>
  )
}

// ── Ranking card ──────────────────────────────────────────────────────────────

function rankMedal(percentile: number): string {
  if (percentile >= 90) return '🥇'
  if (percentile >= 75) return '🥈'
  if (percentile >= 50) return '🥉'
  return ''
}

function RankingCard({ myRank }: { myRank: MyRank | null | undefined }) {
  // undefined = still loading, null = no rank yet
  if (myRank === undefined) return null

  return (
    <View style={r.card}>
      <Text style={r.cardLabel}>YOUR RANKING</Text>
      {myRank === null ? (
        <>
          <Text style={r.unrankedTitle}>Not ranked yet</Text>
          <Text style={r.unrankedSub}>Complete your first task to get ranked</Text>
        </>
      ) : (
        <>
          <View style={r.topRow}>
            {rankMedal(myRank.percentile) !== '' && (
              <Text style={r.medal}>{rankMedal(myRank.percentile)}</Text>
            )}
            <Text style={r.percentile}>Top {Math.round(100 - myRank.percentile + 1)}%</Text>
          </View>
          <Text style={r.rankDetail}>
            #{myRank.rank} of {myRank.total_collectors} collectors
          </Text>
        </>
      )}
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function EarningsScreen() {
  const router = useRouter()

  const [earnings, setEarnings] = useState<Earnings | null>(null)
  const [history, setHistory] = useState<TaskHistoryItem[]>([])
  const [myRank, setMyRank] = useState<MyRank | null | undefined>(undefined) // undefined = loading
  const [collectorTier, setCollectorTier] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [payoutLoading, setPayoutLoading] = useState(false)

  // ── Data fetching ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    const [earningsRes, historyRes, rankRes, profileRes] = await Promise.all([
      supabase.rpc('get_collector_earnings', { collector_id: user.id }),
      supabase.rpc('get_collector_task_history', { collector_id: user.id, limit_n: 20 }),
      supabase.rpc('get_my_rank', { p_collector_id: user.id }),
      supabase.from('profiles').select('collector_tier').eq('id', user.id).single(),
    ])

    setEarnings(
      earningsRes.data ?? { total_earned: 0, pending_payout: 0, this_week_earned: 0 }
    )
    setHistory(historyRes.data ?? [])
    // get_my_rank returns an array of rows; first row is the result
    const rankRow = Array.isArray(rankRes.data) ? rankRes.data[0] : rankRes.data
    setMyRank(rankRow ?? null)
    setCollectorTier(profileRes.data?.collector_tier ?? null)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Payout ────────────────────────────────────────────────────────────────────

  async function handleWithdraw() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setPayoutLoading(true)
    const { error } = await supabase.rpc('request_payout', { collector_id: user.id })
    setPayoutLoading(false)

    if (error) {
      Alert.alert('Payout failed', error.message ?? 'Something went wrong. Please try again.')
    } else {
      Alert.alert('Payout requested!', 'Processing in 1–2 business days.')
      loadData()
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────────

  const totalEarned = earnings?.total_earned ?? 0
  const pending = earnings?.pending_payout ?? 0
  const thisWeek = earnings?.this_week_earned ?? 0
  const canWithdraw = pending >= 5

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function formatDate(iso?: string): string {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>Earnings</Text>
          <TierPill tier={collectorTier} />
        </View>
        <View style={s.headerRight}>
          <TrendingUp size={20} color="#7c6df5" />
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={s.gearBtn} hitSlop={12}>
            <Settings size={20} color="#b0b0d0" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <HeroSkeleton />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.task_id}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadData() }}
              tintColor="#7c6df5"
            />
          }
          ListHeaderComponent={
            <>
              {/* Hero card */}
              <View style={s.heroCard}>
                <Text style={s.heroLabel}>TOTAL EARNED</Text>
                <Text style={s.heroAmount}>£{totalEarned.toFixed(2)}</Text>

                {/* Sub-stats */}
                <View style={s.subStats}>
                  <View style={s.subStat}>
                    <Text style={s.subStatLabel}>Pending</Text>
                    <Text style={s.subStatValue}>£{pending.toFixed(2)}</Text>
                  </View>
                  <View style={s.subStatDivider} />
                  <View style={s.subStat}>
                    <Text style={s.subStatLabel}>This week</Text>
                    <Text style={s.subStatValue}>£{thisWeek.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Withdraw button */}
                {canWithdraw ? (
                  <TouchableOpacity
                    style={[s.withdrawBtn, payoutLoading && s.withdrawBtnDisabled]}
                    onPress={handleWithdraw}
                    disabled={payoutLoading}
                  >
                    {payoutLoading ? (
                      <ActivityIndicator size="small" color="#030305" />
                    ) : (
                      <Text style={s.withdrawBtnText}>Withdraw £{pending.toFixed(2)}</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={s.withdrawBtnLocked}>
                    <Text style={s.withdrawBtnLockedText}>Min. £5 to withdraw</Text>
                  </View>
                )}
              </View>

              {/* Ranking card */}
              <RankingCard myRank={myRank} />

              {/* History header */}
              {history.length > 0 && (
                <Text style={s.sectionTitle}>Task History</Text>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No tasks yet</Text>
              <Text style={s.emptyText}>Complete tasks to start earning.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusColor = STATUS_COLORS[item.status] ?? '#b0b0d0'
            return (
              <View style={s.taskRow}>
                <View style={s.taskInfo}>
                  <Text style={s.taskStore} numberOfLines={1}>{item.store_name}</Text>
                  <Text style={s.taskCampaign} numberOfLines={1}>{item.campaign_name}</Text>
                  <Text style={s.taskDate}>{formatDate(item.submitted_at)}</Text>
                </View>
                <View style={s.taskRight}>
                  <Text style={s.taskPayout}>£{item.payout_amount.toFixed(2)}</Text>
                  <View style={[s.statusBadge, { borderColor: statusColor + '55', backgroundColor: statusColor + '18' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>{item.status}</Text>
                  </View>
                </View>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030305' },

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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  gearBtn: { padding: 4 },

  heroCard: {
    margin: 16,
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  heroLabel: { fontSize: 11, fontWeight: '700', color: '#b0b0d0', letterSpacing: 1.5 },
  heroAmount: { fontSize: 52, fontWeight: '900', color: '#00e096', letterSpacing: -1 },

  subStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 0,
  },
  subStat: { alignItems: 'center', paddingHorizontal: 20 },
  subStatLabel: { fontSize: 11, color: '#b0b0d0', fontWeight: '600', marginBottom: 3 },
  subStatValue: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  subStatDivider: { width: 1, height: 36, backgroundColor: '#222240' },

  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c6df5',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 10,
    minWidth: 200,
  },
  withdrawBtnDisabled: { opacity: 0.6 },
  withdrawBtnText: { fontSize: 15, fontWeight: '800', color: '#030305' },

  withdrawBtnLocked: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 10,
  },
  withdrawBtnLockedText: { fontSize: 14, fontWeight: '600', color: '#b0b0d0' },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b0b0d0',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  taskRow: {
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskInfo: { flex: 1, marginRight: 12 },
  taskStore: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 3 },
  taskCampaign: { fontSize: 13, color: '#b0b0d0', marginBottom: 4 },
  taskDate: { fontSize: 12, color: '#7c6df5', fontWeight: '600' },
  taskRight: { alignItems: 'flex-end', gap: 6 },
  taskPayout: { fontSize: 18, fontWeight: '900', color: '#00e096' },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  empty: { alignItems: 'center', padding: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#b0b0d0', textAlign: 'center' },
})

const r = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#7c6df5/40',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#b0b0d0', letterSpacing: 1.5 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  medal: { fontSize: 28 },
  percentile: { fontSize: 36, fontWeight: '900', color: '#7c6df5', letterSpacing: -1 },
  rankDetail: { fontSize: 14, color: '#b0b0d0', fontWeight: '600' },
  unrankedTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  unrankedSub: { fontSize: 13, color: '#b0b0d0', textAlign: 'center' },
})
