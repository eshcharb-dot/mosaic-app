import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  // 4. Call the DB function
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
