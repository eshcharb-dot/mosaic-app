'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Mosaic/dashboard] Error:', error)
    }
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#ff4d6d]/10 border border-[#ff4d6d]/25 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff4d6d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Error code */}
        {error.digest && (
          <div className="text-[#b0b0d0] text-xs font-mono mb-3 bg-[#0c0c18] border border-[#222240] rounded-lg px-3 py-1.5 inline-block">
            Error: {error.digest}
          </div>
        )}

        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-[#b0b0d0] text-sm leading-relaxed mb-8">
          This section couldn&apos;t load. Try again or return to the dashboard.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-[#7c6df5] hover:bg-[#6b5ce0] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="text-[#b0b0d0] hover:text-white font-semibold px-5 py-2.5 rounded-xl border border-[#222240] hover:border-[#7c6df5]/50 transition-colors text-sm"
          >
            ← Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
