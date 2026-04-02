import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/webhooks/[id]/deliveries — last 20 deliveries
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  // Verify ownership
  const { data: webhook } = await supabase
    .from('webhooks')
    .select('id, org_id')
    .eq('id', id)
    .single()

  if (!webhook || webhook.org_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: deliveries, error } = await supabase
    .from('webhook_deliveries')
    .select('id, event_type, payload, status_code, response_body, delivered_at, success')
    .eq('webhook_id', id)
    .order('delivered_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deliveries })
}
