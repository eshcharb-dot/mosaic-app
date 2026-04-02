import { supabase } from './supabase'
import { getQueue, removeFromQueue, updateRetryCount, clearTaskPendingSync } from './offlineQueue'
import { scheduleLocalNotification } from './notifications'

const MAX_RETRIES = 3

export type SyncResult = {
  processed: number
  failed: number
}

export async function syncPendingSubmissions(): Promise<SyncResult> {
  const queue = await getQueue()
  if (queue.length === 0) return { processed: 0, failed: 0 }

  let processed = 0
  let failed = 0

  for (const item of queue) {
    // Skip dead-letter items
    if (item.retryCount >= MAX_RETRIES) {
      console.warn('[syncManager] Skipping dead-letter item', item.id)
      continue
    }

    try {
      // 1. Convert local file URI to blob
      const response = await fetch(item.photoUri)
      if (!response.ok) throw new Error(`Failed to read local file: ${response.status}`)
      const blob = await response.blob()

      // 2. Upload to Supabase Storage
      const fileName = `${item.taskId}/${item.id}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(fileName, blob, { contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      // 3. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(fileName)

      // 4. Create submission row
      const { error: insertError } = await supabase
        .from('submissions')
        .insert({
          task_id: item.taskId,
          photo_urls: [publicUrl],
          status: 'pending_review',
          submitted_at: item.capturedAt,
        })

      if (insertError) throw insertError

      // 5. Update task status
      await supabase
        .from('tasks')
        .update({ status: 'submitted', completed_at: new Date().toISOString() })
        .eq('id', item.taskId)

      // 6. Remove from offline queue and clear pending-sync marker
      await removeFromQueue(item.id)
      await clearTaskPendingSync(item.taskId)

      // 7. Notify user
      await scheduleLocalNotification(
        'Submission synced',
        'Your offline capture has been submitted successfully'
      )

      processed++
    } catch (err) {
      console.warn('[syncManager] Sync failed for', item.id, err)
      await updateRetryCount(item.id)
      failed++
    }
  }

  return { processed, failed }
}
