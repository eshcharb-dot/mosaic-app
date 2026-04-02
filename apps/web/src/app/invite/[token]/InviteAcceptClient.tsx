'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Users, CheckCircle } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  enterprise_admin: 'Admin',
  analyst: 'Analyst',
  viewer: 'Viewer',
}

interface Props {
  token: string
  orgName: string
  role: string
  invitedEmail: string
  userEmail: string
  expiresAt: string
}

export default function InviteAcceptClient({ token, orgName, role, invitedEmail, userEmail, expiresAt }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  const daysLeft = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))

  async function handleAccept() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to accept invitation')
      setAccepted(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-[#030305] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#7c6df5]/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-[#7c6df5]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">You're in!</h1>
          <p className="text-[#b0b0d0]">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#030305] flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c6df5] to-[#00d4d4] flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-black text-white text-2xl tracking-tight">Mosaic</span>
        </div>

        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-[#7c6df5]/15 border border-[#7c6df5]/30 flex items-center justify-center mb-6">
            <Users size={24} className="text-[#7c6df5]" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">You've been invited</h1>
          <p className="text-[#b0b0d0] mb-6">
            Join <span className="text-white font-semibold">{orgName}</span> on Mosaic as{' '}
            <span className="text-[#7c6df5] font-semibold">{ROLE_LABELS[role] ?? role}</span>.
          </p>

          {userEmail !== invitedEmail && (
            <div className="mb-6 p-3 rounded-xl bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 text-sm text-[#ff4d6d]">
              Note: this invite was sent to <strong>{invitedEmail}</strong> but you're signed in as <strong>{userEmail}</strong>.
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-[#b0b0d0] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d4d4]" />
            Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 text-sm text-[#ff4d6d]">
              {error}
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7c6df5] to-[#6c5ce7] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : `Join ${orgName}`}
          </button>
        </div>
      </div>
    </div>
  )
}
