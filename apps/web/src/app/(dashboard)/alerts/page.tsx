import { createClient } from '@/lib/supabase/server'
import AlertsClient from './AlertsClient'

export default async function AlertsPage() {
  const supabase = await createClient()

  // Get current user's org_id from their profile
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, organization_id')
    .eq('id', user?.id)
    .single()

  const orgId = profile?.org_id ?? profile?.organization_id ?? null

  const { data: alerts } = orgId
    ? await supabase.rpc('get_recent_alerts', { org_id: orgId })
    : { data: [] }

  // Fetch active campaigns with SLA status
  const { data: campaigns } = orgId
    ? await supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  // Fetch SLA statuses for each campaign in parallel
  const slaStatuses: Record<string, unknown> = {}
  if (campaigns && campaigns.length > 0) {
    await Promise.all(
      campaigns.map(async (c) => {
        const { data } = await supabase.rpc('get_sla_status', { p_campaign_id: c.id })
        if (data) slaStatuses[c.id] = data
      })
    )
  }

  return (
    <AlertsClient
      alerts={alerts ?? []}
      campaigns={campaigns ?? []}
      slaStatuses={slaStatuses}
    />
  )
}
