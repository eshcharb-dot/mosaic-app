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

  // Fetch submissions for this org, grouped by collector
  const { data: submissions, error: subError } = await supabase
    .from('submissions')
    .select(`
      collector_id,
      submitted_at,
      campaigns!inner ( organization_id ),
      compliance_results ( score, is_compliant )
    `)
    .eq('campaigns.organization_id', profile.organization_id)

  if (subError) {
    return NextResponse.json({ error: 'Failed to fetch collector data', detail: subError.message }, { status: 500 })
  }

  // Fetch collector profiles for tier and join_date
  const collectorIds = [...new Set((submissions ?? []).map(s => s.collector_id).filter(Boolean))]

  const { data: collectors } = await supabase
    .from('collectors')
    .select('id, tier, join_date, total_earned_gbp')
    .in('id', collectorIds)

  const collectorMap = new Map((collectors ?? []).map(c => [c.id, c]))

  // Aggregate per collector
  const statsMap: Record<string, {
    tasks_completed: number
    scores: number[]
  }> = {}

  for (const sub of (submissions ?? [])) {
    const cid = sub.collector_id
    if (!cid) continue
    if (!statsMap[cid]) statsMap[cid] = { tasks_completed: 0, scores: [] }
    statsMap[cid].tasks_completed++
    const results = Array.isArray(sub.compliance_results) ? sub.compliance_results : []
    const latest = results[0] as { score?: number } | undefined
    if (latest?.score != null) statsMap[cid].scores.push(latest.score)
  }

  const escape = (val: unknown) => {
    const s = String(val ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const header = 'collector_id,tier,tasks_completed,avg_score,total_earned_gbp,join_date'

  const rows = collectorIds.map(cid => {
    const stats = statsMap[cid] ?? { tasks_completed: 0, scores: [] }
    const collector = collectorMap.get(cid)
    const avgScore = stats.scores.length > 0
      ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
      : ''
    // Anonymize: show only first 8 chars of UUID
    const anonId = String(cid).substring(0, 8)

    return [
      escape(anonId),
      escape(collector?.tier ?? ''),
      escape(stats.tasks_completed),
      escape(avgScore),
      escape(collector?.total_earned_gbp ?? ''),
      escape(collector?.join_date ? new Date(collector.join_date).toISOString().split('T')[0] : ''),
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="collectors-export.csv"',
    },
  })
}
