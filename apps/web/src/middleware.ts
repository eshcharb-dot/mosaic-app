import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function middleware(request: NextRequest) {
  // Handle public API v1 routes with API key auth
  if (request.nextUrl.pathname.startsWith('/api/v1')) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const rawKey = authHeader.slice(7).trim()
    if (!rawKey.startsWith('mk_live_')) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const keyHash = await sha256Hex(rawKey)

    // Use service role client to bypass RLS for key lookup
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: apiKey } = await supabase
      .from('api_keys')
      .select('id, org_id, scopes')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single()

    if (!apiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Fire-and-forget last_used_at update
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id)
      .then(() => {})

    // Forward org context to route handlers via request headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-api-org-id', apiKey.org_id)
    requestHeaders.set('x-api-scopes', (apiKey.scopes as string[]).join(','))

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Public pages — no auth required
  if (request.nextUrl.pathname.startsWith('/api-docs')) {
    return NextResponse.next()
  }

  // All other routes: standard Supabase session handling
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
