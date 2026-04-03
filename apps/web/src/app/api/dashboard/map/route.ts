import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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
    return NextResponse.json({ error: 'Organization not found' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const campaign_id = searchParams.get('campaign_id') || null
  const status = searchParams.get('status') || 'all'
  const min_score = parseInt(searchParams.get('min_score') || '0', 10)
  const max_score = parseInt(searchParams.get('max_score') || '100', 10)

  const { data, error } = await supabase.rpc('get_filtered_store_map', {
    p_org_id: profile.organization_id,
    p_campaign_id: campaign_id,
    p_min_score: min_score,
    p_max_score: max_score,
    p_status: status,
  })

  if (error) {
    console.error('[dashboard/map] get_filtered_store_map error:', error)
    return NextResponse.json({ error: 'Failed to fetch map data', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ stores: data ?? [] })
}
