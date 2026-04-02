import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function getCallerAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized', status: 401, user: null, profile: null }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return { error: 'Profile not found', status: 403, user: null, profile: null }
  if (profile.role !== 'enterprise_admin') return { error: 'Only admins can manage members', status: 403, user: null, profile: null }
  if (!profile.organization_id) return { error: 'No organisation associated', status: 403, user: null, profile: null }

  return { error: null, status: 200, user, profile }
}

// PATCH — update member role
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id: memberId } = await context.params
  const supabase = await createClient()

  const { error, status, user, profile } = await getCallerAdmin(supabase)
  if (error || !user || !profile) {
    return NextResponse.json({ error }, { status })
  }

  const body = await request.json()
  const { role } = body

  const validRoles = ['enterprise_admin', 'analyst', 'viewer']
  if (!role || !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Verify target member is in same org
  const { data: targetProfile, error: targetError } = await supabase
    .from('profiles')
    .select('id, organization_id, role')
    .eq('id', memberId)
    .single()

  if (targetError || !targetProfile) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  if (targetProfile.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Map viewer/analyst to enterprise_member for profiles table compatibility
  // enterprise_admin stays as-is; analyst/viewer map to enterprise_member with role stored in invitations
  // For simplicity, we store the role directly — profiles check allows enterprise_admin and enterprise_member
  // We'll allow enterprise_admin as a valid profiles role; map analyst/viewer to enterprise_member
  const profileRole = role === 'enterprise_admin' ? 'enterprise_admin' : 'enterprise_member'

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ role: profileRole })
    .eq('id', memberId)
    .select('id, role, full_name, created_at')
    .single()

  if (updateError) {
    console.error('[team/members PATCH] update error:', updateError)
    return NextResponse.json({ error: 'Failed to update role', detail: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ member: updated })
}

// DELETE — remove member from org (set org_id to null)
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id: memberId } = await context.params
  const supabase = await createClient()

  const { error, status, user, profile } = await getCallerAdmin(supabase)
  if (error || !user || !profile) {
    return NextResponse.json({ error }, { status })
  }

  // Prevent self-removal
  if (memberId === user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself from the team' }, { status: 400 })
  }

  // Verify target member is in same org
  const { data: targetProfile, error: targetError } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', memberId)
    .single()

  if (targetError || !targetProfile) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  if (targetProfile.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ organization_id: null })
    .eq('id', memberId)

  if (updateError) {
    console.error('[team/members DELETE] update error:', updateError)
    return NextResponse.json({ error: 'Failed to remove member', detail: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
