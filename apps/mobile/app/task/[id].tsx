import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { MapPin, Clock, ChevronLeft, Zap } from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import { useLocationVerify } from '@/lib/useLocationVerify'
import type { Task, Store, Campaign } from '@mosaic/types'

type TaskWithRelations = Task & {
  stores: Store
  campaigns: Campaign
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [task, setTask] = useState<TaskWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { verify, verifying, result: locationResult } = useLocationVerify()
  const [locationResultState, setLocationResultState] = useState<typeof locationResult>(null)

  useEffect(() => {
    if (!id) return
    fetchTask()
  }, [id])

  // Sync hook result into local state so we can clear it
  useEffect(() => {
    setLocationResultState(locationResult)
  }, [locationResult])

  async function fetchTask() {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*, stores(*), campaigns(*)')
      .eq('id', id)
      .single()

    if (fetchError || !data) {
      setError('Could not load task.')
    } else {
      setTask(data as TaskWithRelations)
    }
    setLoading(false)
  }

  async function proceedToCapture(locationVerified: boolean) {
    if (!task) return
    setAccepting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in to accept tasks.')
      setAccepting(false)
      return
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'assigned',
        assigned_to: user.id,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    if (updateError) {
      Alert.alert('Error', 'Could not accept task. It may have already been taken.')
      setAccepting(false)
      return
    }

    router.replace({
      pathname: `/capture/${task.id}`,
      params: { locationVerified: locationVerified ? 'true' : 'false' },
    })
  }

  async function handleAccept() {
    if (!task) return

    const store = task.stores
    // If store has no coords, skip verification
    if (!store?.lat || !store?.lng) {
      await proceedToCapture(false)
      return
    }

    const verified = await verify(store.lat, store.lng)
    if (verified) {
      await proceedToCapture(true)
    }
    // If not verified, the locationResult UI will render below
  }

  async function handleOverride() {
    setLocationResultState(null)
    await proceedToCapture(false)
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#7c6df5" size="large" />
      </View>
    )
  }

  if (error || !task) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{error ?? 'Task not found.'}</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const store = task.stores
  const campaign = task.campaigns
  const payout = (task.payout_cents / 100).toFixed(2)
  const slaMinutes = campaign?.sla_minutes ?? 30

  return (
    <View style={s.container}>
      {/* Header bar */}
      <View style={s.header}>
        <TouchableOpacity style={s.backIconBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#ffffff" />
          <Text style={s.backLabel}>Back</Text>
        </TouchableOpacity>
        <View style={s.slaBadge}>
          <Clock size={12} color="#00d4d4" />
          <Text style={s.slaText}>{slaMinutes} min SLA</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Store + payout hero */}
        <View style={s.hero}>
          <View style={s.heroLeft}>
            <Text style={s.storeName} numberOfLines={2}>{store?.name}</Text>
            <View style={s.addressRow}>
              <MapPin size={14} color="#b0b0d0" />
              <Text style={s.addressText}>{store?.address}</Text>
            </View>
            <Text style={s.cityText}>{store?.city}</Text>
          </View>
          <View style={s.payoutBlock}>
            <Text style={s.payoutAmount}>£{payout}</Text>
            <Text style={s.payoutLabel}>payout</Text>
          </View>
        </View>

        {/* Campaign info card */}
        <View style={s.card}>
          <Text style={s.cardLabel}>CAMPAIGN</Text>
          <Text style={s.campaignName}>{campaign?.name}</Text>
          <View style={s.divider} />
          <Text style={s.cardLabel}>PRODUCT</Text>
          <Text style={s.productName}>{campaign?.product_name}</Text>
        </View>

        {/* Instructions */}
        {campaign?.instructions ? (
          <View style={s.card}>
            <View style={s.instructionsHeader}>
              <Zap size={15} color="#7c6df5" />
              <Text style={s.cardLabel}>INSTRUCTIONS</Text>
            </View>
            <Text style={s.instructionsText}>{campaign.instructions}</Text>
          </View>
        ) : null}

        {/* Planogram */}
        {campaign?.planogram_url ? (
          <View style={s.card}>
            <Text style={s.cardLabel}>PLANOGRAM</Text>
            <Image
              source={{ uri: campaign.planogram_url }}
              style={s.planogram}
              resizeMode="contain"
            />
          </View>
        ) : null}

        {/* Location verification status */}
        {verifying && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#0c0c18', borderRadius: 8, marginTop: 12 }}>
            <ActivityIndicator size="small" color="#7c6df5" />
            <Text style={{ color: '#b0b0d0', fontSize: 14 }}>Verifying your location...</Text>
          </View>
        )}

        {locationResultState && !locationResultState.verified && (
          <View style={{ padding: 16, backgroundColor: '#1a0a0a', borderRadius: 8, borderWidth: 1, borderColor: '#ff4d6d', marginTop: 12 }}>
            <Text style={{ color: '#ff4d6d', fontSize: 15, fontWeight: '700', marginBottom: 6 }}>Too far from store</Text>
            <Text style={{ color: '#b0b0d0', fontSize: 13, marginBottom: 12 }}>
              You are {locationResultState.distance}m away. Must be within 200m.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={handleOverride} style={{ flex: 1, padding: 10, borderRadius: 6, backgroundColor: '#222240', alignItems: 'center' }}>
                <Text style={{ color: '#b0b0d0', fontSize: 13 }}>Override (Testing)</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLocationResultState(null)} style={{ flex: 1, padding: 10, borderRadius: 6, backgroundColor: '#ff4d6d22', borderWidth: 1, borderColor: '#ff4d6d', alignItems: 'center' }}>
                <Text style={{ color: '#ff4d6d', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={s.spacer} />
      </ScrollView>

      {/* Accept CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.acceptBtn, (accepting || verifying) && s.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={accepting || verifying}
        >
          {accepting ? (
            <ActivityIndicator color="#030305" size="small" />
          ) : (
            <Text style={s.acceptBtnText}>Accept &amp; Start</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030305' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#030305' },
  errorText: { fontSize: 16, color: '#b0b0d0', textAlign: 'center', marginBottom: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222240',
  },
  backIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backLabel: { fontSize: 16, color: '#ffffff', fontWeight: '500' },
  backBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#7c6df5', borderRadius: 12 },
  backBtnText: { fontSize: 15, fontWeight: '700', color: '#030305' },

  slaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,212,212,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,212,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  slaText: { fontSize: 12, fontWeight: '700', color: '#00d4d4' },

  scroll: { padding: 20, gap: 16 },

  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  heroLeft: { flex: 1 },
  storeName: { fontSize: 26, fontWeight: '900', color: '#ffffff', lineHeight: 32, marginBottom: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginBottom: 3 },
  addressText: { fontSize: 14, color: '#b0b0d0', flex: 1, lineHeight: 20 },
  cityText: { fontSize: 14, color: '#7c6df5', fontWeight: '600', marginLeft: 19 },

  payoutBlock: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,224,150,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,224,150,0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 90,
  },
  payoutAmount: { fontSize: 26, fontWeight: '900', color: '#00e096' },
  payoutLabel: { fontSize: 11, color: '#00e096', opacity: 0.7, fontWeight: '600', marginTop: 2 },

  card: {
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  cardLabel: { fontSize: 11, fontWeight: '800', color: '#7c6df5', letterSpacing: 1.2 },
  campaignName: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  productName: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  divider: { height: 1, backgroundColor: '#222240', marginVertical: 4 },

  instructionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  instructionsText: { fontSize: 15, color: '#b0b0d0', lineHeight: 23 },

  planogram: { width: '100%', height: 240, borderRadius: 12, marginTop: 4 },

  spacer: { height: 20 },

  footer: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: '#222240',
    backgroundColor: '#030305',
  },
  acceptBtn: {
    backgroundColor: '#7c6df5',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnDisabled: { opacity: 0.6 },
  acceptBtnText: { fontSize: 17, fontWeight: '800', color: '#030305' },
})
