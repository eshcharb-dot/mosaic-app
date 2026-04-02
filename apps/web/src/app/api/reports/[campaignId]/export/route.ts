import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ campaignId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { campaignId } = await context.params

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

  // 3. Verify campaign ownership
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

  // 4. Fetch submissions + compliance_results + stores for this campaign
  const { data: submissions, error: subError } = await supabase
    .from('submissions')
    .select(`
      id,
      collector_id,
      submitted_at,
      stores ( name ),
      compliance_results (
        score,
        is_compliant,
        summary,
        processed_at,
        scored_at
      )
    `)
    .eq('campaign_id', campaignId)
    .order('submitted_at', { ascending: false })

  if (subError) {
    return NextResponse.json(
      { error: 'Failed to fetch submissions', detail: subError.message },
      { status: 500 }
    )
  }

  // 5. Build CSV
  const escape = (val: unknown) => {
    const s = String(val ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const csvHeader = 'submission_id,store_name,submitted_at,score,is_compliant,summary,collector_id'

  const csvRows = (submissions ?? []).map((sub) => {
    // Pick the most recent compliance result
    const results: Array<{ score?: number; is_compliant?: boolean; summary?: string; processed_at?: string; scored_at?: string }> =
      Array.isArray(sub.compliance_results) ? sub.compliance_results : []
    const latest = results.sort((a, b) => {
      const aTime = a.processed_at ?? a.scored_at ?? ''
      const bTime = b.processed_at ?? b.scored_at ?? ''
      return bTime.localeCompare(aTime)
    })[0] ?? null

    const storeName = (sub.stores as { name?: string } | null)?.name ?? ''

    return [
      escape(sub.id),
      escape(storeName),
      escape(sub.submitted_at ?? ''),
      escape(latest?.score ?? ''),
      latest != null ? escape(String(latest.is_compliant)) : '',
      escape(latest?.summary ?? ''),
      escape(sub.collector_id ?? ''),
    ].join(',')
  })

  const csv = [csvHeader, ...csvRows].join('\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="campaign-${campaignId}-report.csv"`,
    },
  })
}
