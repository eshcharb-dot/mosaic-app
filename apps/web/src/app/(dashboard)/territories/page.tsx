import { createClient } from '@/lib/supabase/server'
import TerritoriesClient from './TerritoriesClient'

export default async function TerritoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let orgId: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    orgId = profile?.organization_id ?? null
  }

  // Territories with store + collector counts
  const { data: territories } = orgId
    ? await supabase
        .from('territories')
        .select(`
          *,
          territory_stores(store_id),
          territory_collectors(collector_id)
        `)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
    : { data: [] }

  // All stores for this org (for the assignment checklist)
  const { data: stores } = orgId
    ? await supabase
        .from('stores')
        .select('id, name, city, lat, lng')
        .order('name')
    : { data: [] }

  // Collectors (profiles with role collector in this org)
  const { data: collectors } = orgId
    ? await supabase
        .from('profiles')
        .select('id, full_name, email, collector_tier')
        .eq('organization_id', orgId)
        .order('full_name')
    : { data: [] }

  return (
    <TerritoriesClient
      territories={territories ?? []}
      allStores={stores ?? []}
      allCollectors={collectors ?? []}
    />
  )
}
