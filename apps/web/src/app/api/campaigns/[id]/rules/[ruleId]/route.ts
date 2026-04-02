import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string; ruleId: string }>
}

async function authorize(supabase: Awaited<ReturnType<typeof createClient>>, campaignId: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized', status: 401 }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) return { error: 'Profile not found', status: 403 }

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, organization_id')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) return { error: 'Campaign not found', status: 404 }
  if (campaign.organization_id !== profile.organization_id) return { error: 'Forbidden', status: 403 }

  return { ok: true }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id: campaignId, ruleId } = await context.params
  const supabase = await createClient()

  const auth = await authorize(supabase, campaignId)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  const validTypes = ['must_have', 'must_not_have', 'count_check', 'position_check', 'label_check']
  if (body.rule_type !== undefined) {
    if (!validTypes.includes(body.rule_type)) return NextResponse.json({ error: 'Invalid rule_type' }, { status: 400 })
    updates.rule_type = body.rule_type
  }
  if (body.description !== undefined) {
    if (!body.description.trim()) return NextResponse.json({ error: 'description cannot be empty' }, { status: 400 })
    updates.description = body.description.trim()
  }
  if (body.weight !== undefined) {
    const w = Number(body.weight)
    if (!Number.isInteger(w) || w < 1 || w > 100) return NextResponse.json({ error: 'weight must be 1-100' }, { status: 400 })
    updates.weight = w
  }
  if (body.is_blocking !== undefined) updates.is_blocking = Boolean(body.is_blocking)

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

  const { data: rule, error } = await supabase
    .from('compliance_rules')
    .update(updates)
    .eq('id', ruleId)
    .eq('campaign_id', campaignId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })

  return NextResponse.json({ rule })
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id: campaignId, ruleId } = await context.params
  const supabase = await createClient()

  const auth = await authorize(supabase, campaignId)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { error } = await supabase
    .from('compliance_rules')
    .delete()
    .eq('id', ruleId)
    .eq('campaign_id', campaignId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
