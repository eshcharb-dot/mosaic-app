// expo-notifications is required for this screen.
// Run: expo install expo-notifications expo-device

import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { Bell, BellOff } from 'lucide-react-native'

// ── Types ─────────────────────────────────────────────────────────────────────

type NotificationItem = {
  identifier: string
  title: string
  body: string
  date: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function loadNotificationsModule() {
  try {
    return require('expo-notifications') as typeof import('expo-notifications')
  } catch {
    console.warn('[notifications screen] expo-notifications not installed.')
    return null
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchNotifications = useCallback(async () => {
    const Notifications = loadNotificationsModule()
    if (!Notifications) {
      setLoading(false)
      return
    }

    try {
      const presented = await Notifications.getPresentedNotificationsAsync()
      const items: NotificationItem[] = presented.map(n => ({
        identifier: n.request.identifier,
        title: n.request.content.title ?? 'New notification',
        body: n.request.content.body ?? '',
        date: n.date,
      }))
      // Most recent first
      items.sort((a, b) => b.date - a.date)
      setNotifications(items)
    } catch (err) {
      console.error('[notifications screen] Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchNotifications()
  }, [fetchNotifications])

  async function handleMarkAllRead() {
    const Notifications = loadNotificationsModule()
    if (!Notifications) return

    try {
      await Notifications.dismissAllNotificationsAsync()
      setNotifications([])
    } catch (err) {
      console.error('[notifications screen] Failed to dismiss notifications:', err)
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderItem({ item }: { item: NotificationItem }) {
    return (
      <View style={s.card}>
        <View style={s.cardDot} />
        <View style={s.cardContent}>
          <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
          {item.body ? (
            <Text style={s.cardBody} numberOfLines={2}>{item.body}</Text>
          ) : null}
          <Text style={s.cardTime}>{timeAgo(item.date * 1000)}</Text>
        </View>
      </View>
    )
  }

  function renderEmpty() {
    return (
      <View style={s.emptyContainer}>
        <BellOff size={48} color="#444466" />
        <Text style={s.emptyTitle}>No notifications yet</Text>
        <Text style={s.emptyBody}>
          We'll let you know when new tasks appear near you.
        </Text>
      </View>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Notifications</Text>
        <Bell size={22} color="#7c6df5" />
      </View>

      {/* Mark all read */}
      {notifications.length > 0 && (
        <View style={s.actionRow}>
          <TouchableOpacity style={s.markReadBtn} onPress={handleMarkAllRead}>
            <Text style={s.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#7c6df5" size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.identifier}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={notifications.length === 0 ? s.listEmpty : s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7c6df5"
              colors={['#7c6df5']}
            />
          }
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

  actionRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#111130',
  },
  markReadBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#444466',
  },
  markReadText: { fontSize: 13, fontWeight: '600', color: '#b0b0d0' },

  list: { paddingVertical: 8 },
  listEmpty: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7c6df5',
    marginTop: 5,
    flexShrink: 0,
  },
  cardContent: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  cardBody: { fontSize: 13, color: '#b0b0d0', lineHeight: 18 },
  cardTime: { fontSize: 11, color: '#444466', marginTop: 2 },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff', textAlign: 'center' },
  emptyBody: {
    fontSize: 14,
    color: '#b0b0d0',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
})
