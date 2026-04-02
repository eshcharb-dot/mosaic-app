export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[#030305] flex flex-col items-center justify-center gap-4">
      <style>{`
        @keyframes spin-ring {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin-ring { animation: spin-ring 1.2s linear infinite; }
      `}</style>

      {/* Logo mark with spinning ring */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Spinning ring */}
        <svg
          className="spin-ring absolute inset-0 w-full h-full"
          viewBox="0 0 64 64"
          fill="none"
        >
          <circle
            cx="32" cy="32" r="28"
            stroke="#222240"
            strokeWidth="3"
          />
          <circle
            cx="32" cy="32" r="28"
            stroke="url(#ring-grad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="44 132"
          />
          <defs>
            <linearGradient id="ring-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7c6df5" />
              <stop offset="100%" stopColor="#00d4d4" />
            </linearGradient>
          </defs>
        </svg>

        {/* M mark */}
        <div
          className="relative z-10 w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
          style={{ background: 'linear-gradient(135deg, #7c6df5 0%, #00d4d4 100%)' }}
        >
          M
        </div>
      </div>

      <p className="text-[#b0b0d0] text-sm font-medium tracking-wide">Loading…</p>
    </div>
  )
}
