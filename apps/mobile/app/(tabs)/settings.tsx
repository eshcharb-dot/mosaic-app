// expo-constants is part of the Expo SDK and should be available.
// AsyncStorage is available via @react-native-async-storage/async-storage (bundled with Expo).
// If missing, run: expo install @react-native-async-storage/async-storage expo-constants

import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Settings, Bell, Map, Trash2, LogOut, Info } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAppTheme } from '../../lib/ThemeContext'

// ── Module guards ─────────────────────────────────────────────────────────────

function getAsyncStorage() {
  try {
    return require('@react-native-async-storage/async-storage')
      .default as typeof import('@react-native-async-storage/async-storage').default
  } catch {
    console.warn('[settings] @react-native-async-storage/async-storage not installed.')
    return null
  }
}

function getConstants() {
  try {
    return require('expo-constants')
      .default as typeof import('expo-constants').default
  } catch {
    console.warn('[settings] expo-constants not installed.')
    return null
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ASYNC_KEY_SHOW_DISTANCE = 'showDistance'

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter()
  const { tokens, mode, setMode } = useAppTheme()

  const [pushEnabled, setPushEnabled] = useState(true)
  const [showDistance, setShowDistance] = useState(true)
  const [loadingPush, setLoadingPush] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [appVersion, setAppVersion] = useState<string | null>(null)

  // ── Load initial state ─────────────────────────────────────────────────────

  useEffect(() => {
    // App version from expo-constants
    const Constants = getConstants()
    if (Constants) {
      setAppVersion(Constants.expoConfig?.version ?? null)
    }

    // showDistance from AsyncStorage
    const AsyncStorage = getAsyncStorage()
    if (AsyncStorage) {
      AsyncStorage.getItem(ASYNC_KEY_SHOW_DISTANCE)
        .then(val => {
          if (val !== null) setShowDistance(val === 'true')
        })
        .catch(() => {})
    }

    // push_enabled from profiles
    async function loadPushEnabled() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('push_enabled')
        .eq('id', user.id)
        .single()

      if (data && typeof data.push_enabled === 'boolean') {
        setPushEnabled(data.push_enabled)
      }
    }

    loadPushEnabled()
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTogglePush = useCallback(async (value: boolean) => {
    setPushEnabled(value)
    setLoadingPush(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ push_enabled: value })
          .eq('id', user.id)
      }
    } catch (err) {
      console.error('[settings] Failed to update push_enabled:', err)
      // Revert on failure
      setPushEnabled(!value)
    } finally {
      setLoadingPush(false)
    }
  }, [])

  const handleToggleShowDistance = useCallback(async (value: boolean) => {
    setShowDistance(value)

    const AsyncStorage = getAsyncStorage()
    if (AsyncStorage) {
      try {
        await AsyncStorage.setItem(ASYNC_KEY_SHOW_DISTANCE, String(value))
      } catch (err) {
        console.error('[settings] Failed to persist showDistance:', err)
      }
    }
  }, [])

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear cached data',
      'This will remove all locally cached data. You will not be signed out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const AsyncStorage = getAsyncStorage()
            if (!AsyncStorage) return

            try {
              await AsyncStorage.clear()
              // Restore the showDistance default after clearing
              setShowDistance(true)
              Alert.alert('Done', 'Cached data cleared.')
            } catch (err) {
              console.error('[settings] Failed to clear AsyncStorage:', err)
              Alert.alert('Error', 'Could not clear cached data.')
            }
          },
        },
      ],
    )
  }, [])

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    setSigningOut(false)
    router.replace('/auth')
  }, [router])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Settings</Text>
        <Settings size={22} color="#7c6df5" />
      </View>

      {/* Notifications section */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>NOTIFICATIONS</Text>
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <Bell size={18} color="#7c6df5" />
              <View style={s.rowText}>
                <Text style={s.rowTitle}>Task notifications</Text>
                <Text style={s.rowSubtitle}>Get notified when tasks appear near you</Text>
              </View>
            </View>
            {loadingPush ? (
              <ActivityIndicator size="small" color="#7c6df5" />
            ) : (
              <Switch
                value={pushEnabled}
                onValueChange={handleTogglePush}
                trackColor={{ false: '#222240', true: '#7c6df5' }}
                thumbColor="#ffffff"
              />
            )}
          </View>
        </View>
      </View>

      {/* Display section */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>DISPLAY</Text>
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <Map size={18} color="#7c6df5" />
              <View style={s.rowText}>
                <Text style={s.rowTitle}>Show distance on tasks</Text>
                <Text style={s.rowSubtitle}>Display how far each task is from you</Text>
              </View>
            </View>
            <Switch
              value={showDistance}
              onValueChange={handleToggleShowDistance}
              trackColor={{ false: '#222240', true: '#7c6df5' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </View>

      {/* Appearance section */}
      <View style={s.section}>
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: tokens.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Appearance
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['dark', 'system', 'light'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: mode === m ? tokens.purple : tokens.card,
                  borderWidth: 1,
                  borderColor: mode === m ? tokens.purple : tokens.border,
                }}
              >
                <Text style={{ color: mode === m ? '#fff' : tokens.muted, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Data section */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>DATA</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.dangerRow} onPress={handleClearCache}>
            <Trash2 size={18} color="#ff4d6d" />
            <Text style={s.dangerText}>Clear cached data</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* About section */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>ABOUT</Text>
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <Info size={18} color="#444466" />
              <Text style={s.rowTitle}>App version</Text>
            </View>
            <Text style={s.versionText}>{appVersion ?? '—'}</Text>
          </View>
        </View>
      </View>

      {/* Sign out */}
      <View style={s.section}>
        <TouchableOpacity
          style={[s.signOutBtn, signingOut && s.signOutBtnDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color="#ff4d6d" />
          ) : (
            <>
              <LogOut size={16} color="#ff4d6d" />
              <Text style={s.signOutText}>Sign out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030305' },
  scrollContent: { paddingBottom: 48 },

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

  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b0b0d0',
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  card: {
    backgroundColor: '#0c0c18',
    borderWidth: 1,
    borderColor: '#222240',
    borderRadius: 18,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  rowSubtitle: { fontSize: 12, color: '#b0b0d0', lineHeight: 16 },

  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  dangerText: { fontSize: 15, fontWeight: '600', color: '#ff4d6d' },

  versionText: { fontSize: 13, color: '#b0b0d0' },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,77,109,0.35)',
    backgroundColor: 'rgba(255,77,109,0.08)',
    borderRadius: 14,
    paddingVertical: 14,
  },
  signOutBtnDisabled: { opacity: 0.5 },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#ff4d6d' },
})
