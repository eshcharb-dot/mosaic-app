import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export function trackUsage(orgId: string, eventType: string, count = 1) {
  // Fire-and-forget — intentionally not awaited
  getServiceClient()
    .from('usage_events')
    .insert({ org_id: orgId, event_type: eventType, count })
    .then(({ error }) => {
      if (error) console.error('[trackUsage] insert error:', error.message)
    })
}
