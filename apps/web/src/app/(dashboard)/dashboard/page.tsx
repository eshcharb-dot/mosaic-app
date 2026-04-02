import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get authenticated user's org
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

  // Fetch all campaigns overview via RPC
  const { data: campaignsOverview } = orgId
    ? await supabase.rpc('get_all_campaigns_overview', { p_org_id: orgId })
    : { data: [] }

  const { data: recentSubmissions } = await supabase
    .from('submissions')
    .select('*, stores(name, city), compliance_results(score, is_compliant)')
    .order('submitted_at', { ascending: false })
    .limit(20)

  // Use the first campaign for trend + map data
  const firstCampaignId = campaignsOverview?.[0]?.campaign_id ?? null

  const [trendRes, mapRes, territoryMapRes] = await Promise.all([
    firstCampaignId
      ? supabase.rpc('get_compliance_trend', { campaign_id: firstCampaignId })
      : Promise.resolve({ data: [] }),
    firstCampaignId
      ? supabase.rpc('get_store_map_data', { campaign_id: firstCampaignId })
      : Promise.resolve({ data: [] }),
    orgId
      ? supabase.rpc('get_store_territory_map', { p_org_id: orgId })
      : Promise.resolve({ data: [] }),
  ])

  // Merge territory data into map points
  const territoryByStore = new Map<string, any>(
    (territoryMapRes.data ?? []).map((r: any) => [r.store_id, r])
  )
  const enrichedMapData = (mapRes.data ?? []).map((s: any) => {
    const t = territoryByStore.get(s.store_id)
    return {
      ...s,
      territory_id: t?.territory_id ?? null,
      territory_name: t?.territory_name ?? null,
      territory_color: t?.territory_color ?? null,
    }
  })

  return (
    <DashboardClient
      campaigns={campaignsOverview ?? []}
      submissions={recentSubmissions ?? []}
      trend={trendRes.data ?? []}
      mapData={enrichedMapData}
    />
  )
}
