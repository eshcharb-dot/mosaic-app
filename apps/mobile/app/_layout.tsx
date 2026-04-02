import { useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import {
  configureNotificationHandler,
  registerForPushNotifications,
  setupAndroidChannel,
  addNotificationResponseListener,
} from '../lib/notifications'

// Configure notification presentation behaviour as early as possible.
configureNotificationHandler()

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const router = useRouter()
  const notificationListenerRef = useRef<{ remove: () => void } | null>(null)

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

    return () => {
      notificationListenerRef.current?.remove()
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
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#030305' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="task/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="capture/[taskId]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="capture/success" options={{ presentation: 'modal', gestureEnabled: false }} />
      <Stack.Screen name="auth" />
    </Stack>
  )
}
