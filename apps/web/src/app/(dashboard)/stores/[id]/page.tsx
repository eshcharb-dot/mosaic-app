import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import StoreDetailClient from './StoreDetailClient'

interface RouteContext {
  params: Promise<{ id: string }>
}

export default async function StoreDetailPage({ params }: RouteContext) {
  const { id: storeId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Fetch store info
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, address, city, postcode, retailer')
    .eq('id', storeId)
    .single()

  if (!store) notFound()

  // Fetch audit history and health score in parallel
  const [historyRes, healthRes] = await Promise.all([
    supabase.rpc('get_store_audit_history', { p_store_id: storeId, p_limit: 20 }),
    supabase.rpc('get_store_health_score', { p_store_id: storeId }),
  ])

  const auditHistory = historyRes.data ?? []
  const health = healthRes.data?.[0] ?? null

  return (
    <StoreDetailClient
      store={store}
      auditHistory={auditHistory}
      health={health}
    />
  )
}
