import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Security headers — applied to every response
// ---------------------------------------------------------------------------
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter (Edge-compatible — no Node APIs)
// ---------------------------------------------------------------------------
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

function tooManyRequests(resetAt: number): NextResponse {
  const res = NextResponse.json(
    { error: 'Too many requests', retry_after: 60 },
    { status: 429 }
  )
  res.headers.set('Retry-After', '60')
  res.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)))
  applySecurityHeaders(res)
  return res
}

// ---------------------------------------------------------------------------
// SHA-256 helper (Web Crypto — Edge compatible)
// ---------------------------------------------------------------------------
async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export async function middleware(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    (request as unknown as { ip?: string }).ip ??
    'unknown'

  const path = request.nextUrl.pathname

  // ── Public API v1 — 100 req/min ─────────────────────────────────────────
  if (path.startsWith('/api/v1')) {
    const rl = checkRateLimit(`v1:${ip}`, 100, 60_000)

    if (!rl.allowed) return tooManyRequests(rl.resetAt)

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const res = NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      applySecurityHeaders(res)
      return res
    }

    const rawKey = authHeader.slice(7).trim()
    if (!rawKey.startsWith('mk_live_')) {
      const res = NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      applySecurityHeaders(res)
      return res
    }

    const keyHash = await sha256Hex(rawKey)

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
      const res = NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      applySecurityHeaders(res)
      return res
    }

    // Fire-and-forget last_used_at update
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id)
      .then(() => {})

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-api-org-id', apiKey.org_id)
    requestHeaders.set('x-api-scopes', (apiKey.scopes as string[]).join(','))

    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set('X-RateLimit-Limit', '100')
    res.headers.set('X-RateLimit-Remaining', String(rl.remaining))
    res.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)))
    applySecurityHeaders(res)
    return res
  }

  // ── Private API routes — 30 req/min ─────────────────────────────────────
  if (path.startsWith('/api/')) {
    const rl = checkRateLimit(`api:${ip}`, 30, 60_000)

    if (!rl.allowed) return tooManyRequests(rl.resetAt)

    const res = await updateSession(request)
    res.headers.set('X-RateLimit-Limit', '30')
    res.headers.set('X-RateLimit-Remaining', String(rl.remaining))
    res.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)))
    applySecurityHeaders(res)
    return res
  }

  // ── Public pages — no auth required ─────────────────────────────────────
  if (path.startsWith('/api-docs')) {
    const res = NextResponse.next()
    applySecurityHeaders(res)
    return res
  }

  // ── All other routes: standard Supabase session handling ─────────────────
  const res = await updateSession(request)
  applySecurityHeaders(res)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
