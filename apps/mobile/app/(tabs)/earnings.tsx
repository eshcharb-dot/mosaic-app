import { useEffect, useState } from 'react'
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
import { TrendingUp, DollarSign } from 'lucide-react-native'
import { supabase } from '../../lib/supabase'
import type { Task, Store } from '@mosaic/types'

type CompletedTask = Task & {
  stores: Store
}

type Period = 'week' | 'alltime'

export default function EarningsScreen() {
  const [totalEarnings, setTotalEarnings] = useState<number>(0)
  const [tasks, setTasks] = useState<CompletedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<Period>('week')

  useEffect(() => {
    loadData()
  }, [period])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Fetch profile for total_earnings_cents
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_earnings_cents')
      .eq('id', user.id)
      .single()

    setTotalEarnings(profile?.total_earnings_cents ?? 0)

    // Fetch completed tasks
    let query = supabase
      .from('tasks')
      .select('*, stores(name, city)')
      .eq('assigned_to', user.id)
      .eq('status', 'submitted')
      .order('completed_at', { ascending: false })
      .limit(50)

    if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      query = query.gte('completed_at', weekAgo.toISOString())
    }

    const { data } = await query
    setTasks((data as CompletedTask[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  function handleWithdraw() {
    Alert.alert('Coming soon', 'Stripe Connect payouts are coming in a future update.')
  }

  // Compute period total from task list
  const periodTotal = tasks.reduce((sum, t) => sum + t.payout_cents, 0)

  function formatDate(iso?: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Earnings</Text>
        <TrendingUp size={22} color="#7c6df5" />
      </View>

      {/* Total earned hero */}
      <View style={s.heroCard}>
        <Text style={s.heroLabel}>Total Earned</Text>
        <Text style={s.heroAmount}>£{(totalEarnings / 100).toFixed(2)}</Text>
        <TouchableOpacity style={s.withdrawBtn} onPress={handleWithdraw}>
          <DollarSign size={16} color="#030305" />
          <Text style={s.withdrawBtnText}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      {/* Period toggle */}
      <View style={s.toggle}>
        <TouchableOpacity
          style={[s.toggleBtn, period === 'week' && s.toggleBtnActive]}
          onPress={() => setPeriod('week')}
        >
          <Text style={[s.toggleBtnText, period === 'week' && s.toggleBtnTextActive]}>This week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, period === 'alltime' && s.toggleBtnActive]}
          onPress={() => setPeriod('alltime')}
        >
          <Text style={[s.toggleBtnText, period === 'alltime' && s.toggleBtnTextActive]}>All time</Text>
        </TouchableOpacity>
      </View>

      {/* Period summary */}
      <View style={s.periodSummary}>
        <Text style={s.periodLabel}>{period === 'week' ? 'This week' : 'All time'}</Text>
        <Text style={s.periodAmount}>£{(periodTotal / 100).toFixed(2)}</Text>
      </View>

      {/* Task list */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#7c6df5" size="large" />
        </View>
      ) : tasks.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>No completed tasks {period === 'week' ? 'this week' : 'yet'}</Text>
          <Text style={s.emptyText}>Complete tasks to start earning.</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={t => t.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadData() }}
              tintColor="#7c6df5"
            />
          }
          renderItem={({ item: task }) => {
            const store = task.stores
            return (
              <View style={s.taskRow}>
                <View style={s.taskInfo}>
                  <Text style={s.taskStore} numberOfLines={1}>{store?.name ?? 'Store'}</Text>
                  <Text style={s.taskCity}>{store?.city}</Text>
                  <Text style={s.taskDate}>{formatDate(task.completed_at)}</Text>
                </View>
                <Text style={s.taskPayout}>£{(task.payout_cents / 100).toFixed(2)}</Text>
              </View>
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
  heroLabel: { fontSize: 13, fontWeight: '700', color: '#b0b0d0', letterSpacing: 1 },
  heroAmount: { fontSize: 52, fontWeight: '900', color: '#00e096', letterSpacing: -1 },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7c6df5',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginTop: 8,
  },
  withdrawBtnText: { fontSize: 15, fontWeight: '800', color: '#030305' },

  toggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 14,
    padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  toggleBtnActive: { backgroundColor: '#7c6df5' },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#b0b0d0' },
  toggleBtnTextActive: { color: '#030305', fontWeight: '800' },

  periodSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  periodLabel: { fontSize: 14, color: '#b0b0d0', fontWeight: '600' },
  periodAmount: { fontSize: 20, fontWeight: '900', color: '#ffffff' },

  taskRow: {
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskInfo: { flex: 1, marginRight: 12 },
  taskStore: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 3 },
  taskCity: { fontSize: 13, color: '#b0b0d0', marginBottom: 2 },
  taskDate: { fontSize: 12, color: '#7c6df5', fontWeight: '600' },
  taskPayout: { fontSize: 18, fontWeight: '900', color: '#00e096' },

  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#b0b0d0', textAlign: 'center' },
})
