import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateUrl, sanitizeText, validationError } from '@/lib/validate'
import { logAudit } from '@/lib/audit'

// GET /api/webhooks — list org's webhooks
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  }

  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('id, url, secret, events, is_active, created_at, last_triggered_at, last_status_code, failure_count')
    .eq('org_id', profile.organization_id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ webhooks })
}

// POST /api/webhooks — create webhook
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  }

  let body: { url?: string; name?: string; events?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate
  const errors: Record<string, string> = {}

  if (!body.url) {
    errors.url = 'url is required'
  } else if (!validateUrl(body.url)) {
    errors.url = 'url must be a valid https:// URL'
  }

  const name = body.name !== undefined ? sanitizeText(String(body.name), 100) : undefined

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(validationError(errors), { status: 422 })
  }

  const events = body.events ?? ['compliance.scored', 'compliance.failed', 'campaign.activated']

  const insertPayload: Record<string, unknown> = {
    org_id: profile.organization_id,
    url: body.url,
    events,
  }
  if (name !== undefined) insertPayload.name = name

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  logAudit({
    orgId: profile.organization_id,
    userId: user.id,
    action: 'webhook.created',
    resourceType: 'webhook',
    resourceId: webhook.id,
    metadata: { url: body.url, events },
    request,
  })

  return NextResponse.json({ webhook }, { status: 201 })
}
