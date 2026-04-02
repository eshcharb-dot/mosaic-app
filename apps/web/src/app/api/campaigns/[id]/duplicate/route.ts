import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id: campaignId } = await context.params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
  }

  // Fetch source campaign
  const { data: source, error: sourceError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (sourceError || !source) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (source.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Create duplicate campaign
  const { id: _id, created_at: _created_at, ...rest } = source
  const { data: newCampaign, error: insertError } = await supabase
    .from('campaigns')
    .insert({
      ...rest,
      name: `${source.name} (Copy)`,
      status: 'draft',
      created_by: user.id,
      compliance_score: null,
    })
    .select()
    .single()

  if (insertError || !newCampaign) {
    return NextResponse.json({ error: insertError?.message ?? 'Failed to duplicate' }, { status: 500 })
  }

  // Copy campaign_stores with status reset to 'pending'
  const { data: sourceStores } = await supabase
    .from('campaign_stores')
    .select('store_id')
    .eq('campaign_id', campaignId)

  if (sourceStores && sourceStores.length > 0) {
    const storeRows = sourceStores.map(({ store_id }) => ({
      campaign_id: newCampaign.id,
      store_id,
      status: 'pending',
      compliance_score: null,
      last_submission_at: null,
    }))

    await supabase.from('campaign_stores').insert(storeRows)
  }

  return NextResponse.json({ id: newCampaign.id }, { status: 201 })
}
