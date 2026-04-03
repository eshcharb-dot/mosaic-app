import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BillingClient from './BillingClient'

export const metadata = { title: 'Billing — Mosaic' }

export default async function BillingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return (
      <div className="p-8 text-[#b0b0d0]">
        You are not associated with any organisation.
      </div>
    )
  }

  const orgId = profile.organization_id

  // Fetch org + subscription in parallel
  const [{ data: org }, { data: subscription }] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, billing_email, stripe_customer_id')
      .eq('id', orgId)
      .single(),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle(),
  ])

  // Fetch usage for current period
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: usageEvents } = await supabase
    .from('usage_events')
    .select('event_type, count')
    .eq('org_id', orgId)
    .gte('recorded_at', periodStart)

  const usageTotals: Record<string, number> = {
    submission: 0,
    ai_score: 0,
    store_added: 0,
    user_added: 0,
  }
  for (const e of usageEvents ?? []) {
    usageTotals[e.event_type] = (usageTotals[e.event_type] ?? 0) + (e.count ?? 1)
  }

  // Team member count
  const { count: memberCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  // Store count
  const { count: storeCount } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  return (
    <BillingClient
      orgName={org?.name ?? ''}
      billingEmail={org?.billing_email ?? user.email ?? ''}
      subscription={subscription ?? null}
      usage={{
        submissions: usageTotals.submission,
        aiScores: usageTotals.ai_score,
        stores: storeCount ?? 0,
        members: memberCount ?? 0,
      }}
      periodStart={periodStart}
    />
  )
}
