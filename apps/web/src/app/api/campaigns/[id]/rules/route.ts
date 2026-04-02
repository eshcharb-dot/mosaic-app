import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
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

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id: campaignId } = await context.params
  const supabase = await createClient()

  const auth = await authorize(supabase, campaignId)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data: rules, error } = await supabase
    .from('compliance_rules')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rules })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: campaignId } = await context.params
  const supabase = await createClient()

  const auth = await authorize(supabase, campaignId)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const { rule_type, description, weight, is_blocking } = body

  const validTypes = ['must_have', 'must_not_have', 'count_check', 'position_check', 'label_check']
  if (!rule_type || !validTypes.includes(rule_type)) {
    return NextResponse.json({ error: 'Invalid rule_type' }, { status: 400 })
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }
  const w = Number(weight ?? 20)
  if (!Number.isInteger(w) || w < 1 || w > 100) {
    return NextResponse.json({ error: 'weight must be an integer 1-100' }, { status: 400 })
  }

  const { data: rule, error } = await supabase
    .from('compliance_rules')
    .insert({
      campaign_id: campaignId,
      rule_type,
      description: description.trim(),
      weight: w,
      is_blocking: Boolean(is_blocking),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rule }, { status: 201 })
}
