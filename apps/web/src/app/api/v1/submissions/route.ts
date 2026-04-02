import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getPagination(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)))
  return { page, perPage, offset: (page - 1) * perPage }
}

function getDateRange(request: NextRequest) {
  const { searchParams } = request.nextUrl
  return {
    from: searchParams.get('from'),
    to: searchParams.get('to'),
    campaignId: searchParams.get('campaign_id'),
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

  const { page, perPage, offset } = getPagination(request)
  const { from, to, campaignId } = getDateRange(request)

  let query = supabase
    .from('submissions')
    .select(
      'id, campaign_id, store_id, compliance_score, status, submitted_at, created_at',
      { count: 'exact' }
    )
    .eq('organization_id', orgId)
    .order('submitted_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (campaignId) query = query.eq('campaign_id', campaignId)
  if (from) query = query.gte('submitted_at', from)
  if (to) query = query.lte('submitted_at', to)

  const { data, count, error } = await query

  if (error) {
    console.error('[v1/submissions GET]', error)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }

  return NextResponse.json({
    data: data ?? [],
    meta: { total: count ?? 0, page, per_page: perPage },
  })
}
