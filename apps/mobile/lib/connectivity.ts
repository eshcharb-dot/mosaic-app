import { useState, useEffect } from 'react'

// NetInfo is likely not installed — all usage is guarded with try/catch.
// If unavailable the hook returns `true` (assume online) so nothing breaks.

type NetInfoState = {
  isConnected: boolean | null
}

type NetInfoSubscription = {
  (): void  // unsubscribe function
}

type NetInfoModule = {
  fetch: () => Promise<NetInfoState>
  addEventListener: (listener: (state: NetInfoState) => void) => NetInfoSubscription
}

let _NetInfo: NetInfoModule | null = null

function getNetInfo(): NetInfoModule | null {
  if (_NetInfo) return _NetInfo
  try {
    _NetInfo = require('@react-native-community/netinfo').default
    return _NetInfo
  } catch {
    // NetInfo not installed — caller must handle null
    return null
  }
}

export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const NetInfo = getNetInfo()

    if (!NetInfo) {
      // No NetInfo — stay optimistic
      return
    }

    // Read initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsOnline(state.isConnected !== false)
    }).catch(() => {
      // Leave as true on error
    })

    // Subscribe to changes
    let unsubscribe: (() => void) | null = null
    try {
      unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        setIsOnline(state.isConnected !== false)
      })
    } catch {
      // Subscription failed — leave default
    }

    return () => {
      try {
        unsubscribe?.()
      } catch {
        // ignore cleanup errors
      }
    }
  }, [])

  return isOnline
}

// Non-hook variant for use in non-component contexts (e.g. syncManager).
// Returns true if NetInfo is unavailable (fail-open).
export async function checkIsOnline(): Promise<boolean> {
  const NetInfo = getNetInfo()
  if (!NetInfo) return true

  try {
    const state = await NetInfo.fetch()
    return state.isConnected !== false
  } catch {
    return true
  }
}
