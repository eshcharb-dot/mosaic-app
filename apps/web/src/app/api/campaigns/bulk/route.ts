import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface BulkBody {
  campaignIds: string[]
  action: 'pause' | 'activate' | 'delete'
}

export async function POST(request: NextRequest) {
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

  const orgId = profile.organization_id

  const body: BulkBody = await request.json()
  const { campaignIds, action } = body

  if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
    return NextResponse.json({ error: 'campaignIds must be a non-empty array' }, { status: 400 })
  }

  if (!['pause', 'activate', 'delete'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Verify all campaigns belong to this org
  const { data: owned, error: ownedError } = await supabase
    .from('campaigns')
    .select('id, status')
    .in('id', campaignIds)
    .eq('organization_id', orgId)

  if (ownedError) {
    return NextResponse.json({ error: 'Failed to verify campaign ownership' }, { status: 500 })
  }

  const ownedIds = (owned ?? []).map(c => c.id)
  const unowned = campaignIds.filter(id => !ownedIds.includes(id))
  if (unowned.length > 0) {
    return NextResponse.json(
      { error: `Some campaigns not found or not owned by your organization: ${unowned.join(', ')}` },
      { status: 403 }
    )
  }

  let success = 0
  let failed = 0
  const errors: string[] = []

  if (action === 'pause') {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'paused' })
      .in('id', campaignIds)
      .eq('organization_id', orgId)

    if (error) {
      failed = campaignIds.length
      errors.push(error.message)
    } else {
      success = campaignIds.length
    }
  } else if (action === 'activate') {
    // Call activate_campaign RPC for each
    for (const id of campaignIds) {
      const { error } = await supabase.rpc('activate_campaign', { p_campaign_id: id })
      if (error) {
        failed++
        errors.push(`${id}: ${error.message}`)
      } else {
        success++
      }
    }
  } else if (action === 'delete') {
    // Only delete drafts
    const draftIds = (owned ?? []).filter(c => c.status === 'draft').map(c => c.id)
    const nonDraftIds = campaignIds.filter(id => !draftIds.includes(id))

    if (nonDraftIds.length > 0) {
      failed += nonDraftIds.length
      errors.push(`${nonDraftIds.length} campaign(s) skipped — only draft campaigns can be deleted`)
    }

    if (draftIds.length > 0) {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .in('id', draftIds)
        .eq('organization_id', orgId)
        .eq('status', 'draft')

      if (error) {
        failed += draftIds.length
        errors.push(error.message)
      } else {
        success += draftIds.length
      }
    }
  }

  return NextResponse.json({ success, failed, errors })
}
