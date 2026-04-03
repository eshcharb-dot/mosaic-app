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
import { TrendingUp, Settings, Gift } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAppTheme } from '../../lib/ThemeContext'

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
  const { tokens } = useAppTheme()
  if (!tier) return null
  const color = TIER_COLORS[tier] ?? tokens.muted
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

function getStatusColors(tokens: ReturnType<typeof useAppTheme>['tokens']): Record<string, string> {
  return {
    approved: tokens.green,
    pending: tokens.purple,
    submitted: tokens.cyan,
    rejected: tokens.red,
  }
}

// ── Skeleton placeholder ───────────────────────────────────────────────────────

function SkeletonBlock({ height = 16, width = '100%' as any, radius = 8, style = {} }) {
  const { tokens } = useAppTheme()
  return <View style={[{ height, width, borderRadius: radius, backgroundColor: tokens.card }, style]} />
}

function HeroSkeleton() {
  const { tokens } = useAppTheme()
  return (
    <View style={[s.heroCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
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
  const { tokens } = useAppTheme()
  if (myRank === undefined) return null

  return (
    <View style={[r.card, { backgroundColor: tokens.card, borderColor: tokens.purple + '40' }]}>
      <Text style={[r.cardLabel, { color: tokens.muted }]}>YOUR RANKING</Text>
      {myRank === null ? (
        <>
          <Text style={[r.unrankedTitle, { color: tokens.text }]}>Not ranked yet</Text>
          <Text style={[r.unrankedSub, { color: tokens.muted }]}>Complete your first task to get ranked</Text>
        </>
      ) : (
        <>
          <View style={r.topRow}>
            {rankMedal(myRank.percentile) !== '' && (
              <Text style={r.medal}>{rankMedal(myRank.percentile)}</Text>
            )}
            <Text style={[r.percentile, { color: tokens.purple }]}>Top {Math.round(100 - myRank.percentile + 1)}%</Text>
          </View>
          <Text style={[r.rankDetail, { color: tokens.muted }]}>
            #{myRank.rank} of {myRank.total_collectors} collectors
          </Text>
        </>
      )}
    </View>
  )
}

// ── Referral bonus card ───────────────────────────────────────────────────────

function ReferralBonusCard({
  bonusCents,
  referralCount,
}: {
  bonusCents: number
  referralCount: number
}) {
  const { tokens } = useAppTheme()
  if (bonusCents <= 0) return null
  const pounds = (bonusCents / 100).toFixed(2)

  return (
    <View style={[rb.card, { backgroundColor: tokens.card, borderColor: tokens.purple + '40' }]}>
      <View style={rb.row}>
        <View style={[rb.iconWrap, { backgroundColor: tokens.purple + '26' }]}>
          <Gift size={16} color={tokens.purple} />
        </View>
        <View style={rb.info}>
          <Text style={[rb.label, { color: tokens.text }]}>Referral Bonuses</Text>
          <Text style={[rb.sub, { color: tokens.muted }]}>
            £{pounds} from {referralCount} referral{referralCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <Text style={[rb.amount, { color: tokens.purple }]}>£{pounds}</Text>
      </View>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function EarningsScreen() {
  const router = useRouter()
  const { tokens } = useAppTheme()

  const [earnings, setEarnings] = useState<Earnings | null>(null)
  const [history, setHistory] = useState<TaskHistoryItem[]>([])
  const [myRank, setMyRank] = useState<MyRank | null | undefined>(undefined)
  const [collectorTier, setCollectorTier] = useState<string | null>(null)
  const [referralBonusCents, setReferralBonusCents] = useState(0)
  const [referralCount, setReferralCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [payoutLoading, setPayoutLoading] = useState(false)

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
      supabase
        .from('profiles')
        .select('collector_tier, referral_bonus_earned_cents')
        .eq('id', user.id)
        .single(),
    ])

    setEarnings(
      earningsRes.data ?? { total_earned: 0, pending_payout: 0, this_week_earned: 0 }
    )
    setHistory(historyRes.data ?? [])
    const rankRow = Array.isArray(rankRes.data) ? rankRes.data[0] : rankRes.data
    setMyRank(rankRow ?? null)
    setCollectorTier(profileRes.data?.collector_tier ?? null)
    setReferralBonusCents(profileRes.data?.referral_bonus_earned_cents ?? 0)

    // Count distinct referees who triggered a bonus event
    const { data: refEvents } = await supabase
      .from('referral_events')
      .select('referee_id')
      .eq('referrer_id', user.id)
      .in('event_type', ['first_task', 'tenth_task'])
    if (refEvents) {
      const unique = new Set(refEvents.map((e: any) => e.referee_id))
      setReferralCount(unique.size)
    }

    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

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

  const totalEarned = earnings?.total_earned ?? 0
  const pending = earnings?.pending_payout ?? 0
  const thisWeek = earnings?.this_week_earned ?? 0
  const canWithdraw = pending >= 5
  const statusColors = getStatusColors(tokens)

  function formatDate(iso?: string): string {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <View style={[s.container, { backgroundColor: tokens.bg }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: tokens.border }]}>
        <View style={s.headerLeft}>
          <Text style={[s.headerTitle, { color: tokens.text }]}>Earnings</Text>
          <TierPill tier={collectorTier} />
        </View>
        <View style={s.headerRight}>
          <TrendingUp size={20} color={tokens.purple} />
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={s.gearBtn} hitSlop={12}>
            <Settings size={20} color={tokens.muted} />
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
              tintColor={tokens.purple}
            />
          }
          ListHeaderComponent={
            <>
              {/* Hero card */}
              <View style={[s.heroCard, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
                <Text style={[s.heroLabel, { color: tokens.muted }]}>TOTAL EARNED</Text>
                <Text style={[s.heroAmount, { color: tokens.green }]}>£{totalEarned.toFixed(2)}</Text>

                <View style={s.subStats}>
                  <View style={s.subStat}>
                    <Text style={[s.subStatLabel, { color: tokens.muted }]}>Pending</Text>
                    <Text style={[s.subStatValue, { color: tokens.text }]}>£{pending.toFixed(2)}</Text>
                  </View>
                  <View style={[s.subStatDivider, { backgroundColor: tokens.border }]} />
                  <View style={s.subStat}>
                    <Text style={[s.subStatLabel, { color: tokens.muted }]}>This week</Text>
                    <Text style={[s.subStatValue, { color: tokens.text }]}>£{thisWeek.toFixed(2)}</Text>
                  </View>
                </View>

                {canWithdraw ? (
                  <TouchableOpacity
                    style={[s.withdrawBtn, { backgroundColor: tokens.purple }, payoutLoading && s.withdrawBtnDisabled]}
                    onPress={handleWithdraw}
                    disabled={payoutLoading}
                  >
                    {payoutLoading ? (
                      <ActivityIndicator size="small" color={tokens.bg} />
                    ) : (
                      <Text style={[s.withdrawBtnText, { color: tokens.bg }]}>Withdraw £{pending.toFixed(2)}</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={[s.withdrawBtnLocked, { borderColor: tokens.border }]}>
                    <Text style={[s.withdrawBtnLockedText, { color: tokens.muted }]}>Min. £5 to withdraw</Text>
                  </View>
                )}
              </View>

              {/* Referral bonus row */}
              <ReferralBonusCard
                bonusCents={referralBonusCents}
                referralCount={referralCount}
              />

              {/* Ranking card */}
              <RankingCard myRank={myRank} />

              {/* History header */}
              {history.length > 0 && (
                <Text style={[s.sectionTitle, { color: tokens.muted }]}>Task History</Text>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={[s.emptyTitle, { color: tokens.text }]}>No tasks yet</Text>
              <Text style={[s.emptyText, { color: tokens.muted }]}>Complete tasks to start earning.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusColor = statusColors[item.status] ?? tokens.muted
            return (
              <View style={[s.taskRow, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
                <View style={s.taskInfo}>
                  <Text style={[s.taskStore, { color: tokens.text }]} numberOfLines={1}>{item.store_name}</Text>
                  <Text style={[s.taskCampaign, { color: tokens.muted }]} numberOfLines={1}>{item.campaign_name}</Text>
                  <Text style={[s.taskDate, { color: tokens.purple }]}>{formatDate(item.submitted_at)}</Text>
                </View>
                <View style={s.taskRight}>
                  <Text style={[s.taskPayout, { color: tokens.green }]}>£{item.payout_amount.toFixed(2)}</Text>
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
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  gearBtn: { padding: 4 },

  heroCard: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  heroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  heroAmount: { fontSize: 52, fontWeight: '900', letterSpacing: -1 },

  subStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 0,
  },
  subStat: { alignItems: 'center', paddingHorizontal: 20 },
  subStatLabel: { fontSize: 11, fontWeight: '600', marginBottom: 3 },
  subStatValue: { fontSize: 18, fontWeight: '800' },
  subStatDivider: { width: 1, height: 36 },

  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 10,
    minWidth: 200,
  },
  withdrawBtnDisabled: { opacity: 0.6 },
  withdrawBtnText: { fontSize: 15, fontWeight: '800' },

  withdrawBtnLocked: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 10,
  },
  withdrawBtnLockedText: { fontSize: 14, fontWeight: '600' },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  taskRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskInfo: { flex: 1, marginRight: 12 },
  taskStore: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  taskCampaign: { fontSize: 13, marginBottom: 4 },
  taskDate: { fontSize: 12, fontWeight: '600' },
  taskRight: { alignItems: 'flex-end', gap: 6 },
  taskPayout: { fontSize: 18, fontWeight: '900' },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  empty: { alignItems: 'center', padding: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },
})

const r = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  medal: { fontSize: 28 },
  percentile: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  rankDetail: { fontSize: 14, fontWeight: '600' },
  unrankedTitle: { fontSize: 18, fontWeight: '800' },
  unrankedSub: { fontSize: 13, textAlign: 'center' },
})

const rb = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  label: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12 },
  amount: { fontSize: 18, fontWeight: '900' },
})
