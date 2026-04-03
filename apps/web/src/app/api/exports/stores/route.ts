import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

  const url = new URL(request.url)
  const dateFrom = url.searchParams.get('date_from')
  const dateTo = url.searchParams.get('date_to')

  // Fetch stores that belong to campaigns in this org
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select(`
      id,
      name,
      city,
      address,
      lat,
      lng,
      campaign_stores (
        campaigns ( organization_id )
      ),
      territory_stores (
        territories ( name )
      )
    `)

  if (storesError) {
    return NextResponse.json({ error: 'Failed to fetch stores', detail: storesError.message }, { status: 500 })
  }

  // Filter stores that belong to this org via campaign_stores
  const orgStores = (stores ?? []).filter(store => {
    const cs = Array.isArray(store.campaign_stores) ? store.campaign_stores : []
    return cs.some((csr: any) => csr?.campaigns?.organization_id === profile.organization_id)
  })

  const storeIds = orgStores.map(s => s.id)

  if (storeIds.length === 0) {
    const csv = 'store_name,city,address,lat,lng,total_audits,avg_score,last_audit_date,compliance_rate_pct,territory_name\n'
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="stores-export.csv"',
      },
    })
  }

  // Fetch compliance results for these stores
  let crQuery = supabase
    .from('submissions')
    .select(`
      store_id,
      submitted_at,
      compliance_results ( score, is_compliant )
    `)
    .in('store_id', storeIds)

  if (dateFrom) crQuery = crQuery.gte('submitted_at', dateFrom)
  if (dateTo) crQuery = crQuery.lte('submitted_at', dateTo)

  const { data: submissions } = await crQuery

  // Aggregate per store
  const statsMap: Record<string, {
    total_audits: number
    scores: number[]
    compliant_count: number
    last_audit_date: string
  }> = {}

  for (const sub of (submissions ?? [])) {
    const sid = sub.store_id
    if (!sid) continue
    if (!statsMap[sid]) {
      statsMap[sid] = { total_audits: 0, scores: [], compliant_count: 0, last_audit_date: '' }
    }
    statsMap[sid].total_audits++
    if (sub.submitted_at && sub.submitted_at > statsMap[sid].last_audit_date) {
      statsMap[sid].last_audit_date = sub.submitted_at
    }
    const results = Array.isArray(sub.compliance_results) ? sub.compliance_results : []
    const latest = results[0] as { score?: number; is_compliant?: boolean } | undefined
    if (latest?.score != null) statsMap[sid].scores.push(latest.score)
    if (latest?.is_compliant) statsMap[sid].compliant_count++
  }

  const escape = (val: unknown) => {
    const s = String(val ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const header = 'store_name,city,address,lat,lng,total_audits,avg_score,last_audit_date,compliance_rate_pct,territory_name'

  const rows = orgStores.map(store => {
    const stats = statsMap[store.id] ?? { total_audits: 0, scores: [], compliant_count: 0, last_audit_date: '' }
    const avgScore = stats.scores.length > 0
      ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
      : ''
    const complianceRate = stats.total_audits > 0
      ? Math.round((stats.compliant_count / stats.total_audits) * 100)
      : ''
    const territoryStores = Array.isArray(store.territory_stores) ? store.territory_stores : []
    const territory = (territoryStores[0] as any)?.territories?.name ?? ''

    return [
      escape(store.name),
      escape(store.city ?? ''),
      escape(store.address ?? ''),
      escape(store.lat ?? ''),
      escape(store.lng ?? ''),
      escape(stats.total_audits),
      escape(avgScore),
      escape(stats.last_audit_date),
      escape(complianceRate),
      escape(territory),
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="stores-export.csv"',
    },
  })
}
