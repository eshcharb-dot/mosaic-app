import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import CommandPaletteProvider from '@/components/CommandPaletteProvider'
import BrandProvider from '@/components/BrandProvider'
import { I18nProvider } from '@/components/I18nProvider'
import { DEFAULT_BRAND, type BrandConfig } from '@/lib/branding'
import OnboardingWizard from '@/components/OnboardingWizard'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch org branding
  let brand: BrandConfig = DEFAULT_BRAND

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed,organization_id')
    .eq('id', user.id)
    .single()

  const showOnboarding = !profile?.onboarding_completed
  let orgName = ''

  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name, brand_primary_color, brand_secondary_color, brand_logo_url, brand_portal_name, brand_favicon_url')
      .eq('id', profile.organization_id)
      .single()

    if (org) {
      if (showOnboarding) {
        orgName = org.name ?? ''
      }
      brand = {
        primaryColor: org.brand_primary_color ?? DEFAULT_BRAND.primaryColor,
        secondaryColor: org.brand_secondary_color ?? DEFAULT_BRAND.secondaryColor,
        logoUrl: org.brand_logo_url ?? null,
        portalName: org.brand_portal_name ?? DEFAULT_BRAND.portalName,
        faviconUrl: org.brand_favicon_url ?? null,
      }
    }
  }

  return (
    <I18nProvider>
      <CommandPaletteProvider>
        <BrandProvider brand={brand}>
          <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <Sidebar user={user} />
            <main id="main-content" className="flex-1 overflow-auto">{children}</main>
          </div>
          {showOnboarding && profile?.organization_id && (
            <OnboardingWizard userId={user.id} orgId={profile.organization_id} orgName={orgName} />
          )}
        </BrandProvider>
      </CommandPaletteProvider>
    </I18nProvider>
  )
}
