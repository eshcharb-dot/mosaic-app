import { useEffect, useState, useRef } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { MapPin, Clock, ChevronRight } from 'lucide-react-native'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'
import { getPendingSyncTaskIds } from '../../lib/offlineQueue'
import type { Task } from '@mosaic/types'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function distColor(km: number): string {
  if (km < 2) return '#00e096'
  if (km < 5) return '#ffd700'
  return '#ff4d6d'
}

export default function TaskFeedScreen() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [pendingSyncIds, setPendingSyncIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  // Request location silently — no blocker if denied
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude })
    })()
  }, [])

  // Load locally queued (pending sync) task IDs
  useEffect(() => {
    ;(async () => {
      try {
        const ids = await getPendingSyncTaskIds()
        setPendingSyncIds(new Set(ids))
      } catch {
        // AsyncStorage unavailable — no badges
      }
    })()
  }, [])

  async function loadTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*, stores(name, address, city, lat, lng), campaigns(name, product_name, sla_minutes, planogram_url)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(30)
    setTasks((data as any) ?? [])

    // Refresh pending-sync badge set alongside task data
    try {
      const ids = await getPendingSyncTaskIds()
      setPendingSyncIds(new Set(ids))
    } catch {
      // ignore
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { loadTasks() }, [])

  // Sort by distance when location is available
  const sortedTasks = userLoc
    ? [...tasks].sort((a, b) => {
        const storeA = (a as any).stores
        const storeB = (b as any).stores
        if (!storeA?.lat || !storeB?.lat) return 0
        const dA = haversineKm(userLoc.lat, userLoc.lng, storeA.lat, storeA.lng)
        const dB = haversineKm(userLoc.lat, userLoc.lng, storeB.lat, storeB.lng)
        return dA - dB
      })
    : tasks

  if (loading) return (
    <View style={s.center}><ActivityIndicator color="#7c6df5" size="large" /></View>
  )

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Task Feed</Text>
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      {sortedTasks.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>No tasks nearby right now</Text>
          <Text style={s.emptyText}>Check back soon — new tasks appear every few minutes.</Text>
        </View>
      ) : (
        <FlatList
          data={sortedTasks}
          keyExtractor={t => t.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks() }} tintColor="#7c6df5" />}
          renderItem={({ item: task }) => {
            const store = (task as any).stores
            const campaign = (task as any).campaigns
            const payout = (task.payout_cents / 100).toFixed(2)
            const dist = userLoc && store?.lat && store?.lng
              ? haversineKm(userLoc.lat, userLoc.lng, store.lat, store.lng)
              : null
            const isPendingSync = pendingSyncIds.has(task.id)
            return (
              <TouchableOpacity style={s.card} onPress={() => router.push(`/task/${task.id}`)}>
                <View style={s.cardTop}>
                  <View style={s.cardInfo}>
                    <View style={s.storeNameRow}>
                      <Text style={s.storeName} numberOfLines={1}>{store?.name}</Text>
                      {isPendingSync && (
                        <View style={s.offlineBadge}>
                          <Text style={s.offlineBadgeText}>Offline</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.productName} numberOfLines={1}>{campaign?.product_name}</Text>
                  </View>
                  <View style={s.cardTopRight}>
                    <View style={s.payoutBadge}>
                      <Text style={s.payoutText}>£{payout}</Text>
                    </View>
                    {dist !== null && (
                      <View style={[s.distBadge, { borderColor: distColor(dist) + '44' }]}>
                        <Text style={[s.distText, { color: distColor(dist) }]}>{formatDist(dist)}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={s.cardMeta}>
                  <View style={s.metaItem}>
                    <MapPin size={13} color="#b0b0d0" />
                    <Text style={s.metaText}>{store?.city}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Clock size={13} color="#b0b0d0" />
                    <Text style={s.metaText}>{campaign?.sla_minutes} min SLA</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Text style={s.metaTextPurple}>45s task</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.acceptBtn} onPress={() => router.push(`/task/${task.id}`)}>
                  <Text style={s.acceptBtnText}>Accept & Navigate</Text>
                  <ChevronRight size={16} color="#030305" />
                </TouchableOpacity>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030305' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#222240' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#ffffff', letterSpacing: -0.5 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,224,150,0.1)', borderWidth: 1, borderColor: 'rgba(0,224,150,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00e096' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#00e096' },
  card: { backgroundColor: '#0c0c18', borderWidth: 1, borderColor: '#222240', borderRadius: 20, padding: 18, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardInfo: { flex: 1, marginRight: 12 },
  cardTopRight: { alignItems: 'flex-end', gap: 6 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  storeName: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  offlineBadge: { backgroundColor: 'rgba(255,160,64,0.12)', borderWidth: 1, borderColor: 'rgba(255,160,64,0.4)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  offlineBadgeText: { fontSize: 11, fontWeight: '700', color: '#ffa040' },
  productName: { fontSize: 14, color: '#b0b0d0' },
  payoutBadge: { backgroundColor: 'rgba(0,224,150,0.12)', borderWidth: 1, borderColor: 'rgba(0,224,150,0.3)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  payoutText: { fontSize: 18, fontWeight: '900', color: '#00e096' },
  distBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  distText: { fontSize: 12, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#b0b0d0' },
  metaTextPurple: { fontSize: 13, color: '#7c6df5', fontWeight: '600' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7c6df5', borderRadius: 14, paddingVertical: 13 },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: '#030305' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#b0b0d0', textAlign: 'center', lineHeight: 22 },
})
