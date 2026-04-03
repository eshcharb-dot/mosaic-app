'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { I18nProvider, useI18n } from '@/components/I18nProvider'

function LoginForm() {
  const { t } = useI18n()
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-5xl font-black tracking-tighter bg-gradient-to-r from-[#7c6df5] to-[#00d4d4] bg-clip-text text-transparent mb-2">
            Mosaic
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Physical World Intelligence</p>
        </div>
        <form onSubmit={handleLogin} className="rounded-2xl p-8 space-y-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{t('auth.signIn')}</h1>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>
          )}
          <div className="space-y-1">
            <label className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('auth.email')}</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="input"
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('auth.password')}</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="input"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ background: 'linear-gradient(to right, var(--brand-primary), var(--brand-secondary))' }}
          >
            {loading ? t('common.loading') : t('auth.signIn')}
          </button>
          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('auth.noAccount')}{' '}
            <a href="/signup" style={{ color: 'var(--brand-primary)' }} className="hover:underline">{t('auth.signUp')}</a>
          </p>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <I18nProvider>
      <LoginForm />
    </I18nProvider>
  )
}
