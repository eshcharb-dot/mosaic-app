'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Building2, Users, Activity, ArrowLeft, ClipboardList } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: Activity, exact: true },
  { href: '/admin/organizations', label: 'Organizations', icon: Building2, exact: false },
  { href: '/admin/collectors', label: 'Collectors', icon: Users, exact: false },
  { href: '/admin/audit', label: 'Audit Log', icon: ClipboardList, exact: false },
]

export default function AdminNav() {
  const pathname = usePathname()

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <nav className="border-b border-[#222240] bg-[#0c0c18] sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <Shield size={18} className="text-[#7c6df5]" />
          <span className="text-sm font-black text-white tracking-tight uppercase">Mosaic Admin</span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(href, exact)
                  ? 'bg-[#7c6df5]/20 text-[#7c6df5]'
                  : 'text-[#b0b0d0] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </div>

        {/* Back to app */}
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-[#b0b0d0] hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Back to App
        </Link>
      </div>
    </nav>
  )
}
