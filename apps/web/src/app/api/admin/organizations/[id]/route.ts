import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = ['admin@mosaic.com', 'eshcharbot@gmail.com']

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'mosaic_admin' || ADMIN_EMAILS.includes(user.email ?? '')) return user
  return null
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ organization: data })
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowedFields = ['is_active', 'plan', 'name']
  const updates: Record<string, unknown> = {}

  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ organization: data })
}
