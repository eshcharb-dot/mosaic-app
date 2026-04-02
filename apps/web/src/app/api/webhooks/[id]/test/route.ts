import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/webhooks/[id]/test — send a test ping
export async function POST(_request: NextRequest, context: RouteContext) {
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

  // Invoke deliver-webhook edge function with a test payload
  const { data, error } = await supabase.functions.invoke('deliver-webhook', {
    body: {
      webhook_id: id,
      event_type: 'test',
      payload: { message: 'This is a test ping from Mosaic', timestamp: new Date().toISOString() },
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
