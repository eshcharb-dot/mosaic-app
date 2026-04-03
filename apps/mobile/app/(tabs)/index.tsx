import { useEffect, useState, useRef, useMemo } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, TextInput, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { MapPin, Clock, ChevronRight } from 'lucide-react-native'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'
import { getPendingSyncTaskIds } from '../../lib/offlineQueue'
import { useLayout } from '@/lib/useLayout'
import type { Task } from '@mosaic/types'

// SLA audit urgency: returns true if the store hasn't been audited within audit_frequency_days
function isStoreOverdue(lastAuditIso: string | null | undefined, auditFrequencyDays: number | null | undefined): boolean {
  if (!auditFrequencyDays) return false
  if (!lastAuditIso) return true // never audited
  const lastAudit = new Date(lastAuditIso).getTime()
  const cutoff = Date.now() - auditFrequencyDays * 24 * 60 * 60 * 1000
  return lastAudit < cutoff
}

// ── Tier helpers ──────────────────────────────────────────────────────────────

const TIER_MULTIPLIERS: Record<string, number> = {
  bronze: 1.0,
  silver: 1.1,
  gold:   1.25,
  elite:  1.5,
}

const TIER_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold:   '#ffd700',
  elite:  '#7c6df5',
}

// ── Distance helpers ──────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Alias used in filteredTasks sort logic
const haversineDistance = haversineKm

function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function distColor(km: number): string {
  if (km < 2) return '#00e096'
  if (km < 5) return '#ffd700'
  return '#ff4d6d'
}

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState = ({ query, filter }: { query: string; filter: string }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
    <Text style={{ fontSize: 48, marginBottom: 16 }}>🔍</Text>
    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>No tasks found</Text>
    <Text style={{ color: '#b0b0d0', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
      {query ? `No tasks matching "${query}"` : `No tasks in "${filter}" filter`}
    </Text>
  </View>
)

export default function TaskFeedScreen() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [pendingSyncIds, setPendingSyncIds] = useState<Set<string>>(new Set())
  const [collectorTier, setCollectorTier] = useState<string | null>(null)
  // SLA: map of campaign_id -> audit_frequency_days
  const [slaAuditDays, setSlaAuditDays] = useState<Record<string, number>>({})
  // SLA: map of store_id -> last_submission_at (ISO string)
  const [storeLastAudit, setStoreLastAudit] = useState<Record<string, string | null>>({})
  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'All' | 'Near Me' | 'High Pay' | 'Quick Tasks'>('All')
  const router = useRouter()
  const { columns, mode } = useLayout()

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

  // Load collector tier from profile
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('collector_tier')
        .eq('id', user.id)
        .single()
      if (data?.collector_tier) setCollectorTier(data.collector_tier)
    })()
  }, [])

  async function loadTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*, stores(name, address, city, lat, lng, latitude, longitude, territory_stores(territories(id, name, color))), campaigns(name, product_name, sla_minutes, planogram_url, price_per_task_cents)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(30)
    const taskRows = (data as any) ?? []
    setTasks(taskRows)

    // Refresh pending-sync badge set alongside task data
    try {
      const ids = await getPendingSyncTaskIds()
      setPendingSyncIds(new Set(ids))
    } catch {
      // ignore
    }

    // Fetch SLA audit frequency for each unique campaign
    const campaignIds: string[] = [...new Set(taskRows.map((t: any) => t.campaign_id).filter(Boolean))]
    if (campaignIds.length > 0) {
      const { data: slaRows } = await supabase
        .from('campaign_slas')
        .select('campaign_id, audit_frequency_days')
        .in('campaign_id', campaignIds)
      if (slaRows) {
        const map: Record<string, number> = {}
        slaRows.forEach((r: any) => { map[r.campaign_id] = r.audit_frequency_days })
        setSlaAuditDays(map)
      }
    }

    // Fetch last submission per store (for overdue computation)
    const storeIds: string[] = [...new Set(taskRows.map((t: any) => t.store_id).filter(Boolean))]
    if (storeIds.length > 0) {
      const { data: subRows } = await supabase
        .from('submissions')
        .select('store_id, submitted_at')
        .in('store_id', storeIds)
        .order('submitted_at', { ascending: false })
      if (subRows) {
        const map: Record<string, string | null> = {}
        subRows.forEach((r: any) => {
          if (!map[r.store_id]) map[r.store_id] = r.submitted_at
        })
        setStoreLastAudit(map)
      }
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { loadTasks() }, [])

  // userLocation shape expected by filteredTasks
  const userLocation = userLoc ? { latitude: userLoc.lat, longitude: userLoc.lng } : null

  // Filtered + sorted tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        (t as any).stores?.name?.toLowerCase().includes(q) ||
        (t as any).campaigns?.name?.toLowerCase().includes(q)
      )
    }

    // Active filter
    if (activeFilter === 'High Pay') {
      result = result.sort((a, b) => ((b as any).campaigns?.price_per_task_cents ?? 0) - ((a as any).campaigns?.price_per_task_cents ?? 0))
    } else if (activeFilter === 'Near Me' && userLocation) {
      result = result.sort((a, b) => {
        const distA = (a as any).stores?.latitude && (a as any).stores?.longitude
          ? haversineDistance(userLocation.latitude, userLocation.longitude, (a as any).stores.latitude, (a as any).stores.longitude)
          : (a as any).stores?.lat && (a as any).stores?.lng
          ? haversineDistance(userLocation.latitude, userLocation.longitude, (a as any).stores.lat, (a as any).stores.lng)
          : Infinity
        const distB = (b as any).stores?.latitude && (b as any).stores?.longitude
          ? haversineDistance(userLocation.latitude, userLocation.longitude, (b as any).stores.latitude, (b as any).stores.longitude)
          : (b as any).stores?.lat && (b as any).stores?.lng
          ? haversineDistance(userLocation.latitude, userLocation.longitude, (b as any).stores.lat, (b as any).stores.lng)
          : Infinity
        return distA - distB
      })
    } else if (activeFilter === 'Quick Tasks') {
      // No specific field yet — show all (to be wired later)
    } else if (activeFilter === 'All' && userLoc) {
      // Default sort by distance when location is available
      result = result.sort((a, b) => {
        const storeA = (a as any).stores
        const storeB = (b as any).stores
        if (!storeA?.lat || !storeB?.lat) return 0
        const dA = haversineKm(userLoc.lat, userLoc.lng, storeA.lat, storeA.lng)
        const dB = haversineKm(userLoc.lat, userLoc.lng, storeB.lat, storeB.lng)
        return dA - dB
      })
    }

    return result
  }, [tasks, searchQuery, activeFilter, userLocation, userLoc])

  // Payout with tier multiplier applied
  function formatPayout(payout_cents: number): { base: string; boosted: string | null; tierLabel: string | null } {
    const base = (payout_cents / 100).toFixed(2)
    const multiplier = TIER_MULTIPLIERS[collectorTier ?? 'bronze'] ?? 1.0
    if (multiplier <= 1.0) return { base, boosted: null, tierLabel: null }
    const boosted = ((payout_cents / 100) * multiplier).toFixed(2)
    const tierLabel = collectorTier ? collectorTier.charAt(0).toUpperCase() + collectorTier.slice(1) : null
    return { base, boosted, tierLabel }
  }

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

      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#222240' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0c0c18', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          <Text style={{ color: '#b0b0d0', fontSize: 16 }}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search stores or campaigns..."
            placeholderTextColor="#b0b0d0"
            style={{ flex: 1, color: '#fff', fontSize: 15 }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: '#b0b0d0', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, paddingVertical: 8 }} contentContainerStyle={{ gap: 8 }}>
        {(['All', 'Near Me', 'High Pay', 'Quick Tasks'] as const).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setActiveFilter(f)}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
              backgroundColor: activeFilter === f ? '#7c6df5' : '#0c0c18',
              borderWidth: 1, borderColor: activeFilter === f ? '#7c6df5' : '#222240'
            }}
          >
            <Text style={{ color: activeFilter === f ? '#fff' : '#b0b0d0', fontSize: 13, fontWeight: '600' }}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Task count + sort indicator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ color: '#b0b0d0', fontSize: 13 }}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} available
        </Text>
        {activeFilter !== 'All' && (
          <Text style={{ color: '#7c6df5', fontSize: 12, marginLeft: 4 }}>· sorted by {activeFilter.toLowerCase()}</Text>
        )}
      </View>

      {/* Body — two-pane on tablet, single-pane on phone */}
      <View style={s.body}>
        {/* Tablet sidebar */}
        {mode === 'tablet' && (
          <View style={{ width: 200, borderRightWidth: 1, borderColor: '#222240', padding: 16, gap: 12 }}>
            <Text style={{ color: '#b0b0d0', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Quick Stats</Text>
            <View style={{ backgroundColor: '#0c0c18', borderRadius: 8, padding: 12 }}>
              <Text style={{ color: '#b0b0d0', fontSize: 11 }}>Available Tasks</Text>
              <Text style={{ color: '#7c6df5', fontSize: 24, fontWeight: '700' }}>{filteredTasks.length}</Text>
            </View>
          </View>
        )}

        {/* Task list pane */}
        <View style={{ flex: 1 }}>
          <FlatList
            key={String(columns)}
            data={filteredTasks}
            keyExtractor={t => t.id}
            numColumns={columns}
            contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
            columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks() }} tintColor="#7c6df5" />}
            ListEmptyComponent={<EmptyState query={searchQuery} filter={activeFilter} />}
            renderItem={({ item: task }) => {
              const store = (task as any).stores
              const campaign = (task as any).campaigns
              const territory = store?.territory_stores?.[0]?.territories ?? null
              const { base, boosted, tierLabel } = formatPayout(task.payout_cents)
              const dist = userLoc && store?.lat && store?.lng
                ? haversineKm(userLoc.lat, userLoc.lng, store.lat, store.lng)
                : null
              const isPendingSync = pendingSyncIds.has(task.id)
              const tierColor = collectorTier ? TIER_COLORS[collectorTier] : null
              const auditFreqDays = (task as any).campaign_id ? slaAuditDays[(task as any).campaign_id] : null
              const lastAudit = (task as any).store_id ? storeLastAudit[(task as any).store_id] : null
              const isUrgent = isStoreOverdue(lastAudit, auditFreqDays)
              return (
                <TouchableOpacity
                  style={[s.card, isUrgent && s.cardUrgent, { width: mode === 'tablet' ? '48%' : '100%' }]}
                  onPress={() => router.push(`/task/${task.id}`)}
                >
                  <View style={s.cardTop}>
                    <View style={s.cardInfo}>
                      <View style={s.storeNameRow}>
                        <Text style={s.storeName} numberOfLines={1}>{store?.name}</Text>
                        {isUrgent && (
                          <View style={s.urgentBadge}>
                            <Text style={s.urgentBadgeText}>URGENT</Text>
                          </View>
                        )}
                        {isPendingSync && (
                          <View style={s.offlineBadge}>
                            <Text style={s.offlineBadgeText}>Offline</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.productName} numberOfLines={1}>{campaign?.product_name}</Text>
                    </View>
                    <View style={s.cardTopRight}>
                      {/* Payout badge — show boost if silver+ */}
                      <View style={s.payoutBadge}>
                        {boosted ? (
                          <>
                            <Text style={s.payoutTextStrike}>£{base}</Text>
                            <Text style={[s.payoutTextBoosted, { color: tierColor ?? '#00e096' }]}>
                              £{boosted}
                            </Text>
                          </>
                        ) : (
                          <Text style={s.payoutText}>£{base}</Text>
                        )}
                      </View>
                      {boosted && tierLabel && (
                        <View style={[s.tierBoostBadge, { borderColor: (tierColor ?? '#c0c0c0') + '55', backgroundColor: (tierColor ?? '#c0c0c0') + '18' }]}>
                          <Text style={[s.tierBoostText, { color: tierColor ?? '#c0c0c0' }]}>
                            {tierLabel} bonus
                          </Text>
                        </View>
                      )}
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
                    {territory && (
                      <View style={[s.territoryPill, { borderColor: (territory.color ?? '#7c6df5') + '55', backgroundColor: (territory.color ?? '#7c6df5') + '18' }]}>
                        <Text style={[s.territoryText, { color: territory.color ?? '#7c6df5' }]} numberOfLines={1}>
                          {territory.name}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity style={s.acceptBtn} onPress={() => router.push(`/task/${task.id}`)}>
                    <Text style={s.acceptBtnText}>Accept & Navigate</Text>
                    <ChevronRight size={16} color="#030305" />
                  </TouchableOpacity>
                </TouchableOpacity>
              )
            }}
          />
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030305' },
  body: { flex: 1, flexDirection: 'row' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#222240' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#ffffff', letterSpacing: -0.5 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,224,150,0.1)', borderWidth: 1, borderColor: 'rgba(0,224,150,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00e096' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#00e096' },
  card: { backgroundColor: '#0c0c18', borderWidth: 1, borderColor: '#222240', borderRadius: 20, padding: 18, gap: 12 },
  cardUrgent: { borderColor: 'rgba(255,201,71,0.45)', backgroundColor: 'rgba(255,201,71,0.03)' },
  urgentBadge: { backgroundColor: 'rgba(255,201,71,0.15)', borderWidth: 1, borderColor: 'rgba(255,201,71,0.45)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  urgentBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffc947', letterSpacing: 0.5 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardInfo: { flex: 1, marginRight: 12 },
  cardTopRight: { alignItems: 'flex-end', gap: 6 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  storeName: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  offlineBadge: { backgroundColor: 'rgba(255,160,64,0.12)', borderWidth: 1, borderColor: 'rgba(255,160,64,0.4)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  offlineBadgeText: { fontSize: 11, fontWeight: '700', color: '#ffa040' },
  productName: { fontSize: 14, color: '#b0b0d0' },
  payoutBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,224,150,0.12)', borderWidth: 1, borderColor: 'rgba(0,224,150,0.3)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  payoutText: { fontSize: 18, fontWeight: '900', color: '#00e096' },
  payoutTextStrike: { fontSize: 13, fontWeight: '700', color: '#b0b0d0', textDecorationLine: 'line-through' },
  payoutTextBoosted: { fontSize: 18, fontWeight: '900' },
  tierBoostBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  tierBoostText: { fontSize: 10, fontWeight: '700' },
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
  territoryPill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  territoryText: { fontSize: 11, fontWeight: '600' },
})
