import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, campaign_stores(count)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentSubmissions } = await supabase
    .from('submissions')
    .select('*, stores(name, city), compliance_results(score, is_compliant)')
    .order('submitted_at', { ascending: false })
    .limit(20)

  return <DashboardClient campaigns={campaigns ?? []} submissions={recentSubmissions ?? []} />
}
