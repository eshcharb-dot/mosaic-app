import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ orgId: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { orgId } = await context.params

  const supabase = await createClient()

  // Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the caller belongs to the requested org
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return NextResponse.json({ error: 'Profile or organization not found' }, { status: 403 })
  }

  if (profile.organization_id !== orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch dashboard summary
  const { data: summary, error: summaryError } = await supabase
    .rpc('get_dashboard_summary', { org_id: orgId })

  if (summaryError) {
    console.error('[dashboard] get_dashboard_summary error:', summaryError)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard summary', detail: summaryError.message },
      { status: 500 }
    )
  }

  // Find the first active campaign for org-scoped trend data.
  // get_compliance_trend accepts null campaign_id for org-wide results.
  const { data: activeCampaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const trendCampaignId: string | null = activeCampaign?.id ?? null

  const { data: trend, error: trendError } = await supabase
    .rpc('get_compliance_trend', {
      campaign_id: trendCampaignId,
      days: 30,
    })

  if (trendError) {
    console.error('[dashboard] get_compliance_trend error:', trendError)
    return NextResponse.json(
      { error: 'Failed to fetch compliance trend', detail: trendError.message },
      { status: 500 }
    )
  }

  // summary comes back as an array from rpc; unwrap the single row
  const summaryRow = Array.isArray(summary) ? summary[0] ?? null : summary

  return NextResponse.json({ summary: summaryRow, trend: trend ?? [] })
}
