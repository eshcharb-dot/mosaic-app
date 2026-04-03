import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrgDetailClient from './OrgDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminOrgDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch org
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (!org) notFound()

  // Fetch related data in parallel
  const [campaignsRes, storesRes, membersRes, usageRes] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, name, status, created_at, payout_amount')
      .eq('organization_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('stores')
      .select('id, name, city, country, created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles_with_email')
      .select('id, full_name, email, role, created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('usage_events')
      .select('event_type, recorded_at')
      .eq('org_id', id)
      .gte('recorded_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .order('recorded_at', { ascending: false })
      .limit(200),
  ])

  return (
    <OrgDetailClient
      org={org}
      campaigns={campaignsRes.data ?? []}
      stores={storesRes.data ?? []}
      members={membersRes.data ?? []}
      usageEvents={usageRes.data ?? []}
    />
  )
}
