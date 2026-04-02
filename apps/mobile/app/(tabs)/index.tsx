import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { MapPin, Clock, DollarSign, ChevronRight } from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import type { Task } from '@mosaic/types'

export default function TaskFeedScreen() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  async function loadTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*, stores(name, address, city, lat, lng), campaigns(name, product_name, sla_minutes, planogram_url)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(30)
    setTasks((data as any) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { loadTasks() }, [])

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

      {tasks.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>No tasks nearby right now</Text>
          <Text style={s.emptyText}>Check back soon — new tasks appear every few minutes.</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={t => t.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks() }} tintColor="#7c6df5" />}
          renderItem={({ item: task }) => {
            const store = (task as any).stores
            const campaign = (task as any).campaigns
            const payout = (task.payout_cents / 100).toFixed(2)
            return (
              <TouchableOpacity style={s.card} onPress={() => router.push(`/task/${task.id}`)}>
                <View style={s.cardTop}>
                  <View style={s.cardInfo}>
                    <Text style={s.storeName} numberOfLines={1}>{store?.name}</Text>
                    <Text style={s.productName} numberOfLines={1}>{campaign?.product_name}</Text>
                  </View>
                  <View style={s.payoutBadge}>
                    <Text style={s.payoutText}>£{payout}</Text>
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
  storeName: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 3 },
  productName: { fontSize: 14, color: '#b0b0d0' },
  payoutBadge: { backgroundColor: 'rgba(0,224,150,0.12)', borderWidth: 1, borderColor: 'rgba(0,224,150,0.3)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  payoutText: { fontSize: 18, fontWeight: '900', color: '#00e096' },
  cardMeta: { flexDirection: 'row', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#b0b0d0' },
  metaTextPurple: { fontSize: 13, color: '#7c6df5', fontWeight: '600' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7c6df5', borderRadius: 14, paddingVertical: 13 },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: '#030305' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#b0b0d0', textAlign: 'center', lineHeight: 22 },
})
