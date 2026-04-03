import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return NextResponse.json({ error: 'Profile or organization not found' }, { status: 403 })
  }

  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select(`
      id,
      name,
      status,
      compliance_score,
      created_at,
      updated_at,
      campaign_stores ( count ),
      submissions (
        id,
        submitted_at,
        compliance_results ( is_compliant )
      ),
      tasks ( id, status )
    `)
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })

  if (campaignsError) {
    return NextResponse.json({ error: 'Failed to fetch campaigns', detail: campaignsError.message }, { status: 500 })
  }

  const escape = (val: unknown) => {
    const s = String(val ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const header = 'campaign_name,status,store_count,submission_count,avg_score,compliant_pct,open_tasks,created_date,last_activity'

  const rows = (campaigns ?? []).map(campaign => {
    const storeCount = (campaign.campaign_stores as Array<{ count: number }>)?.[0]?.count ?? 0
    const submissions = Array.isArray(campaign.submissions) ? campaign.submissions : []
    const submissionCount = submissions.length

    const allResults = submissions.flatMap((s: any) =>
      Array.isArray(s.compliance_results) ? s.compliance_results : []
    )
    const compliantCount = allResults.filter((r: any) => r.is_compliant).length
    const compliantPct = submissionCount > 0 ? Math.round((compliantCount / submissionCount) * 100) : ''

    const tasks = Array.isArray(campaign.tasks) ? campaign.tasks : []
    const openTasks = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'closed').length

    const lastActivity = submissions.length > 0
      ? submissions.reduce((latest: string, s: any) => {
          return s.submitted_at > latest ? s.submitted_at : latest
        }, '')
      : campaign.updated_at ?? ''

    return [
      escape(campaign.name),
      escape(campaign.status),
      escape(storeCount),
      escape(submissionCount),
      escape(campaign.compliance_score != null ? Math.round(campaign.compliance_score) : ''),
      escape(compliantPct),
      escape(openTasks),
      escape(campaign.created_at ? new Date(campaign.created_at).toISOString().split('T')[0] : ''),
      escape(lastActivity ? new Date(lastActivity).toISOString().split('T')[0] : ''),
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="campaigns-export.csv"',
    },
  })
}
