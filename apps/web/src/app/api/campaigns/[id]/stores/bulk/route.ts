import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface BulkBody {
  storeIds: string[]
  action: 'reassign' | 'mark_complete' | 'remove'
  collectorId?: string
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: campaignId } = await context.params
  const supabase = await createClient()

  // Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Org
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return NextResponse.json({ error: 'Profile or organization not found' }, { status: 403 })
  }

  // Verify campaign belongs to org
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

  const body: BulkBody = await request.json()
  const { storeIds, action, collectorId } = body

  if (!Array.isArray(storeIds) || storeIds.length === 0) {
    return NextResponse.json({ error: 'storeIds must be a non-empty array' }, { status: 400 })
  }

  if (!['reassign', 'mark_complete', 'remove'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (action === 'reassign') {
    if (!collectorId) {
      return NextResponse.json({ error: 'collectorId is required for reassign action' }, { status: 400 })
    }

    const { error, count } = await supabase
      .from('tasks')
      .update({ assigned_to: collectorId })
      .in('store_id', storeIds)
      .eq('campaign_id', campaignId)
      .eq('status', 'open')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: count ?? 0 })
  }

  if (action === 'mark_complete') {
    const { error, count } = await supabase
      .from('tasks')
      .update({ status: 'scored' })
      .in('store_id', storeIds)
      .eq('campaign_id', campaignId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated: count ?? 0 })
  }

  if (action === 'remove') {
    const { error, count } = await supabase
      .from('campaign_stores')
      .delete()
      .in('store_id', storeIds)
      .eq('campaign_id', campaignId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, removed: count ?? 0 })
  }
}
