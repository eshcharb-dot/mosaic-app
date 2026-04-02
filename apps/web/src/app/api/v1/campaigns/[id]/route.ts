import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const orgId = request.headers.get('x-api-org-id')
  if (!orgId) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('id, name, status, start_date, end_date, created_at, updated_at, organization_id')
    .eq('id', id)
    .single()

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (campaign.organization_id !== orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch submission stats
  const { count: totalSubmissions } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', id)

  const { data: complianceAgg } = await supabase
    .from('submissions')
    .select('compliance_score')
    .eq('campaign_id', id)
    .not('compliance_score', 'is', null)

  const scores = (complianceAgg ?? []).map((s: { compliance_score: number }) => s.compliance_score)
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
    : null

  return NextResponse.json({
    data: {
      ...campaign,
      stats: {
        total_submissions: totalSubmissions ?? 0,
        avg_compliance_score: avgScore,
      },
    },
    meta: {},
  })
}
