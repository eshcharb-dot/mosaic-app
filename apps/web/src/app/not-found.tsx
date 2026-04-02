import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-[#030305] flex items-center justify-center overflow-hidden">
      {/* Animated gradient blobs */}
      <style>{`
        @keyframes blob-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.08); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes blob-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, 30px) scale(1.05); }
          66% { transform: translate(30px, -40px) scale(0.98); }
        }
        @keyframes blob-float-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 50px) scale(1.06); }
        }
        .blob-1 { animation: blob-float-1 12s ease-in-out infinite; }
        .blob-2 { animation: blob-float-2 15s ease-in-out infinite; }
        .blob-3 { animation: blob-float-3 10s ease-in-out infinite; }
      `}</style>

      {/* Background blobs */}
      <div className="blob-1 absolute top-[-120px] left-[-80px] w-[480px] h-[480px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #7c6df5 0%, transparent 70%)' }} />
      <div className="blob-2 absolute bottom-[-100px] right-[-60px] w-[420px] h-[420px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #00d4d4 0%, transparent 70%)' }} />
      <div className="blob-3 absolute top-[40%] right-[20%] w-[280px] h-[280px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #ff6b9d 0%, transparent 70%)' }} />

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        {/* 404 */}
        <div
          className="text-[160px] font-black leading-none tracking-tighter select-none"
          style={{
            background: 'linear-gradient(135deg, #7c6df5 0%, #00d4d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          404
        </div>

        {/* Subtitle */}
        <h1 className="text-2xl font-bold text-white mt-2 mb-3">Page not found</h1>
        <p className="text-[#b0b0d0] text-base max-w-xs mx-auto leading-relaxed">
          This page doesn&apos;t exist or you don&apos;t have access.
        </p>

        {/* CTA */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 mt-10 bg-[#7c6df5] hover:bg-[#6b5ce0] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
        >
          <span>←</span>
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
