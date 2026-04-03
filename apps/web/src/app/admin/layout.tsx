import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from './AdminNav'

const ADMIN_EMAILS = ['admin@mosaic.com', 'eshcharbot@gmail.com']

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check role or hardcoded email list
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single()

  const isMosaicAdmin =
    profile?.role === 'mosaic_admin' ||
    ADMIN_EMAILS.includes(user.email ?? '')

  if (!isMosaicAdmin) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#030305] text-white">
      <AdminNav />
      <main className="max-w-[1400px] mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
