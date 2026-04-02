import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ApiKeysClient from './ApiKeysClient'

export const metadata = { title: 'API Keys — Mosaic' }

export default async function ApiKeysPage() {
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

  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, last_used_at, created_at, is_active')
    .eq('org_id', profile.organization_id)
    .order('created_at', { ascending: false })

  return (
    <ApiKeysClient
      initialKeys={keys ?? []}
      orgId={profile.organization_id}
    />
  )
}
