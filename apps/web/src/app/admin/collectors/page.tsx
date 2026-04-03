import { createClient } from '@/lib/supabase/server'
import CollectorsClient from './CollectorsClient'

export default async function AdminCollectorsPage() {
  const supabase = await createClient()

  const { data: collectors } = await supabase
    .from('profiles_with_email')
    .select('id, full_name, email, collector_tier, tasks_completed, total_earnings_cents, created_at')
    .eq('role', 'collector')
    .order('created_at', { ascending: false })

  return <CollectorsClient collectors={collectors ?? []} />
}
