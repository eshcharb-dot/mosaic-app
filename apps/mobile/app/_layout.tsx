import { useEffect, useRef, useState } from 'react'
import { Platform, View, Text, StyleSheet, Animated } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import {
  configureNotificationHandler,
  registerForPushNotifications,
  setupAndroidChannel,
  addNotificationResponseListener,
} from '../lib/notifications'
import { syncPendingSubmissions } from '../lib/syncManager'
import { ThemeProvider } from '../lib/ThemeContext'

// Configure notification presentation behaviour as early as possible.
configureNotificationHandler()

// ── Sync toast ────────────────────────────────────────────────────────────────

function SyncToast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start()
    }
  }, [visible, message, opacity])

  if (!visible) return null

  return (
    <Animated.View style={[ts.toast, { opacity }]} pointerEvents="none">
      <Text style={ts.toastText}>{message}</Text>
    </Animated.View>
  )
}

const ts = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(0,224,150,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,224,150,0.35)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastText: { fontSize: 14, fontWeight: '700', color: '#00e096' },
})

// ── Root layout ───────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [syncToast, setSyncToast] = useState<{ message: string; key: number } | null>(null)
  const router = useRouter()
  const notificationListenerRef = useRef<{ remove: () => void } | null>(null)
  // Track previous online state so we only sync on transitions to online
  const wasOnlineRef = useRef<boolean | null>(null)

  useEffect(() => {
    // Android channel must exist before any notification arrives.
    if (Platform.OS === 'android') {
      setupAndroidChannel()
    }

    // Listen for taps on delivered notifications and deep-link into the task.
    notificationListenerRef.current = addNotificationResponseListener(response => {
      const data = response.notification.request.content.data as Record<string, unknown>
      const taskId = data?.taskId
      if (taskId) {
        router.push(`/task/${taskId}`)
      }
    })

    // ── NetInfo connectivity listener — trigger sync on reconnect ─────────────
    let unsubscribeNetInfo: (() => void) | null = null
    try {
      const NetInfo = require('@react-native-community/netinfo').default
      unsubscribeNetInfo = NetInfo.addEventListener(async (state: { isConnected: boolean | null }) => {
        const isNowOnline = state.isConnected !== false
        const wasOnline = wasOnlineRef.current

        // Only fire sync when transitioning from offline → online (not on first load)
        if (wasOnline === false && isNowOnline) {
          const result = await syncPendingSubmissions()
          if (result.processed > 0) {
            const msg = `${result.processed} submission${result.processed > 1 ? 's' : ''} synced`
            setSyncToast({ message: msg, key: Date.now() })
          }
        }

        wasOnlineRef.current = isNowOnline
      })
    } catch {
      // NetInfo not installed — no sync trigger, silent fallback
    }

    return () => {
      notificationListenerRef.current?.remove()
      try { unsubscribeNetInfo?.() } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
  }, [])

  // Register / refresh push token whenever the session is established.
  useEffect(() => {
    if (session?.user) {
      registerForPushNotifications()
    }
  }, [session?.user?.id])

  return (
    <ThemeProvider>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#030305' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="task/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="capture/[taskId]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="capture/success" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="auth" />
        </Stack>
        {syncToast && (
          <SyncToast
            key={syncToast.key}
            message={syncToast.message}
            visible
          />
        )}
      </View>
    </ThemeProvider>
  )
}
