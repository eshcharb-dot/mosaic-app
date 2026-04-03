'use client'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Megaphone, Image, Bell, LogOut, Zap, Settings, LayoutTemplate, BarChart2, Users, Store, Webhook, Palette, Mail, TrendingUp, KeyRound, CreditCard, FolderDown, Sun, Moon, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import { useI18n } from '@/components/I18nProvider'
import type { Locale } from '@/lib/i18n'

function TerritoryIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
      <path d="M4 20 Q8 17 12 18.5 Q16 20 20 17" strokeOpacity="0.5" strokeDasharray="2 2" />
    </svg>
  )
}



// Active nav item styles using CSS custom properties for brand theming
const activeNavStyle: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
  border: '1px solid color-mix(in srgb, var(--brand-primary) 30%, transparent)',
  color: '#ffffff',
}

const activeSubStyle: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
  color: 'color-mix(in srgb, var(--brand-primary) 80%, #ffffff)',
}

const localeOptions: { locale: Locale; flag: string; label: string }[] = [
  { locale: 'en', flag: '🇬🇧', label: 'EN' },
  { locale: 'de', flag: '🇩🇪', label: 'DE' },
  { locale: 'fr', flag: '🇫🇷', label: 'FR' },
]

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, toggleTheme } = useTheme()
  const { t, locale, setLocale } = useI18n()

  const nav = [
    { href: '/dashboard',   label: t('nav.dashboard'),   icon: LayoutDashboard, badge: null },
    { href: '/analytics',   label: t('nav.analytics'),   icon: BarChart2,       badge: null },
    { href: '/stores',      label: t('nav.stores'),      icon: Store,           badge: null },
    { href: '/territories', label: t('nav.territories'), icon: TerritoryIcon,   badge: null },
    { href: '/campaigns',   label: t('nav.campaigns'),   icon: Megaphone,       badge: null },
    { href: '/gallery',     label: t('nav.gallery'),     icon: Image,           badge: null },
    { href: '/alerts',      label: t('nav.alerts'),      icon: Bell,            badge: 3 },
    { href: '/reports',     label: t('nav.reports'),     icon: BarChart2,       badge: null },
    { href: '/exports',     label: t('nav.exports'),     icon: FolderDown,      badge: null },
    { href: '/collectors',  label: t('nav.collectors'),  icon: Users,           badge: null },
    { href: '/performance', label: t('nav.performance') ?? 'Performance', icon: Activity, badge: null },
  ]

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col" style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
            title="Mosaic"
            aria-hidden="true"
          >
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-black text-white text-xl tracking-tight">Mosaic</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Enterprise Portal</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-muted)' }}
            >
              {resolvedTheme === 'dark' ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
            </button>
            <kbd
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors select-none"
              aria-label="Open command palette (Cmd K)"
              style={{
                background: 'var(--border)',
                border: '1px solid color-mix(in srgb, var(--border) 150%, transparent)',
                color: 'var(--text-muted)',
              }}
            >
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href
            || (href === '/campaigns' && (pathname === '/campaigns' || (pathname.startsWith('/campaigns/') && !pathname.startsWith('/campaigns/templates'))))
            || (href === '/stores' && (pathname === '/stores' || pathname.startsWith('/stores/')))
            || (href !== '/campaigns' && href !== '/stores' && pathname.startsWith(href + '/'))
          return (
            <div key={href}>
              <a
                href={href}
                aria-current={active ? 'page' : undefined}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={active ? activeNavStyle : undefined}
              >
                <span aria-hidden="true" style={active ? { color: '#ffffff' } : { color: 'var(--text-muted)' }}>
                  <Icon size={18} />
                </span>
                <span className="flex-1" style={active ? { color: '#ffffff' } : { color: 'var(--text-muted)' }}>{label}</span>
                {badge != null && (
                  <span
                    className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff4d6d] px-1.5 text-[10px] font-bold text-white leading-none"
                    aria-label={`${badge} unread`}
                  >
                    {badge}
                  </span>
                )}
              </a>
              {/* Templates sub-item under Campaigns */}
              {href === '/campaigns' && (
                <a
                  href="/campaigns/templates"
                  aria-current={pathname === '/campaigns/templates' || pathname.startsWith('/campaigns/templates/') ? 'page' : undefined}
                  className="flex items-center gap-2.5 pl-10 pr-4 py-2 rounded-xl text-xs font-medium transition-colors mt-0.5"
                  style={
                    pathname === '/campaigns/templates' || pathname.startsWith('/campaigns/templates/')
                      ? activeSubStyle
                      : undefined
                  }
                >
                  <LayoutTemplate size={13} aria-hidden="true" />
                  {t('nav.templates')}
                </a>
              )}
              {/* ROI Calculator sub-item under Analytics */}
              {href === '/analytics' && (
                <a
                  href="/roi"
                  aria-current={pathname === '/roi' ? 'page' : undefined}
                  className="flex items-center gap-2.5 pl-10 pr-4 py-2 rounded-xl text-xs font-medium transition-colors mt-0.5"
                  style={pathname === '/roi' ? activeSubStyle : undefined}
                >
                  <TrendingUp size={13} aria-hidden="true" />
                  {t('nav.roiCalculator')}
                </a>
              )}
            </div>
          )
        })}
      </nav>

      {/* Separator */}
      <hr role="separator" style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 16px' }} />

      {/* Settings */}
      <div className="px-4 pb-2">
        {/* Settings parent label */}
        <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          <Settings size={18} />
          <span className="flex-1">{t('nav.settings')}</span>
        </div>
        {/* Team sub-item */}
        <a
          href="/settings/team"
          className="flex items-center gap-2.5 pl-10 pr-4 py-2 rounded-xl text-xs font-medium transition-colors mt-0.5"
          style={
            pathname === '/settings/team' || pathname.startsWith('/settings/team/')
              ? activeSubStyle
              : undefined
          }
        >
          <Users size={13} />
          {t('nav.team')}
        </a>
        {/* Webhooks sub-item */}
        <a
          href="/settings/webhooks"
          className="flex items-center gap-2.5 pl-10 pr-4 py-2 rounded-xl text-xs font-medium transition-colors mt-0.5"
          style={
            pathname === '/settings/webhooks' || pathname.startsWith('/settings/webhooks/')
              ? activeSubStyle
              : undefined
          }
        >
          <Webhook size={13} />
          {t('nav.webhooks')}
        </a>
        {/* Branding sub-item */}
        <a
          href="/settings/branding"
          className="flex items-center gap-2.5 pl-10 pr-4 py-2 rounded-xl text-xs font-medium transition-colors mt-0.5"
          style={
            pathname === '/settings/branding' || pathname.startsWith('/settings/branding/')
              ? activeSubStyle
              : undefined
          }
        >
          <Palette size={13} />
          {t('nav.branding')}
        </a>
        {/* Digests sub-item */}
        <a
          href="/settings/digests"
          className="flex items-center gap-2.5 pl-10 pr-4 py-2 rounded-xl text-xs font-medium transition-colors mt-0.5"
          style={
            pathname === '/settings/digests' || pathname.startsWith('/settings/digests/')
              ? activeSubStyle
              : undefined
          }
        >
          <Mail size={13} />
          {t('nav.digests')}
        </a>
        {/* API Keys sub-item */}
        <a
          href="/settings/api"
          className="flex items-center gap-2.5 pl-10 pr-4 py-2 rounded-xl text-xs font-medium transition-colors mt-0.5"
          style={
            pathname === '/settings/api' || pathname.startsWith('/settings/api/')
              ? activeSubStyle
              : undefined
          }
        >
          <KeyRound size={13} />
          {t('nav.apiKeys')}
        </a>
        {/* Billing sub-item */}
        <a
          href="/settings/billing"
          className="flex items-center gap-2.5 pl-10 pr-4 py-2 rounded-xl text-xs font-medium transition-colors mt-0.5"
          style={
            pathname === '/settings/billing' || pathname.startsWith('/settings/billing/')
              ? activeSubStyle
              : undefined
          }
        >
          <CreditCard size={13} />
          {t('nav.billing')}
        </a>
      </div>

      {/* Separator */}
      <hr role="separator" style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />

      {/* User */}
      <div className="p-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
          >
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{user?.email}</div>
          </div>
        </div>
        {/* Language selector */}
        <div className="flex items-center gap-1 px-3 py-1.5 mb-1" role="group" aria-label="Language selector">
          {localeOptions.map(({ locale: l, flag, label }) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              title={label}
              aria-label={`Switch language to ${label}`}
              aria-pressed={locale === l}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
              style={
                locale === l
                  ? { background: 'color-mix(in srgb, var(--brand-primary) 20%, transparent)', color: '#a89cf7', border: '1px solid color-mix(in srgb, var(--brand-primary) 40%, transparent)' }
                  : { color: 'var(--text-muted)', border: '1px solid transparent' }
              }
            >
              <span>{flag}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="w-full flex items-center gap-3 px-4 py-2 text-sm rounded-xl hover:bg-white/5 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={16} aria-hidden="true" />
          {t('nav.signOut')}
        </button>
      </div>
    </aside>
  )
}
