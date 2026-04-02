import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamSettingsClient from './TeamSettingsClient'

export const metadata = { title: 'Team Settings — Mosaic' }

export default async function TeamSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get caller's profile + org
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, organization_id, full_name')
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

  // Fetch org details
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgId)
    .single()

  // Fetch all org members (profiles) + their auth email via join
  // profiles doesn't store email — we join auth.users via RPC or select email from auth
  // We use a raw select on profiles and then separately get emails via auth admin
  // For now, fetch profiles and use full_name; email comes from auth.users via service role
  // Since we only have anon key, we get what we can from profiles + user's own email
  const { data: members } = await supabase
    .from('profiles')
    .select('id, role, full_name, avatar_url, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })

  // Fetch pending invitations for this org
  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, email, role, token, status, created_at, expires_at')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <TeamSettingsClient
      currentUserId={user.id}
      currentUserEmail={user.email ?? ''}
      currentUserRole={profile.role}
      orgId={orgId}
      orgName={org?.name ?? ''}
      members={members ?? []}
      invitations={invitations ?? []}
    />
  )
}
