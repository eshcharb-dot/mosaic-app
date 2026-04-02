import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native'
import { User, CheckCircle, LogOut, CreditCard } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string
  stripe_account_id: string | null
  collector_tier: string | null
  tier_updated_at: string | null
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

  // Progress toward next tier (by tasks)
  const progressPct = next
    ? Math.min(100, Math.round((taskCount / next.min_tasks) * 100))
    : 100

  return (
    <View style={ts.section}>
      <Text style={ts.sectionLabel}>COLLECTOR TIER</Text>
      <View style={ts.card}>
        {/* Badge circle */}
        <View style={[ts.badgeCircle, { backgroundColor: tier.badge_color + '22', borderColor: tier.badge_color + '66' }]}>
          <Text style={[ts.badgeLetter, { color: tier.badge_color }]}>
            {tier.name[0]}
          </Text>
        </View>

        <Text style={[ts.tierName, { color: tier.badge_color }]}>{tier.name}</Text>
        <Text style={ts.tierDesc}>{tier.description}</Text>

        {/* Stats row */}
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

        {/* Progress to next tier */}
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

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter()

  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [taskCount, setTaskCount] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  // ── Data fetching ────────────────────────────────────────────────────────────

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

      setProfile(profileRes.data ?? null)

      // Pull task count + avg score from earnings function if available
      if (statsRes.data) {
        const row = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data
        setTaskCount(row?.completed_tasks ?? 0)
      }

      // Get avg score from task history
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

      setLoading(false)
    }

    loadProfile()
  }, [])

  // ── Actions ───────────────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────────

  const stripeConnected = !!profile?.stripe_account_id

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent}>
      {/* Header */}
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

          {/* Collector Tier */}
          {profile && (
            <TierSection
              profile={profile}
              taskCount={taskCount}
              avgScore={avgScore}
            />
          )}

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
    </ScrollView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030305' },
  scrollContent: { paddingBottom: 48 },
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
  badgeLetter: {
    fontSize: 36,
    fontWeight: '900',
  },
  tierName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  tierDesc: {
    fontSize: 13,
    color: '#b0b0d0',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
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
