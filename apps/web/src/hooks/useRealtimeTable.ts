'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// NOTE: Realtime must be enabled for each table you subscribe to.
// In the Supabase dashboard go to:
//   Database → Replication → supabase_realtime publication
// and toggle on the tables: submissions, alert_events
// Without this step subscriptions will connect but never fire row events.

type ConnectionStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CONNECTING'

export function useRealtimeTable<T extends { id: string }>(
  table: string,
  filter?: string
): { rows: T[]; isConnected: boolean } {
  const [rows, setRows] = useState<T[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('CONNECTING')
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Build a unique channel name so multiple instances on the same page don't clash
    const channelName = `realtime:${table}${filter ? ':' + filter : ''}`

    let postgresChangesOptions: {
      event: '*'
      schema: string
      table: string
      filter?: string
    } = {
      event: '*',
      schema: 'public',
      table,
    }

    if (filter) {
      postgresChangesOptions = { ...postgresChangesOptions, filter }
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        postgresChangesOptions,
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRows((prev) => {
              const newRows = [payload.new as T, ...prev]
              // cap at 100 rows to avoid unbounded growth
              return newRows.slice(0, 100)
            })
          } else if (payload.eventType === 'UPDATE') {
            setRows((prev) =>
              prev.map((row) =>
                row.id === (payload.new as T).id ? (payload.new as T) : row
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setRows((prev) =>
              prev.filter((row) => row.id !== (payload.old as { id: string }).id)
            )
          }
        }
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('SUBSCRIBED')
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          setStatus('CHANNEL_ERROR')
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter])

  return { rows, isConnected: status === 'SUBSCRIBED' }
}
