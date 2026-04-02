import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TemplatesClient from './TemplatesClient'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  const { data: templates } = await supabase
    .from('campaign_templates')
    .select('*')
    .eq('org_id', profile?.organization_id)
    .order('created_at', { ascending: false })

  return (
    <TemplatesClient
      templates={templates ?? []}
      isAdmin={profile?.role === 'admin'}
    />
  )
}
