import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

function generateApiKey(): { key: string; hash: string; prefix: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const key = 'mk_live_' + Buffer.from(bytes).toString('hex')
  const hash = createHash('sha256').update(key).digest('hex')
  const prefix = key.substring(0, 16)
  return { key, hash, prefix }
}

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

  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, last_used_at, created_at, is_active, created_by')
    .eq('org_id', profile.organization_id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
  }

  return NextResponse.json({ keys: keys ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return NextResponse.json({ error: 'Profile or organization not found' }, { status: 403 })
  }

  let body: { name?: string; scopes?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name || name.length === 0 || name.length > 80) {
    return NextResponse.json({ error: 'name is required (max 80 chars)' }, { status: 400 })
  }

  const allowedScopes = ['read', 'write']
  const scopes: string[] = Array.isArray(body.scopes) && body.scopes.length > 0
    ? body.scopes.filter((s: string) => allowedScopes.includes(s))
    : ['read']

  if (scopes.length === 0) {
    return NextResponse.json({ error: 'Invalid scopes. Allowed: read, write' }, { status: 400 })
  }

  const { key, hash, prefix } = generateApiKey()

  const { data: newKey, error: insertError } = await supabase
    .from('api_keys')
    .insert({
      org_id: profile.organization_id,
      name,
      key_hash: hash,
      key_prefix: prefix,
      scopes,
      created_by: user.id,
    })
    .select('id, name, key_prefix, scopes, last_used_at, created_at, is_active')
    .single()

  if (insertError) {
    console.error('[api-keys POST] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }

  // Return full key only once — never stored
  return NextResponse.json({ key: newKey, full_key: key }, { status: 201 })
}
