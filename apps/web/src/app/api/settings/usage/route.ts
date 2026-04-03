import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
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
    return NextResponse.json({ error: 'Organization not found' }, { status: 403 })
  }

  const orgId = profile.organization_id

  // Get current period: first day of current month to now
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: events, error: eventsError } = await supabase
    .from('usage_events')
    .select('event_type, count')
    .eq('org_id', orgId)
    .gte('recorded_at', periodStart)

  if (eventsError) {
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }

  const totals: Record<string, number> = {
    submission: 0,
    ai_score: 0,
    store_added: 0,
    user_added: 0,
  }

  for (const e of events ?? []) {
    totals[e.event_type] = (totals[e.event_type] ?? 0) + (e.count ?? 1)
  }

  return NextResponse.json({ usage: totals, period_start: periodStart })
}
