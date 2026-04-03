import { createClient } from '@/lib/supabase/server'
import OrgListClient from './OrgListClient'

export default async function AdminOrgsPage() {
  const supabase = await createClient()

  // Fetch all orgs with aggregated counts
  const { data: orgs } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      plan,
      is_active,
      created_at,
      profiles(count),
      stores(count),
      campaigns(count)
    `)
    .order('created_at', { ascending: false })

  // Normalize counts from Supabase aggregate syntax
  const normalized = (orgs ?? []).map((o: any) => ({
    id: o.id,
    name: o.name,
    plan: o.plan ?? 'starter',
    is_active: o.is_active ?? true,
    created_at: o.created_at,
    member_count: Array.isArray(o.profiles) ? o.profiles[0]?.count ?? 0 : 0,
    store_count: Array.isArray(o.stores) ? o.stores[0]?.count ?? 0 : 0,
    campaign_count: Array.isArray(o.campaigns) ? o.campaigns[0]?.count ?? 0 : 0,
  }))

  return <OrgListClient orgs={normalized} />
}
