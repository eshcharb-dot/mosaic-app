import { NextResponse } from 'next/server'
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

export async function GET() {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      plan,
      is_active,
      created_at,
      profiles(count),
      stores(count),
      campaigns(count)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ organizations: data })
}
