import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()
  return profile?.organization_id ?? null
}

async function verifyWebhookOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  webhookId: string,
  orgId: string
) {
  const { data } = await supabase
    .from('webhooks')
    .select('id, org_id')
    .eq('id', webhookId)
    .single()
  return data?.org_id === orgId ? data : null
}

// PATCH /api/webhooks/[id] — toggle active, update events, regenerate secret
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const owned = await verifyWebhookOwnership(supabase, id, orgId)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: { is_active?: boolean; events?: string[]; regenerate_secret?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Build update object
  const updates: Record<string, unknown> = {}
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
  if (Array.isArray(body.events)) updates.events = body.events

  // Regenerate secret via DB function (raw hex from gen_random_bytes)
  if (body.regenerate_secret) {
    const { data: secretRow } = await supabase
      .rpc('generate_webhook_secret') as { data: string | null }
    // Fallback: we'll do it via a direct update with a DB expression
    // Since rpc may not exist, use a workaround: re-insert secret via SQL
    updates.secret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ webhook })
}

// DELETE /api/webhooks/[id]
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const owned = await verifyWebhookOwnership(supabase, id, orgId)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('webhooks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
