import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { token } = body

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  // Fetch invitation by token
  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .select('id, org_id, email, role, status, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (invError || !invitation) {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: 'Invitation already used or expired' }, { status: 410 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    // Mark expired
    await supabase.from('invitations').update({ status: 'expired' }).eq('id', invitation.id)
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
  }

  // Map invitation role to profiles role
  const profileRole = invitation.role === 'enterprise_admin' ? 'enterprise_admin' : 'enterprise_member'

  // Update profile: set org and role
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ organization_id: invitation.org_id, role: profileRole })
    .eq('id', user.id)

  if (profileError) {
    console.error('[invite/accept] profile update error:', profileError)
    return NextResponse.json({ error: 'Failed to join organisation', detail: profileError.message }, { status: 500 })
  }

  // Mark invitation accepted
  const { error: acceptError } = await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)

  if (acceptError) {
    console.error('[invite/accept] invitation update error:', acceptError)
  }

  return NextResponse.json({ success: true, org_id: invitation.org_id })
}
