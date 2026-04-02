import { createClient } from '@/lib/supabase/server'
import GalleryClient from './GalleryClient'

interface PageProps {
  searchParams: Promise<{ campaign?: string }>
}

export default async function GalleryPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: submissions, error } = await supabase
    .from('submissions')
    .select(`
      id,
      photo_urls,
      submitted_at,
      store_id,
      campaign_id,
      compliance_results (
        score,
        is_compliant,
        findings,
        summary
      ),
      stores (
        name
      ),
      campaigns (
        name
      )
    `)
    .order('submitted_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Gallery fetch error:', error)
  }

  // Flatten for client
  const rows = (submissions ?? []).map((s: any) => ({
    id: s.id,
    photo_url: s.photo_urls?.[0] ?? null,
    submitted_at: s.submitted_at,
    store_id: s.store_id,
    campaign_id: s.campaign_id,
    store_name: s.stores?.name ?? null,
    campaign_name: s.campaigns?.name ?? null,
    score: s.compliance_results?.[0]?.score ?? null,
    is_compliant: s.compliance_results?.[0]?.is_compliant ?? null,
    findings: s.compliance_results?.[0]?.findings ?? [],
    summary: s.compliance_results?.[0]?.summary ?? null,
  }))

  // Pre-select campaign if ?campaign= param is provided
  // Resolve campaign id -> campaign name for the filter dropdown
  let initialCampaignFilter = 'all'
  if (params.campaign) {
    const match = rows.find(r => r.campaign_id === params.campaign)
    if (match?.campaign_name) {
      initialCampaignFilter = match.campaign_name
    }
  }

  return (
    <GalleryClient
      submissions={rows}
      initialCampaignFilter={initialCampaignFilter}
    />
  )
}
