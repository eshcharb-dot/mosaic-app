import { createClient } from '@/lib/supabase/server'
import CollectorsClient from './CollectorsClient'

export default async function CollectorsPage() {
  const supabase = await createClient()

  // Get the current user's org
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user?.id ?? '')
    .single()

  const orgId = profile?.organization_id ?? null

  const { data: leaderboard } = await supabase.rpc('get_collector_leaderboard', {
    p_org_id: orgId,
    p_period: 'all_time',
  })

  return (
    <CollectorsClient
      initialLeaderboard={leaderboard ?? []}
      orgId={orgId}
    />
  )
}
