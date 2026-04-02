import { createClient } from '@/lib/supabase/server'
import AlertsClient from './AlertsClient'

export default async function AlertsPage() {
  const supabase = await createClient()

  // Get current user's org_id from their profile
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user?.id)
    .single()

  const orgId = profile?.org_id ?? null

  const { data: alerts } = orgId
    ? await supabase.rpc('get_recent_alerts', { org_id: orgId })
    : { data: [] }

  return <AlertsClient alerts={alerts ?? []} />
}
