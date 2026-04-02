import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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
  const { data: existing, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, organization_id')
    .eq('id', campaignId)
    .single()

  if (campaignError || !existing) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (existing.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 4. Parse and validate body
  const body = await request.json()
  const { name, brief, payout_amount, status } = body

  const allowedStatuses = ['draft', 'active', 'paused', 'completed']
  if (status !== undefined && !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = String(name).trim()
  if (brief !== undefined) updates.brief = brief === '' ? null : String(brief).trim()
  if (payout_amount !== undefined) updates.payout_amount = Number(payout_amount)
  if (status !== undefined) updates.status = status

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // 5. Apply update
  const { data: campaign, error: updateError } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', campaignId)
    .select()
    .single()

  if (updateError) {
    console.error('[campaigns PATCH] error:', updateError)
    return NextResponse.json(
      { error: 'Failed to update campaign', detail: updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ campaign })
}
