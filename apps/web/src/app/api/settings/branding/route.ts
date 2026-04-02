import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  // 1. Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Fetch caller's org
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return NextResponse.json({ error: 'Profile or organization not found' }, { status: 403 })
  }

  if (profile.role !== 'enterprise_admin' && profile.role !== 'superadmin') {
    return NextResponse.json({ error: 'Only admins can update branding' }, { status: 403 })
  }

  // 3. Parse body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // 4. Build validated update payload
  const updates: Record<string, string | null> = {}

  if ('primaryColor' in body) {
    if (!isValidHex(body.primaryColor)) {
      return NextResponse.json({ error: 'primaryColor must be a valid hex color (e.g. #7c6df5)' }, { status: 400 })
    }
    updates.brand_primary_color = body.primaryColor as string
  }

  if ('secondaryColor' in body) {
    if (!isValidHex(body.secondaryColor)) {
      return NextResponse.json({ error: 'secondaryColor must be a valid hex color (e.g. #00d4d4)' }, { status: 400 })
    }
    updates.brand_secondary_color = body.secondaryColor as string
  }

  if ('portalName' in body) {
    const name = body.portalName
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 60) {
      return NextResponse.json({ error: 'portalName must be a non-empty string (max 60 chars)' }, { status: 400 })
    }
    updates.brand_portal_name = name.trim()
  }

  if ('logoUrl' in body) {
    updates.brand_logo_url = typeof body.logoUrl === 'string' ? body.logoUrl : null
  }

  if ('faviconUrl' in body) {
    updates.brand_favicon_url = typeof body.faviconUrl === 'string' ? body.faviconUrl : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  // 5. Apply update
  const { data: org, error: updateError } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', profile.organization_id)
    .select('id, brand_primary_color, brand_secondary_color, brand_logo_url, brand_portal_name, brand_favicon_url')
    .single()

  if (updateError) {
    console.error('[branding PATCH] update error:', updateError)
    return NextResponse.json({ error: 'Failed to update branding', detail: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, org })
}
