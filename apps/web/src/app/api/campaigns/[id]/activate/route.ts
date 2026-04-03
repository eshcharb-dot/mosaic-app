import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PLAN_SUBMISSION_LIMITS: Record<string, number> = {
  starter: 50,
  growth: 500,
  enterprise: 999999,
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: campaignId } = await context.params

  const supabase = await createClient()

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Fetch caller's organization
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return NextResponse.json({ error: 'Profile or organization not found' }, { status: 403 })
  }

  // 3. Verify the campaign belongs to the caller's org
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, organization_id')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (campaign.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 4. Plan limit check — submissions this month
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('org_id', profile.organization_id)
    .maybeSingle()

  const plan = subscription?.plan ?? 'starter'
  const submissionLimit = PLAN_SUBMISSION_LIMITS[plan] ?? 50

  const { data: usageRows } = await supabase
    .from('usage_events')
    .select('count')
    .eq('org_id', profile.organization_id)
    .eq('event_type', 'submission')
    .gte('recorded_at', periodStart)

  const monthlySubmissions = (usageRows ?? []).reduce((sum, r) => sum + (r.count ?? 1), 0)

  if (monthlySubmissions >= submissionLimit) {
    return NextResponse.json(
      { error: 'Submission limit reached. Upgrade to Growth.' },
      { status: 402 }
    )
  }

  // 5. Call the DB function
  const { data: tasksCreated, error: rpcError } = await supabase
    .rpc('activate_campaign', { p_campaign_id: campaignId })

  if (rpcError) {
    console.error('[activate_campaign] rpc error:', rpcError)
    return NextResponse.json(
      { error: 'Failed to activate campaign', detail: rpcError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, tasks_created: tasksCreated })
}
