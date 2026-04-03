import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeText, validationError } from '@/lib/validate'

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

  const fieldErrors: Record<string, string> = {}

  const allowedStatuses = ['draft', 'active', 'paused', 'completed']
  if (status !== undefined && !allowedStatuses.includes(status)) {
    fieldErrors.status = `Must be one of: ${allowedStatuses.join(', ')}`
  }

  let sanitizedName: string | undefined
  if (name !== undefined) {
    sanitizedName = sanitizeText(String(name), 100)
    if (sanitizedName.length === 0) fieldErrors.name = 'name cannot be empty'
  }

  let sanitizedBrief: string | null | undefined
  if (brief !== undefined) {
    sanitizedBrief = brief === '' ? null : sanitizeText(String(brief), 2000)
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(validationError(fieldErrors), { status: 422 })
  }

  const updates: Record<string, unknown> = {}
  if (sanitizedName !== undefined) updates.name = sanitizedName
  if (sanitizedBrief !== undefined) updates.brief = sanitizedBrief
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
