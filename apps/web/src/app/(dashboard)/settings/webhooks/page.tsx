import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WebhooksClient from './WebhooksClient'

export const metadata = { title: 'Webhooks — Mosaic' }

export default async function WebhooksPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return (
      <div className="p-8 text-[#b0b0d0]">
        You are not associated with any organisation.
      </div>
    )
  }

  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('id, url, secret, events, is_active, created_at, last_triggered_at, last_status_code, failure_count')
    .eq('org_id', profile.organization_id)
    .order('created_at', { ascending: false })

  return (
    <WebhooksClient
      initialWebhooks={webhooks ?? []}
      orgId={profile.organization_id}
    />
  )
}
