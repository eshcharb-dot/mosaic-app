'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030305]">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-5xl font-black tracking-tighter bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] bg-clip-text text-transparent mb-2">
            Mosaic
          </div>
          <p className="text-[#b0b0d0] text-sm">Physical World Intelligence</p>
        </div>
        <form onSubmit={handleLogin} className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-8 space-y-5">
          <h1 className="text-xl font-bold text-white">Sign in to your account</h1>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>
          )}
          <div className="space-y-1">
            <label className="text-sm text-[#b0b0d0]">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#7c6df5] transition-colors"
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-[#b0b0d0]">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-[#030305] border border-[#222240] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#7c6df5] transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-[#b0b0d0] text-sm">
            No account?{' '}
            <a href="/signup" className="text-[#7c6df5] hover:underline">Request access</a>
          </p>
        </form>
      </div>
    </div>
  )
}
