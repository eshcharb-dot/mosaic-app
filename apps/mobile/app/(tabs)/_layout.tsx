import { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import { MapPin, Briefcase, DollarSign, User, Bell, Settings, Trophy } from 'lucide-react-native'
import { supabase } from '../../lib/supabase'

// expo-notifications may not be installed yet — guard gracefully.
function useNotificationBadge(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let sub: { remove: () => void } | null = null

    try {
      const Notifications = require('expo-notifications') as typeof import('expo-notifications')

      // Check current presented notifications on mount.
      Notifications.getPresentedNotificationsAsync()
        .then(items => setCount(items.length))
        .catch(() => {})

      // Update badge whenever a new notification response is received.
      sub = Notifications.addNotificationReceivedListener(() => {
        Notifications.getPresentedNotificationsAsync()
          .then(items => setCount(items.length))
          .catch(() => {})
      })
    } catch {
      // expo-notifications not installed — badge stays 0
    }

    return () => { sub?.remove() }
  }, [])

  return count
}

// ── Open task count ───────────────────────────────────────────────────────────

function useOpenTaskCount(): number | null {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { count: n } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open')
        if (typeof n === 'number') setCount(n)
      } catch {
        // silently ignore — badge stays hidden
      }
    })()
  }, [])

  return count
}

// ── Bell icon with optional badge ─────────────────────────────────────────────

function BellWithBadge({ color, count }: { color: string; count: number }) {
  return (
    <View style={bs.wrapper}>
      <Bell size={22} color={color} />
      {count > 0 && (
        <View style={bs.badge}>
          {/* Badge dot — count intentionally omitted to keep it clean */}
        </View>
      )}
    </View>
  )
}

const bs = StyleSheet.create({
  wrapper: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7c6df5',
    borderWidth: 1.5,
    borderColor: '#0c0c18',
  },
})

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const badgeCount = useNotificationBadge()
  const taskCount = useOpenTaskCount()

  // Build label: "Tasks" when unknown, "Tasks (12)" once loaded
  const tasksLabel = taskCount !== null ? `Tasks (${taskCount})` : 'Tasks'

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#0c0c18', borderTopColor: '#222240', paddingBottom: 8, height: 70 },
      tabBarActiveTintColor: '#7c6df5',
      tabBarInactiveTintColor: '#b0b0d0',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}>
      <Tabs.Screen name="index" options={{ title: tasksLabel, tabBarIcon: ({ color }) => <Briefcase size={22} color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: 'Nearby', tabBarIcon: ({ color }) => <MapPin size={22} color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ color }) => <DollarSign size={22} color={color} /> }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'Top', tabBarIcon: ({ color }) => <Trophy size={22} color={color} /> }} />
      <Tabs.Screen
        name="badges"
        options={{
          title: 'Badges',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏅</Text>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <BellWithBadge color={color} count={badgeCount} />,
        }}
      />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <Settings size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  )
}
