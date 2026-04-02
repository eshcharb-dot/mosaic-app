import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { collectorIds, action } = body as { collectorIds: string[]; action: 'add' | 'remove' }

  if (!collectorIds?.length) return NextResponse.json({ ok: true })

  if (action === 'add') {
    const rows = collectorIds.map(collector_id => ({ territory_id: params.id, collector_id }))
    const { error } = await supabase
      .from('territory_collectors')
      .upsert(rows, { onConflict: 'territory_id,collector_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('territory_collectors')
      .delete()
      .eq('territory_id', params.id)
      .in('collector_id', collectorIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
