'use client'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Megaphone, Image, Bell, LogOut, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone, badge: null },
  { href: '/gallery', label: 'Gallery', icon: Image, badge: null },
  { href: '/alerts', label: 'Alerts', icon: Bell, badge: 3 },
]

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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c6df5] to-[#00d4d4] flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-black text-white text-xl tracking-tight">Mosaic</span>
        </div>
        <div className="mt-1 text-xs text-[#b0b0d0]">Enterprise Portal</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <a key={href} href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#7c6df5]/15 text-white border border-[#7c6df5]/30'
                  : 'text-[#b0b0d0] hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {badge != null && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff4d6d] px-1.5 text-[10px] font-bold text-white leading-none">
                  {badge}
                </span>
              )}
            </a>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-[#222240]">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c6df5] to-[#00d4d4] flex items-center justify-center text-xs font-bold text-white">
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
