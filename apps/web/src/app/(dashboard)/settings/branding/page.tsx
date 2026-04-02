import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DEFAULT_BRAND, type BrandConfig } from '@/lib/branding'
import BrandingClient from './BrandingClient'

export const metadata = { title: 'Branding — Mosaic' }

export default async function BrandingSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return (
      <div className="p-8 text-[#b0b0d0]">
        You are not associated with any organisation.
      </div>
    )
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('brand_primary_color, brand_secondary_color, brand_logo_url, brand_portal_name, brand_favicon_url')
    .eq('id', profile.organization_id)
    .single()

  const brand: BrandConfig = {
    primaryColor: org?.brand_primary_color ?? DEFAULT_BRAND.primaryColor,
    secondaryColor: org?.brand_secondary_color ?? DEFAULT_BRAND.secondaryColor,
    logoUrl: org?.brand_logo_url ?? null,
    portalName: org?.brand_portal_name ?? DEFAULT_BRAND.portalName,
    faviconUrl: org?.brand_favicon_url ?? null,
  }

  const isAdmin = profile.role === 'enterprise_admin' || profile.role === 'superadmin'

  return <BrandingClient brand={brand} isAdmin={isAdmin} />
}
