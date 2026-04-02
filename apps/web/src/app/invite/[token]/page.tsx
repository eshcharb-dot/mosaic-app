import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteAcceptClient from './InviteAcceptClient'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/invite/${token}`)
  }

  // Fetch invitation
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, org_id, email, role, status, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-[#030305] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#ff4d6d]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
          <p className="text-[#b0b0d0]">This invitation link is invalid or no longer exists.</p>
        </div>
      </div>
    )
  }

  if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-[#030305] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#ff4d6d]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏰</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {invitation.status === 'accepted' ? 'Already Accepted' : 'Invitation Expired'}
          </h1>
          <p className="text-[#b0b0d0]">
            {invitation.status === 'accepted'
              ? 'This invitation has already been accepted.'
              : 'This invitation link has expired. Ask your admin to send a new one.'}
          </p>
        </div>
      </div>
    )
  }

  // Fetch org name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', invitation.org_id)
    .single()

  return (
    <InviteAcceptClient
      token={token}
      orgName={org?.name ?? 'your organisation'}
      role={invitation.role}
      invitedEmail={invitation.email}
      userEmail={user.email ?? ''}
      expiresAt={invitation.expires_at}
    />
  )
}
