import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 1. Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get org
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return NextResponse.json({ error: 'Profile or organization not found' }, { status: 403 })
  }

  // 3. Parse optional body
  let period_days = 7
  try {
    const body = await request.json().catch(() => ({}))
    if (body?.period_days) period_days = Number(body.period_days)
  } catch {
    // fine — use default
  }

  const orgId = profile.organization_id

  // 4. Invoke the edge function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const fnRes = await fetch(`${supabaseUrl}/functions/v1/generate-digest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ org_id: orgId, period_days }),
  })

  if (!fnRes.ok) {
    const errText = await fnRes.text()
    console.error('[digests/generate] edge fn error:', errText)
    return NextResponse.json({ error: 'Failed to generate digest', detail: errText }, { status: 502 })
  }

  const digestData = await fnRes.json()
  const { subject, htmlBody, textBody, stats, period_start, period_end } = digestData

  // 5. Save to digests table
  const { data: digest, error: insertError } = await supabase
    .from('digests')
    .insert({
      org_id: orgId,
      subject,
      html_body: htmlBody,
      text_body: textBody,
      period_start,
      period_end,
      stats,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[digests/generate] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to save digest', detail: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, digest })
}
