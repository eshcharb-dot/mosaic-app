import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ComparePageClient from './ComparePageClient'

interface PageProps {
  searchParams: Promise<{ a?: string; b?: string }>
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { a, b } = await searchParams
  const supabase = await createClient()

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!a || !b) notFound()

  // Fetch both submissions in parallel
  const [resA, resB] = await Promise.all([
    supabase
      .from('submissions')
      .select(`
        id,
        photo_urls,
        submitted_at,
        stores ( name, city ),
        campaigns ( name ),
        compliance_results ( score, is_compliant, findings, summary )
      `)
      .eq('id', a)
      .single(),
    supabase
      .from('submissions')
      .select(`
        id,
        photo_urls,
        submitted_at,
        stores ( name, city ),
        campaigns ( name ),
        compliance_results ( score, is_compliant, findings, summary )
      `)
      .eq('id', b)
      .single(),
  ])

  if (resA.error || !resA.data || resB.error || !resB.data) notFound()

  function flatten(s: any) {
    return {
      id: s.id,
      photo_url: s.photo_urls?.[0] ?? null,
      submitted_at: s.submitted_at,
      store_name: s.stores?.name ?? null,
      store_city: s.stores?.city ?? null,
      campaign_name: s.campaigns?.name ?? null,
      score: s.compliance_results?.[0]?.score ?? null,
      is_compliant: s.compliance_results?.[0]?.is_compliant ?? null,
      findings: s.compliance_results?.[0]?.findings ?? [],
      summary: s.compliance_results?.[0]?.summary ?? null,
    }
  }

  return (
    <ComparePageClient
      subA={flatten(resA.data)}
      subB={flatten(resB.data)}
    />
  )
}
