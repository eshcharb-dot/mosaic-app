'use client'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Megaphone, Image, Bell, LogOut, Zap, Settings, LayoutTemplate, BarChart2, Users, Store, Webhook, Palette, Mail, TrendingUp, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function TerritoryIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
      <path d="M4 20 Q8 17 12 18.5 Q16 20 20 17" strokeOpacity="0.5" strokeDasharray="2 2" />
    </svg>
  )
}

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { href: '/analytics', label: 'Analytics', icon: BarChart2, badge: null },
  { href: '/stores', label: 'Stores', icon: Store, badge: null },
  { href: '/territories', label: 'Territories', icon: TerritoryIcon, badge: null },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone, badge: null },
  { href: '/gallery', label: 'Gallery', icon: Image, badge: null },
  { href: '/alerts', label: 'Alerts', icon: Bell, badge: 3 },
  { href: '/reports', label: 'Reports', icon: BarChart2, badge: null },
  { href: '/collectors', label: 'Collectors', icon: Users, badge: null },
]

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

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0c0c18] border-r border-[#222240] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#222240]">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
          >
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-black text-white text-xl tracking-tight">Mosaic</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-[#b0b0d0]">Enterprise Portal</span>
          <kbd
            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[#222240] border border-[#333360] rounded text-[10px] text-[#b0b0d0] font-mono cursor-pointer hover:text-white transition-colors select-none"
            style={{ ['--hover-border' as string]: 'color-mix(in srgb, var(--brand-primary) 50%, transparent)' }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href
            || (href === '/campaigns' && (pathname === '/campaigns' || (pathname.startsWith('/campaigns/') && !pathname.startsWith('/campaigns/templates'))))
            || (href === '/stores' && (pathname === '/stores' || pathname.startsWith('/stores/')))
            || (href !== '/campaigns' && href !== '/stores' && pathname.startsWith(href + '/'))
          return (
            <div key={href}>
              <a
                href={href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={active ? activeNavStyle : undefined}
              >
                <span className={active ? 'text-white' : 'text-[#b0b0d0] hover:text-white'}>
                  <Icon size={18} />
                </span>
                <span className={`flex-1 ${active ? 'text-white' : 'text-[#b0b0d0]'}`}>{label}</span>
                {badge != null && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff4d6d] px-1.5 text-[10px] font-bold text-white leading-none">
                    {badge}
                  </span>
                )}
              </a>
              {/* Templates sub-item under Campaigns */}
              {href === '/campaigns' && (
                <a
                  href="/campaigns/templates"
                  className="flex items-center gap-2.5 pl-10 pr-4 py-2 rounded-xl text-xs font-medium transition-colors mt-0.5"
                  style={
                    pathname === '/campaigns/templates' || pathname.startsWith('/campaigns/templates/')
                      ? activeSubStyle
                      : undefined
                  }
                >
                  <LayoutTemplate size={13} />
                  Templates
                </a>
              )}
              {/* ROI Calculator sub-item under Analytics */}
              {href === '/analytics' && (
                <a
                  href="/roi"
                  className="flex items-center gap-2.5 pl-10 pr-4 py-2 rounded-xl text-xs font-medium transition-colors mt-0.5"
                  style={pathname === '/roi' ? activeSubStyle : undefined}
                >
                  <TrendingUp size={13} />
                  ROI Calculator
                </a>
              )}
            </div>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="px-4 pb-2">
        {/* Settings parent label */}
        <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#b0b0d0]">
          <Settings size={18} />
          <span className="flex-1">Settings</span>
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
          Team
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
          Webhooks
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
          Branding
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
          Digests
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
          API Keys
        </a>
      </div>

      {/* User */}
      <div className="p-4 border-t border-[#222240]">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
          >
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.email}</div>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2 text-[#b0b0d0] hover:text-white text-sm rounded-xl hover:bg-white/5 transition-colors">
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
