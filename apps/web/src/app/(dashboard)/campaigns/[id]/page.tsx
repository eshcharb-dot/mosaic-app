import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CampaignDetail from './CampaignDetail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !campaign) notFound()

  const { data: campaignStores } = await supabase
    .from('campaign_stores')
    .select('*, stores(*)')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true })

  return (
    <CampaignDetail
      campaign={campaign}
      campaignStores={campaignStores ?? []}
    />
  )
}
