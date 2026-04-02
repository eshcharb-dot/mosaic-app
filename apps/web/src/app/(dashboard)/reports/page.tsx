import { createClient } from '@/lib/supabase/server'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let campaigns: any[] = []

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id) {
      const { data } = await supabase
        .from('campaigns')
        .select(`
          id,
          name,
          status,
          created_at,
          compliance_score,
          campaign_stores(count)
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })

      campaigns = data ?? []
    }
  }

  return <ReportsClient campaigns={campaigns} />
}
