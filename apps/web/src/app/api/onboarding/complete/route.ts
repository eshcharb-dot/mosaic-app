import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateEmail, sanitizeText, validationError } from '@/lib/validate'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  const body = await request.json()
  const { orgName, industry, country, campaignName, brief, payoutAmount, inviteEmails } = body

  // 3. Validate
  const fieldErrors: Record<string, string> = {}

  const sanitizedOrgName = orgName ? sanitizeText(String(orgName), 100) : ''
  if (!sanitizedOrgName) fieldErrors.orgName = 'Organization name is required'

  const sanitizedCampaignName = campaignName ? sanitizeText(String(campaignName), 100) : ''
  if (!sanitizedCampaignName) fieldErrors.campaignName = 'Campaign name is required'

  const sanitizedBrief = brief ? sanitizeText(String(brief), 2000) : ''
  if (!sanitizedBrief) fieldErrors.brief = 'Brief is required'

  // Validate invite emails if provided
  const invalidEmails: string[] = []
  if (Array.isArray(inviteEmails)) {
    for (const e of inviteEmails) {
      if (typeof e === 'string' && e.trim() && !validateEmail(e)) {
        invalidEmails.push(e)
      }
    }
    if (invalidEmails.length > 0) {
      fieldErrors.inviteEmails = `Invalid email addresses: ${invalidEmails.join(', ')}`
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(validationError(fieldErrors), { status: 422 })
  }

  const slug = sanitizedOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // 4. Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: sanitizedOrgName,
      slug,
      industry: industry ?? 'other',
      plan: 'starter',
    })
    .select()
    .single()

  if (orgError) {
    console.error('[onboarding] org insert error:', orgError)
    const isDuplicate = orgError.code === '23505'
    return NextResponse.json(
      { error: isDuplicate ? 'An organization with that name already exists' : 'Failed to create organization', detail: orgError.message },
      { status: isDuplicate ? 409 : 500 }
    )
  }

  // 5. Update user profile with org_id and role
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ organization_id: org.id, role: 'enterprise_admin' })
    .eq('id', user.id)

  if (profileError) {
    console.error('[onboarding] profile update error:', profileError)
    return NextResponse.json(
      { error: 'Failed to link profile to organization', detail: profileError.message },
      { status: 500 }
    )
  }

  // 6. Create first campaign
  const payoutCents = Math.round((Number(payoutAmount) || 12) * 100)
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      organization_id: org.id,
      created_by: user.id,
      name: sanitizedCampaignName,
      brief: sanitizedBrief,
      price_per_task_cents: payoutCents,
      collector_payout_cents: Math.round(payoutCents * 0.48),
      product_name: sanitizedCampaignName,
      product_sku: '',
      status: 'draft',
    })
    .select()
    .single()

  if (campaignError) {
    console.error('[onboarding] campaign insert error:', campaignError)
    return NextResponse.json(
      { error: 'Failed to create campaign', detail: campaignError.message },
      { status: 500 }
    )
  }

  // 7. Log invite emails (MVP — no actual sending)
  if (Array.isArray(inviteEmails) && inviteEmails.length > 0) {
    console.log('[onboarding] invite emails queued for org', org.id, ':', inviteEmails)
  }

  return NextResponse.json({ orgId: org.id, campaignId: campaign.id })
}
