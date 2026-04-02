import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
  }, [])

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#030305' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="task/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="auth" />
    </Stack>
  )
}
