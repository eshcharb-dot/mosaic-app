import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function getAuthedCampaign(campaignId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized', status: 401, supabase: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) return { error: 'Profile not found', status: 403, supabase: null }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, organization_id')
    .eq('id', campaignId)
    .single()
  if (!campaign) return { error: 'Campaign not found', status: 404, supabase: null }
  if (campaign.organization_id !== profile.organization_id)
    return { error: 'Forbidden', status: 403, supabase: null }

  return { error: null, status: 200, supabase }
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id: campaignId } = await context.params
  const { error, status, supabase } = await getAuthedCampaign(campaignId)
  if (error || !supabase) return NextResponse.json({ error }, { status })

  const { data, error: dbErr } = await supabase
    .from('campaign_slas')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ sla: data })
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id: campaignId } = await context.params
  const { error, status, supabase } = await getAuthedCampaign(campaignId)
  if (error || !supabase) return NextResponse.json({ error }, { status })

  const body = await req.json()
  const {
    min_compliance_score,
    audit_frequency_days,
    response_time_hours,
    target_compliant_pct,
  } = body

  // Validate
  if (min_compliance_score !== undefined && (min_compliance_score < 0 || min_compliance_score > 100))
    return NextResponse.json({ error: 'min_compliance_score must be 0-100' }, { status: 400 })
  if (target_compliant_pct !== undefined && (target_compliant_pct < 0 || target_compliant_pct > 100))
    return NextResponse.json({ error: 'target_compliant_pct must be 0-100' }, { status: 400 })

  const upsertData: Record<string, unknown> = { campaign_id: campaignId, updated_at: new Date().toISOString() }
  if (min_compliance_score !== undefined) upsertData.min_compliance_score = Number(min_compliance_score)
  if (audit_frequency_days !== undefined) upsertData.audit_frequency_days = Number(audit_frequency_days)
  if (response_time_hours !== undefined) upsertData.response_time_hours = Number(response_time_hours)
  if (target_compliant_pct !== undefined) upsertData.target_compliant_pct = Number(target_compliant_pct)

  const { data, error: dbErr } = await supabase
    .from('campaign_slas')
    .upsert(upsertData, { onConflict: 'campaign_id' })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ sla: data })
}
