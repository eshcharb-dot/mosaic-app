import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  Clipboard,
} from 'react-native'
import { User, CheckCircle, LogOut, CreditCard, Gift, Copy, Share2 } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useLayout } from '@/lib/useLayout'

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string
  stripe_account_id: string | null
  collector_tier: string | null
  tier_updated_at: string | null
  referral_code: string | null
  referral_bonus_earned_cents: number
  [key: string]: unknown
}

type TierDef = {
  id: string
  name: string
  min_tasks: number
  min_avg_score: number
  payout_multiplier: number
  badge_color: string
  description: string
}

type ReferralStats = {
  friends_joined: number
  friends_completed_task: number
}

const TIERS: TierDef[] = [
  { id: 'bronze', name: 'Bronze', min_tasks: 0,   min_avg_score: 0,  payout_multiplier: 1.0,  badge_color: '#cd7f32', description: 'Just getting started' },
  { id: 'silver', name: 'Silver', min_tasks: 10,  min_avg_score: 70, payout_multiplier: 1.1,  badge_color: '#c0c0c0', description: 'Proven reliability — 10% bonus' },
  { id: 'gold',   name: 'Gold',   min_tasks: 50,  min_avg_score: 80, payout_multiplier: 1.25, badge_color: '#ffd700', description: 'Top performer — 25% bonus' },
  { id: 'elite',  name: 'Elite',  min_tasks: 200, min_avg_score: 90, payout_multiplier: 1.5,  badge_color: '#7c6df5', description: 'Best in class — 50% bonus' },
]

function getTierDef(tierId: string | null): TierDef {
  return TIERS.find(t => t.id === tierId) ?? TIERS[0]
}

function getNextTier(tierId: string | null): TierDef | null {
  const idx = TIERS.findIndex(t => t.id === tierId)
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null
}

// ── Tier Badge Section ────────────────────────────────────────────────────────

function TierSection({ profile, taskCount, avgScore }: {
  profile: Profile
  taskCount: number
  avgScore: number
}) {
  const tier = getTierDef(profile.collector_tier)
  const next = getNextTier(profile.collector_tier)

  const progressPct = next
    ? Math.min(100, Math.round((taskCount / next.min_tasks) * 100))
    : 100

  return (
    <View style={ts.section}>
      <Text style={ts.sectionLabel}>COLLECTOR TIER</Text>
      <View style={ts.card}>
        <View style={[ts.badgeCircle, { backgroundColor: tier.badge_color + '22', borderColor: tier.badge_color + '66' }]}>
          <Text style={[ts.badgeLetter, { color: tier.badge_color }]}>
            {tier.name[0]}
          </Text>
        </View>

        <Text style={[ts.tierName, { color: tier.badge_color }]}>{tier.name}</Text>
        <Text style={ts.tierDesc}>{tier.description}</Text>

        <View style={ts.statsRow}>
          <View style={ts.stat}>
            <Text style={ts.statValue}>{taskCount}</Text>
            <Text style={ts.statLabel}>Tasks done</Text>
          </View>
          <View style={ts.statDivider} />
          <View style={ts.stat}>
            <Text style={ts.statValue}>{avgScore > 0 ? `${avgScore}%` : '—'}</Text>
            <Text style={ts.statLabel}>Avg score</Text>
          </View>
          <View style={ts.statDivider} />
          <View style={ts.stat}>
            <Text style={[ts.statValue, { color: tier.badge_color }]}>
              x{tier.payout_multiplier.toFixed(2)}
            </Text>
            <Text style={ts.statLabel}>Payout bonus</Text>
          </View>
        </View>

        {next ? (
          <View style={ts.progressSection}>
            <View style={ts.progressHeader}>
              <Text style={ts.progressLabel}>Progress to {next.name}</Text>
              <Text style={ts.progressCount}>{taskCount} / {next.min_tasks} tasks</Text>
            </View>
            <View style={ts.progressTrack}>
              <View style={[ts.progressFill, { width: `${progressPct}%` as any, backgroundColor: next.badge_color }]} />
            </View>
            {next.min_avg_score > 0 && (
              <Text style={ts.progressNote}>
                Also need avg score ≥ {next.min_avg_score}%
              </Text>
            )}
          </View>
        ) : (
          <View style={ts.eliteBadge}>
            <Text style={ts.eliteText}>You've reached the top tier</Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ── Refer & Earn Section ──────────────────────────────────────────────────────

function ReferSection({ profile, stats }: { profile: Profile; stats: ReferralStats }) {
  const [copied, setCopied] = useState(false)
  const code = profile.referral_code ?? '—'
  const bonusPounds = (profile.referral_bonus_earned_cents / 100).toFixed(2)
  const shareUrl = `https://mosaic.app/join/${code}`
  const shareMsg = `Join me on Mosaic — earn money by auditing retail shelves! Use my code ${code}: ${shareUrl}`

  function handleCopy() {
    Clipboard.setString(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    try {
      await Share.share({ message: shareMsg })
    } catch {
      // dismissed
    }
  }

  return (
    <View style={rs.section}>
      <Text style={rs.sectionLabel}>REFER &amp; EARN</Text>
      <View style={rs.card}>
        {/* Code display */}
        <Text style={rs.codeLabel}>Your referral code</Text>
        <View style={rs.codeRow}>
          <Text style={rs.code}>{code}</Text>
          <TouchableOpacity style={rs.copyBtn} onPress={handleCopy}>
            <Copy size={14} color={copied ? '#00e096' : '#7c6df5'} />
            <Text style={[rs.copyBtnText, copied && rs.copyBtnTextDone]}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Earnings + stats */}
        <View style={rs.statsRow}>
          <View style={rs.stat}>
            <Text style={rs.statValue}>£{bonusPounds}</Text>
            <Text style={rs.statLabel}>Referral earned</Text>
          </View>
          <View style={rs.statDivider} />
          <View style={rs.stat}>
            <Text style={rs.statValue}>{stats.friends_joined}</Text>
            <Text style={rs.statLabel}>Friends joined</Text>
          </View>
          <View style={rs.statDivider} />
          <View style={rs.stat}>
            <Text style={rs.statValue}>{stats.friends_completed_task}</Text>
            <Text style={rs.statLabel}>Completed tasks</Text>
          </View>
        </View>

        {/* Share button */}
        <TouchableOpacity style={rs.shareBtn} onPress={handleShare}>
          <Share2 size={15} color="#ffffff" />
          <Text style={rs.shareBtnText}>Share your code</Text>
        </TouchableOpacity>

        {/* How it works */}
        <View style={rs.howSection}>
          <Text style={rs.howTitle}>How it works</Text>
          <View style={rs.howSteps}>
            <View style={rs.howStep}>
              <View style={rs.howDot}><Text style={rs.howDotNum}>1</Text></View>
              <Text style={rs.howText}>Friend signs up with your code</Text>
            </View>
            <View style={rs.howConnector} />
            <View style={rs.howStep}>
              <View style={rs.howDot}><Text style={rs.howDotNum}>2</Text></View>
              <Text style={rs.howText}>They complete their first task</Text>
            </View>
            <View style={rs.howConnector} />
            <View style={rs.howStep}>
              <View style={[rs.howDot, rs.howDotGreen]}><Text style={rs.howDotNum}>3</Text></View>
              <Text style={rs.howText}>You earn £5 — and £10 at their 10th task</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter()
  const { mode } = useLayout()

  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [taskCount, setTaskCount] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const [referralStats, setReferralStats] = useState<ReferralStats>({ friends_joined: 0, friends_completed_task: 0 })
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      setEmail(user.email ?? null)

      const [profileRes, statsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase.rpc('get_collector_earnings', { p_collector_id: user.id }),
      ])

      const prof = profileRes.data ?? null
      setProfile(prof)

      if (statsRes.data) {
        const row = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data
        setTaskCount(row?.completed_tasks ?? 0)
      }

      const { data: historyData } = await supabase.rpc('get_collector_task_history', {
        p_collector_id: user.id,
        limit_n: 200,
      })
      if (historyData && Array.isArray(historyData)) {
        const scored = historyData.filter((h: any) => h.score != null)
        if (scored.length > 0) {
          const avg = scored.reduce((s: number, h: any) => s + Number(h.score), 0) / scored.length
          setAvgScore(Math.round(avg))
        }
      }

      // Load referral stats
      if (prof?.id) {
        const { data: eventsData } = await supabase
          .from('referral_events')
          .select('referee_id, event_type')
          .eq('referrer_id', prof.id)

        if (eventsData) {
          const uniqueReferees = new Set(eventsData.map((e: any) => e.referee_id))
          const completedSet = new Set(
            eventsData
              .filter((e: any) => e.event_type === 'first_task' || e.event_type === 'tenth_task')
              .map((e: any) => e.referee_id)
          )
          setReferralStats({
            friends_joined: uniqueReferees.size,
            friends_completed_task: completedSet.size,
          })
        }
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  function handleConnectStripe() {
    Alert.alert(
      'Coming soon',
      'Stripe Connect onboarding is coming soon — contact support@mosaic.app',
    )
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    setSigningOut(false)
    router.replace('/auth')
  }

  const stripeConnected = !!profile?.stripe_account_id

  return (
    <ScrollView style={s.container} contentContainerStyle={[s.scrollContent, mode === 'tablet' && s.scrollContentTablet]}>
      <View style={[mode === 'tablet' && s.tabletInner]}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Profile</Text>
          <User size={22} color="#7c6df5" />
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color="#7c6df5" size="large" />
          </View>
        ) : (
          <>
            {/* Account info */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>ACCOUNT</Text>
              <View style={s.card}>
                <Text style={s.cardLabel}>Email</Text>
                <Text style={s.cardValue}>{email ?? '—'}</Text>
              </View>
            </View>

            {/* Stats cards — 2-col grid on tablet */}
            <View style={[mode === 'tablet' && s.tabletStatsGrid]}>
              {/* Collector Tier */}
              {profile && (
                <View style={[mode === 'tablet' && s.tabletStatsCell]}>
                  <TierSection
                    profile={profile}
                    taskCount={taskCount}
                    avgScore={avgScore}
                  />
                </View>
              )}

              {/* Refer & Earn */}
              {profile && (
                <View style={[mode === 'tablet' && s.tabletStatsCell]}>
                  <ReferSection profile={profile} stats={referralStats} />
                </View>
              )}
            </View>

            {/* Stripe / bank account */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>PAYOUTS</Text>
              <View style={s.card}>
                {stripeConnected ? (
                  <View style={s.stripeConnected}>
                    <CheckCircle size={20} color="#00e096" />
                    <Text style={s.stripeConnectedText}>Bank account connected</Text>
                  </View>
                ) : (
                  <>
                    <Text style={s.cardLabel}>Bank account</Text>
                    <Text style={s.cardSubtext}>
                      Connect your bank to receive payouts directly.
                    </Text>
                    <TouchableOpacity style={s.connectBtn} onPress={handleConnectStripe}>
                      <CreditCard size={16} color="#ffffff" />
                      <Text style={s.connectBtnText}>Connect bank account</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Sign out */}
            <View style={s.section}>
              <TouchableOpacity
                style={[s.signOutBtn, signingOut && s.signOutBtnDisabled]}
                onPress={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color="#ff4d6d" />
                ) : (
                  <>
                    <LogOut size={16} color="#ff4d6d" />
                    <Text style={s.signOutText}>Sign out</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030305' },
  scrollContent: { paddingBottom: 48 },
  scrollContentTablet: { alignItems: 'center' },
  tabletInner: { width: '100%', maxWidth: 600 },
  tabletStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  tabletStatsCell: { flex: 1, minWidth: 280 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 64 },

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

  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b0b0d0',
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  card: {
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 18,
    padding: 20,
    gap: 6,
  },
  cardLabel: { fontSize: 12, fontWeight: '600', color: '#b0b0d0' },
  cardValue: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  cardSubtext: { fontSize: 13, color: '#b0b0d0', lineHeight: 18, marginTop: 2 },

  stripeConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stripeConnectedText: { fontSize: 15, fontWeight: '700', color: '#00e096' },

  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c6df5',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  connectBtnText: { fontSize: 15, fontWeight: '800', color: '#ffffff' },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,77,109,0.35)',
    backgroundColor: 'rgba(255,77,109,0.08)',
    borderRadius: 14,
    paddingVertical: 14,
  },
  signOutBtnDisabled: { opacity: 0.5 },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#ff4d6d' },
})

const ts = StyleSheet.create({
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b0b0d0',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  badgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeLetter: { fontSize: 36, fontWeight: '900' },
  tierName: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  tierDesc: { fontSize: 13, color: '#b0b0d0', textAlign: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, width: '100%' },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#b0b0d0', textAlign: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: '#222240' },
  progressSection: { width: '100%', marginTop: 8, gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#b0b0d0' },
  progressCount: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a1a2e',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressNote: { fontSize: 11, color: '#b0b0d0', textAlign: 'center' },
  eliteBadge: {
    backgroundColor: 'rgba(124,109,245,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,109,245,0.3)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  eliteText: { fontSize: 13, fontWeight: '700', color: '#7c6df5' },
})

const rs = StyleSheet.create({
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b0b0d0',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#2a1f5a',
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  codeLabel: { fontSize: 12, fontWeight: '600', color: '#b0b0d0' },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  code: {
    fontSize: 28,
    fontWeight: '900',
    color: '#7c6df5',
    letterSpacing: 3,
    fontVariant: ['tabular-nums'] as any,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124,109,245,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124,109,245,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyBtnText: { fontSize: 13, fontWeight: '700', color: '#7c6df5' },
  copyBtnTextDone: { color: '#00e096' },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#b0b0d0', textAlign: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: '#222240' },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c6df5',
    borderRadius: 14,
    paddingVertical: 14,
  },
  shareBtnText: { fontSize: 15, fontWeight: '800', color: '#ffffff' },

  howSection: { gap: 10 },
  howTitle: { fontSize: 12, fontWeight: '700', color: '#b0b0d0', letterSpacing: 0.5 },
  howSteps: { gap: 0 },
  howStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  howConnector: { width: 2, height: 12, backgroundColor: '#222240', marginLeft: 11, marginVertical: 2 },
  howDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(124,109,245,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(124,109,245,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howDotGreen: {
    backgroundColor: 'rgba(0,224,150,0.15)',
    borderColor: 'rgba(0,224,150,0.4)',
  },
  howDotNum: { fontSize: 11, fontWeight: '800', color: '#ffffff' },
  howText: { fontSize: 13, color: '#b0b0d0', flex: 1, lineHeight: 18 },
})
