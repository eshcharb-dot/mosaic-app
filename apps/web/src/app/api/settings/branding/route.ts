import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateHexColor, validateUrl, sanitizeText, validationError } from '@/lib/validate'
import { logAudit } from '@/lib/audit'

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

  // 4. Validate and build update payload
  const fieldErrors: Record<string, string> = {}
  const updates: Record<string, string | null> = {}

  if ('primaryColor' in body) {
    if (!validateHexColor(String(body.primaryColor ?? ''))) {
      fieldErrors.primaryColor = 'Must be a valid hex color (e.g. #7c6df5)'
    } else {
      updates.brand_primary_color = body.primaryColor as string
    }
  }

  if ('secondaryColor' in body) {
    if (!validateHexColor(String(body.secondaryColor ?? ''))) {
      fieldErrors.secondaryColor = 'Must be a valid hex color (e.g. #00d4d4)'
    } else {
      updates.brand_secondary_color = body.secondaryColor as string
    }
  }

  if ('portalName' in body) {
    const raw = String(body.portalName ?? '').trim()
    if (raw.length === 0 || raw.length > 60) {
      fieldErrors.portalName = 'Must be a non-empty string (max 60 chars)'
    } else {
      updates.brand_portal_name = sanitizeText(raw, 60)
    }
  }

  if ('logoUrl' in body) {
    if (body.logoUrl === null || body.logoUrl === '') {
      updates.brand_logo_url = null
    } else if (!validateUrl(String(body.logoUrl))) {
      fieldErrors.logoUrl = 'Must be a valid https:// URL'
    } else {
      updates.brand_logo_url = String(body.logoUrl)
    }
  }

  if ('faviconUrl' in body) {
    if (body.faviconUrl === null || body.faviconUrl === '') {
      updates.brand_favicon_url = null
    } else if (!validateUrl(String(body.faviconUrl))) {
      fieldErrors.faviconUrl = 'Must be a valid https:// URL'
    } else {
      updates.brand_favicon_url = String(body.faviconUrl)
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(validationError(fieldErrors), { status: 422 })
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

  logAudit({
    orgId: profile.organization_id,
    userId: user.id,
    action: 'org.branding_updated',
    resourceType: 'organization',
    resourceId: profile.organization_id,
    metadata: { fields: Object.keys(updates) },
    request,
  })

  return NextResponse.json({ success: true, org })
}
