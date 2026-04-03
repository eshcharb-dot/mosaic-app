import { createClient as createSupabaseClient } from '@supabase/supabase-js'

interface AuditParams {
  orgId?: string
  userId?: string
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  request?: Request
}

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export function logAudit(params: AuditParams): void {
  const { orgId, userId, action, resourceType, resourceId, metadata, request } = params

  const ipAddress =
    request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request?.headers.get('x-real-ip') ??
    null

  const userAgent = request?.headers.get('user-agent') ?? null

  // Fire-and-forget — never await in hot path
  getServiceClient()
    .from('audit_logs')
    .insert({
      org_id: orgId ?? null,
      user_id: userId ?? null,
      action,
      resource_type: resourceType ?? null,
      resource_id: resourceId ?? null,
      metadata: metadata ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .then(({ error }) => {
      if (error) console.error('[audit] insert failed:', error.message)
    })
}
