import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackUsage } from '@/lib/usage'

interface StoreInput {
  name: string
  address: string
  city: string
  postcode?: string
  retailer?: string
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: campaignId } = await context.params

  const supabase = await createClient()

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  let stores: StoreInput[]
  try {
    const body = await request.json()
    if (!Array.isArray(body?.stores) || body.stores.length === 0) {
      return NextResponse.json(
        { error: 'Body must contain a non-empty "stores" array' },
        { status: 400 }
      )
    }
    stores = body.stores
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // 3. Validate required fields on each store entry
  for (const [i, s] of stores.entries()) {
    if (!s.name || !s.address || !s.city) {
      return NextResponse.json(
        { error: `Store at index ${i} is missing required fields: name, address, city` },
        { status: 400 }
      )
    }
  }

  // 4. Fetch caller's organization
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return NextResponse.json({ error: 'Profile or organization not found' }, { status: 403 })
  }

  const organizationId = profile.organization_id

  // 5. Verify the campaign belongs to the caller's org
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, organization_id')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (campaign.organization_id !== organizationId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 6. Insert stores
  const storeRows = stores.map((s) => ({
    organization_id: organizationId,
    name: s.name,
    address: s.address,
    city: s.city,
    postcode: s.postcode ?? null,
    retailer: s.retailer ?? null,
    country: 'GB',
  }))

  const { data: insertedStores, error: storesError } = await supabase
    .from('stores')
    .insert(storeRows)
    .select('id')

  if (storesError || !insertedStores) {
    console.error('[stores/import] insert stores error:', storesError)
    return NextResponse.json(
      { error: 'Failed to insert stores', detail: storesError?.message },
      { status: 500 }
    )
  }

  // 7. Create campaign_stores entries
  const campaignStoreRows = insertedStores.map((s) => ({
    campaign_id: campaignId,
    store_id: s.id,
    status: 'pending',
  }))

  const { error: csError } = await supabase
    .from('campaign_stores')
    .insert(campaignStoreRows)

  if (csError) {
    console.error('[stores/import] insert campaign_stores error:', csError)
    // Stores were inserted — surface the partial success so the caller can investigate
    return NextResponse.json(
      {
        error: 'Stores inserted but campaign_stores linking failed',
        detail: csError.message,
        inserted_stores: insertedStores.length,
      },
      { status: 500 }
    )
  }

  trackUsage(organizationId, 'store_added', insertedStores.length)

  return NextResponse.json({ inserted: insertedStores.length })
}
