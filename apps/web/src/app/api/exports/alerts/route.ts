import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
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
    return NextResponse.json({ error: 'Profile or organization not found' }, { status: 403 })
  }

  const { data: alerts, error: alertsError } = await supabase
    .from('alerts')
    .select(`
      id,
      alert_type,
      severity,
      triggered_at,
      resolved_at,
      payload,
      campaigns ( name, organization_id ),
      stores ( name )
    `)
    .order('triggered_at', { ascending: false })

  if (alertsError) {
    return NextResponse.json({ error: 'Failed to fetch alerts', detail: alertsError.message }, { status: 500 })
  }

  // Filter to org's alerts
  const orgAlerts = (alerts ?? []).filter(
    a => (a.campaigns as any)?.organization_id === profile.organization_id
  )

  const escape = (val: unknown) => {
    const s = String(val ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const header = 'alert_type,severity,campaign_name,store_name,triggered_at,resolved_at,resolution_time_hours,payload_summary'

  const rows = orgAlerts.map(alert => {
    const triggeredAt = alert.triggered_at ? new Date(alert.triggered_at) : null
    const resolvedAt = alert.resolved_at ? new Date(alert.resolved_at) : null

    let resolutionHours = ''
    if (triggeredAt && resolvedAt) {
      const diffMs = resolvedAt.getTime() - triggeredAt.getTime()
      resolutionHours = (diffMs / 1000 / 60 / 60).toFixed(1)
    }

    const payload = alert.payload
    let payloadSummary = ''
    if (payload && typeof payload === 'object') {
      const keys = Object.keys(payload as object).slice(0, 3)
      payloadSummary = keys.map(k => `${k}=${(payload as any)[k]}`).join('; ')
    }

    return [
      escape(alert.alert_type ?? ''),
      escape(alert.severity ?? ''),
      escape((alert.campaigns as any)?.name ?? ''),
      escape((alert.stores as any)?.name ?? ''),
      escape(alert.triggered_at ?? ''),
      escape(alert.resolved_at ?? ''),
      escape(resolutionHours),
      escape(payloadSummary),
    ].join(',')
  })

  const csv = [header, ...rows].join('\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="alerts-export.csv"',
    },
  })
}
