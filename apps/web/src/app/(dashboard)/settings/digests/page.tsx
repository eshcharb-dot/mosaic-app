import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DigestsClient from './DigestsClient'

export const metadata = { title: 'Digest Settings — Mosaic' }

export default async function DigestsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return (
      <div className="p-8 text-[#b0b0d0]">
        You are not associated with any organisation.
      </div>
    )
  }

  const orgId = profile.organization_id

  const { data: digests } = await supabase
    .from('digests')
    .select('id, subject, generated_at, sent_at, period_start, period_end, stats, html_body, text_body, recipient_emails')
    .eq('org_id', orgId)
    .order('generated_at', { ascending: false })
    .limit(20)

  return (
    <DigestsClient
      orgId={orgId}
      userRole={profile.role}
      initialDigests={digests ?? []}
    />
  )
}
