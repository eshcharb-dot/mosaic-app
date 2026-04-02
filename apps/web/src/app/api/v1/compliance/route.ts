import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getDateRange(request: NextRequest) {
  const { searchParams } = request.nextUrl
  return {
    from: searchParams.get('from'),
    to: searchParams.get('to'),
  }
}

export async function GET(request: NextRequest) {
  const orgId = request.headers.get('x-api-org-id')
  if (!orgId) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { from, to } = getDateRange(request)

  let query = supabase
    .from('submissions')
    .select('compliance_score, status, submitted_at', { count: 'exact' })
    .eq('organization_id', orgId)

  if (from) query = query.gte('submitted_at', from)
  if (to) query = query.lte('submitted_at', to)

  const { data, count, error } = await query

  if (error) {
    console.error('[v1/compliance GET]', error)
    return NextResponse.json({ error: 'Failed to fetch compliance data' }, { status: 500 })
  }

  const rows = data ?? []
  const withScore = rows.filter((r: { compliance_score: number | null }) => r.compliance_score !== null)
  const scores = withScore.map((r: { compliance_score: number }) => r.compliance_score)
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
    : null

  const passing = withScore.filter((r: { compliance_score: number }) => r.compliance_score >= 80).length
  const failing = withScore.filter((r: { compliance_score: number }) => r.compliance_score < 80).length

  const byStatus: Record<string, number> = {}
  for (const row of rows) {
    const s = (row as { status: string }).status ?? 'unknown'
    byStatus[s] = (byStatus[s] ?? 0) + 1
  }

  return NextResponse.json({
    data: {
      total_submissions: count ?? 0,
      scored_submissions: withScore.length,
      avg_compliance_score: avgScore,
      passing_count: passing,
      failing_count: failing,
      pass_rate: withScore.length > 0 ? Math.round((passing / withScore.length) * 100) : null,
      by_status: byStatus,
    },
    meta: {
      from: from ?? null,
      to: to ?? null,
    },
  })
}
