import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getPagination(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)))
  return { page, perPage, offset: (page - 1) * perPage }
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

  const { page, perPage, offset } = getPagination(request)

  const { data, count, error } = await supabase
    .from('stores')
    .select('id, name, address, city, country, latitude, longitude, created_at', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('name', { ascending: true })
    .range(offset, offset + perPage - 1)

  if (error) {
    console.error('[v1/stores GET]', error)
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
  }

  // Attach latest compliance score per store
  const storeIds = (data ?? []).map((s: { id: string }) => s.id)
  let scoresMap: Record<string, number | null> = {}

  if (storeIds.length > 0) {
    const { data: latestScores } = await supabase
      .from('submissions')
      .select('store_id, compliance_score, submitted_at')
      .in('store_id', storeIds)
      .not('compliance_score', 'is', null)
      .order('submitted_at', { ascending: false })

    const seen = new Set<string>()
    for (const row of latestScores ?? []) {
      if (!seen.has(row.store_id)) {
        scoresMap[row.store_id] = row.compliance_score
        seen.add(row.store_id)
      }
    }
  }

  const enriched = (data ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    latest_compliance_score: scoresMap[s.id as string] ?? null,
  }))

  return NextResponse.json({
    data: enriched,
    meta: { total: count ?? 0, page, per_page: perPage },
  })
}
