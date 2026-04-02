import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { storeIds, action } = body as { storeIds: string[]; action: 'add' | 'remove' }

  if (!storeIds?.length) return NextResponse.json({ ok: true })

  if (action === 'add') {
    const rows = storeIds.map(store_id => ({ territory_id: params.id, store_id }))
    const { error } = await supabase
      .from('territory_stores')
      .upsert(rows, { onConflict: 'territory_id,store_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('territory_stores')
      .delete()
      .eq('territory_id', params.id)
      .in('store_id', storeIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
