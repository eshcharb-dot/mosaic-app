import { createClient } from '@/lib/supabase/server'
import AdminOverviewClient from './AdminOverviewClient'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: stats } = await supabase.rpc('get_admin_stats')

  return <AdminOverviewClient stats={stats ?? {}} />
}
