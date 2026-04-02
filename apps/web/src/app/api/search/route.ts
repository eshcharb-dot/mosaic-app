import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ campaigns: [], stores: [], submissions: [] })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id
  if (!orgId) return NextResponse.json({ campaigns: [], stores: [], submissions: [] })

  const pattern = `%${q}%`

  const [campaignsRes, storesRes, submissionsRes] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, name, status, compliance_score')
      .eq('organization_id', orgId)
      .ilike('name', pattern)
      .limit(3),

    supabase
      .from('stores')
      .select('id, name, city, address')
      .eq('organization_id', orgId)
      .or(`name.ilike.${pattern},city.ilike.${pattern},address.ilike.${pattern}`)
      .limit(3),

    // Submissions: join stores to get org scope + store name for search
    supabase
      .from('submissions')
      .select('id, submitted_at, stores!inner(name, organization_id), campaigns(name), compliance_results(score)')
      .eq('stores.organization_id', orgId)
      .ilike('stores.name', pattern)
      .order('submitted_at', { ascending: false })
      .limit(3),
  ])

  // Normalize submission shape for client
  const submissions = (submissionsRes.data ?? []).map((s: any) => ({
    id: s.id,
    submitted_at: s.submitted_at,
    store_name: s.stores?.name ?? null,
    campaign_name: s.campaigns?.name ?? null,
    score: s.compliance_results?.[0]?.score ?? null,
  }))

  return NextResponse.json({
    campaigns: campaignsRes.data ?? [],
    stores: storesRes.data ?? [],
    submissions,
  })
}
