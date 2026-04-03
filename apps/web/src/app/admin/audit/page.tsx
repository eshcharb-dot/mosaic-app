import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import AuditLogClient from './AuditLogClient'

export const dynamic = 'force-dynamic'

export interface AuditLogRow {
  id: string
  org_id: string | null
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  // Joined
  user_email: string | null
  org_name: string | null
}

async function fetchAuditLogs(): Promise<AuditLogRow[]> {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      id,
      org_id,
      user_id,
      action,
      resource_type,
      resource_id,
      metadata,
      ip_address,
      user_agent,
      created_at,
      organizations!audit_logs_org_id_fkey(name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[admin/audit] fetch error:', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    org_id: row.org_id as string | null,
    user_id: row.user_id as string | null,
    action: row.action as string,
    resource_type: row.resource_type as string | null,
    resource_id: row.resource_id as string | null,
    metadata: row.metadata as Record<string, unknown> | null,
    ip_address: row.ip_address as string | null,
    user_agent: row.user_agent as string | null,
    created_at: row.created_at as string,
    user_email: null, // email lookup via auth.users requires a separate RPC; user_id is shown as fallback
    org_name: (row.organizations as { name?: string } | null)?.name ?? null,
  }))
}

export default async function AuditPage() {
  const logs = await fetchAuditLogs()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <p className="text-[#b0b0d0] text-sm mt-1">Last 100 security events across all organizations</p>
      </div>
      <AuditLogClient logs={logs} />
    </div>
  )
}
