// expo-notifications and expo-device are not in package.json.
// Run: expo install expo-notifications expo-device
// before using this module.

import { Platform } from 'react-native'
import { supabase } from './supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

// Dynamically typed to avoid hard compile-time dependency until packages are installed.
type NotificationsModule = typeof import('expo-notifications')
type DeviceModule = typeof import('expo-device')

// ── Lazy module loader ────────────────────────────────────────────────────────

let _Notifications: NotificationsModule | null = null
let _Device: DeviceModule | null = null

function loadModules(): { Notifications: NotificationsModule; Device: DeviceModule } | null {
  try {
    if (!_Notifications) _Notifications = require('expo-notifications') as NotificationsModule
    if (!_Device) _Device = require('expo-device') as DeviceModule
    return { Notifications: _Notifications!, Device: _Device! }
  } catch {
    console.warn('[notifications] expo-notifications / expo-device not installed. Run: expo install expo-notifications expo-device')
    return null
  }
}

// ── Notification handler config ───────────────────────────────────────────────

export function configureNotificationHandler(): void {
  const mods = loadModules()
  if (!mods) return

  mods.Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}

// ── Android channel ───────────────────────────────────────────────────────────

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return
  const mods = loadModules()
  if (!mods) return

  await mods.Notifications.setNotificationChannelAsync('tasks', {
    name: 'New Tasks',
    importance: mods.Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  })
}

// ── Push token registration ───────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  const mods = loadModules()
  if (!mods) return null

  const { Notifications, Device } = mods

  // Physical device required — simulators don't support push
  if (!Device.isDevice) {
    console.warn('[notifications] Push notifications are only supported on physical devices.')
    return null
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.warn('[notifications] Push notification permission not granted.')
      return null
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data

    // Persist token to profiles table
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id)
    }

    return token
  } catch (err) {
    console.error('[notifications] Failed to register for push notifications:', err)
    return null
  }
}

// ── Local notification helpers ────────────────────────────────────────────────

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const mods = loadModules()
  if (!mods) return

  try {
    await mods.Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {} },
      trigger: null, // immediate
    })
  } catch (err) {
    console.error('[notifications] Failed to schedule local notification:', err)
  }
}

// ── Notification response listener ───────────────────────────────────────────

export function addNotificationResponseListener(
  handler: (response: import('expo-notifications').NotificationResponse) => void,
): { remove: () => void } {
  const mods = loadModules()
  if (!mods) return { remove: () => {} }

  const subscription = mods.Notifications.addNotificationResponseReceivedListener(handler)
  return subscription
}

// ── Re-export for convenience ─────────────────────────────────────────────────

export function getNotificationsModule(): NotificationsModule | null {
  const mods = loadModules()
  return mods?.Notifications ?? null
}
