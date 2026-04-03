import { Platform } from 'react-native'

const QUEUE_KEY = 'mosaic_offline_queue'

export type QueuedSubmission = {
  id: string          // local UUID
  taskId: string
  photoUris: string[] // local file URIs (batch)
  photoUri?: string   // kept for backward compatibility with older queue entries
  capturedAt: string
  retryCount: number
}

// ── AsyncStorage lazy loader ──────────────────────────────────────────────────
// Guard: AsyncStorage may not be installed in all environments.

type AsyncStorageModule = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

let _AsyncStorage: AsyncStorageModule | null = null

function getStorage(): AsyncStorageModule | null {
  if (_AsyncStorage) return _AsyncStorage
  try {
    _AsyncStorage = require('@react-native-async-storage/async-storage').default
    return _AsyncStorage
  } catch {
    console.warn('[offlineQueue] @react-native-async-storage/async-storage not installed — queue disabled')
    return null
  }
}

// ── UUID helper ───────────────────────────────────────────────────────────────
// crypto.randomUUID() is available in RN 0.73+ / Hermes. Fall back to a
// time+random string if it isn't present.

function generateId(): string {
  try {
    // @ts-ignore — may not exist in older environments
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function enqueueSubmission(taskId: string, photoUris: string | string[]): Promise<string> {
  const storage = getStorage()
  const localId = generateId()

  if (!storage) return localId   // no-op in envs without AsyncStorage

  const urisArray = Array.isArray(photoUris) ? photoUris : [photoUris]

  const existing = await getQueue()
  const entry: QueuedSubmission = {
    id: localId,
    taskId,
    photoUris: urisArray,
    capturedAt: new Date().toISOString(),
    retryCount: 0,
  }
  existing.push(entry)

  try {
    await storage.setItem(QUEUE_KEY, JSON.stringify(existing))
  } catch (err) {
    console.warn('[offlineQueue] Failed to persist queue item', err)
  }

  return localId
}

export async function getQueue(): Promise<QueuedSubmission[]> {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = await storage.getItem(QUEUE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as QueuedSubmission[]
  } catch (err) {
    console.warn('[offlineQueue] Failed to read queue', err)
    return []
  }
}

export async function removeFromQueue(localId: string): Promise<void> {
  const storage = getStorage()
  if (!storage) return

  try {
    const queue = await getQueue()
    const updated = queue.filter(item => item.id !== localId)
    await storage.setItem(QUEUE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.warn('[offlineQueue] Failed to remove queue item', err)
  }
}

export async function updateRetryCount(localId: string): Promise<void> {
  const storage = getStorage()
  if (!storage) return

  try {
    const queue = await getQueue()
    const updated = queue.map(item =>
      item.id === localId ? { ...item, retryCount: item.retryCount + 1 } : item
    )
    await storage.setItem(QUEUE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.warn('[offlineQueue] Failed to update retry count', err)
  }
}

export async function processQueue(
  uploadFn: (item: QueuedSubmission) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  const queue = await getQueue()
  let processed = 0
  let failed = 0

  for (const item of queue) {
    // Dead-letter threshold
    if (item.retryCount >= 3) {
      console.warn('[offlineQueue] Skipping dead-letter item', item.id, `(${item.retryCount} retries)`)
      continue
    }

    try {
      const success = await uploadFn(item)
      if (success) {
        await removeFromQueue(item.id)
        processed++
      } else {
        await updateRetryCount(item.id)
        failed++
      }
    } catch (err) {
      console.warn('[offlineQueue] uploadFn threw for item', item.id, err)
      await updateRetryCount(item.id)
      failed++
    }
  }

  return { processed, failed }
}

// ── Task pending-sync AsyncStorage helpers ─────────────────────────────────────
// Marks a task as 'pending_sync' locally so the task feed can show the badge.

const PENDING_SYNC_KEY = 'mosaic_pending_sync_tasks'

export async function markTaskPendingSync(taskId: string): Promise<void> {
  const storage = getStorage()
  if (!storage) return

  try {
    const raw = await storage.getItem(PENDING_SYNC_KEY)
    const ids: string[] = raw ? JSON.parse(raw) : []
    if (!ids.includes(taskId)) {
      ids.push(taskId)
      await storage.setItem(PENDING_SYNC_KEY, JSON.stringify(ids))
    }
  } catch (err) {
    console.warn('[offlineQueue] Failed to mark task pending sync', err)
  }
}

export async function clearTaskPendingSync(taskId: string): Promise<void> {
  const storage = getStorage()
  if (!storage) return

  try {
    const raw = await storage.getItem(PENDING_SYNC_KEY)
    if (!raw) return
    const ids: string[] = JSON.parse(raw)
    await storage.setItem(PENDING_SYNC_KEY, JSON.stringify(ids.filter(id => id !== taskId)))
  } catch (err) {
    console.warn('[offlineQueue] Failed to clear task pending sync', err)
  }
}

export async function getPendingSyncTaskIds(): Promise<string[]> {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = await storage.getItem(PENDING_SYNC_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}
