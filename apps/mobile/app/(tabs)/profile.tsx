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
  [key: string]: unknown
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter()

  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  // ── Data fetching ────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      setEmail(user.email ?? null)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data ?? null)
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
