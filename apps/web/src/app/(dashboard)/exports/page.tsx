import { createClient } from '@/lib/supabase/server'
import ExportsClient from './ExportsClient'

export default async function ExportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let campaigns: { id: string; name: string }[] = []
  let orgName = 'Your Organization'

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id) {
      const [{ data: campaignData }, { data: org }] = await Promise.all([
        supabase
          .from('campaigns')
          .select('id, name')
          .eq('organization_id', profile.organization_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('organizations')
          .select('name')
          .eq('id', profile.organization_id)
          .single(),
      ])

      campaigns = campaignData ?? []
      if (org?.name) orgName = org.name
    }
  }

  return <ExportsClient campaigns={campaigns} orgName={orgName} />
}
