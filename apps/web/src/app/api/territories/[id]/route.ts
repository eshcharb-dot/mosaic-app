import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getOrgId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()
  return data?.organization_id ?? null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const body = await req.json()
  const { name, color, description, center_lat, center_lng, radius_km } = body

  const { data, error } = await supabase
    .from('territories')
    .update({ name, color, description, center_lat, center_lng, radius_km })
    .eq('id', params.id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const { error } = await supabase
    .from('territories')
    .delete()
    .eq('id', params.id)
    .eq('org_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
