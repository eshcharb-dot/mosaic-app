import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) return NextResponse.json([])

  const { data, error } = await supabase
    .from('territories')
    .select(`
      *,
      territory_stores(store_id),
      territory_collectors(collector_id)
    `)
    .eq('org_id', profile.organization_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const body = await req.json()
  const { name, color, description, center_lat, center_lng, radius_km } = body

  const { data, error } = await supabase
    .from('territories')
    .insert({
      org_id: profile.organization_id,
      name,
      color: color ?? '#7c6df5',
      description,
      center_lat,
      center_lng,
      radius_km: radius_km ?? 10,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
