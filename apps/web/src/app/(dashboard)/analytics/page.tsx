import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './AnalyticsClient'

export const metadata = { title: 'Analytics — Mosaic' }

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return (
      <div className="p-8 text-[#b0b0d0]">
        You are not associated with any organisation.
      </div>
    )
  }

  const orgId = profile.organization_id

  // Get the first campaign to drive the trend chart
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)

  const firstCampaignId = campaigns?.[0]?.id ?? null

  const [analyticsRes, trendRes] = await Promise.all([
    supabase.rpc('get_analytics_data', { p_org_id: orgId }),
    firstCampaignId
      ? supabase.rpc('get_compliance_trend', { campaign_id: firstCampaignId })
      : Promise.resolve({ data: [] }),
  ])

  const analytics = analyticsRes.data ?? {}

  return (
    <AnalyticsClient
      scoreDistribution={analytics.score_distribution ?? []}
      topStores={analytics.top_stores ?? []}
      bottomStores={analytics.bottom_stores ?? []}
      campaignComparison={analytics.campaign_comparison ?? []}
      trend={(trendRes as any).data ?? []}
    />
  )
}
