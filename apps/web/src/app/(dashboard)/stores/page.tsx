import { createClient } from '@/lib/supabase/server'
import StoresClient from './StoresClient'

export default async function StoresPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get caller's org
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id
  if (!orgId) return <StoresClient stores={[]} />

  // Fetch all stores linked to this org's campaigns, with aggregate compliance data
  const { data: rows } = await supabase
    .from('campaign_stores')
    .select(`
      store_id,
      compliance_score,
      last_submission_at,
      campaigns!inner(organization_id),
      stores!inner(id, name, city, address, postcode, retailer)
    `)
    .eq('campaigns.organization_id', orgId)

  // Deduplicate by store_id and aggregate
  const storeMap = new Map<string, {
    id: string
    name: string
    city: string | null
    address: string | null
    postcode: string | null
    retailer: string | null
    scores: number[]
    last_audit_date: string | null
    audit_count: number
  }>()

  for (const row of rows ?? []) {
    const s = row.stores as any
    if (!s) continue
    const existing = storeMap.get(s.id)
    if (existing) {
      if (row.compliance_score !== null) existing.scores.push(row.compliance_score)
      if (
        row.last_submission_at &&
        (!existing.last_audit_date || row.last_submission_at > existing.last_audit_date)
      ) {
        existing.last_audit_date = row.last_submission_at
      }
      existing.audit_count += 1
    } else {
      storeMap.set(s.id, {
        id: s.id,
        name: s.name,
        city: s.city,
        address: s.address,
        postcode: s.postcode,
        retailer: s.retailer,
        scores: row.compliance_score !== null ? [row.compliance_score] : [],
        last_audit_date: row.last_submission_at ?? null,
        audit_count: 1,
      })
    }
  }

  const stores = Array.from(storeMap.values()).map(s => ({
    ...s,
    avg_score: s.scores.length > 0
      ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length)
      : null,
  }))

  return <StoresClient stores={stores} />
}
