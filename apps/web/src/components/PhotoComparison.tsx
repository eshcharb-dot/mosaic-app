'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'

interface Props {
  beforeUrl: string
  afterUrl: string
  beforeLabel?: string
  afterLabel?: string
  beforeScore?: number | null
  afterScore?: number | null
}

function ScorePill({ score, label }: { score?: number | null; label: string }) {
  if (score == null) return null
  const color = score >= 80 ? '#00e096' : score >= 60 ? '#ffc947' : '#ff6b9d'
  return (
    <span
      className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm"
      style={{ background: `${color}25`, color, border: `1px solid ${color}50` }}
    >
      {label} · {Math.round(score)}
    </span>
  )
}

export default function PhotoComparison({
  beforeUrl,
  afterUrl,
  beforeLabel = 'BEFORE',
  afterLabel = 'AFTER',
  beforeScore,
  afterScore,
}: Props) {
  const [splitPct, setSplitPct] = useState(50)
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const updateSplit = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    setSplitPct(pct)
  }, [])

  // Mouse
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    updateSplit(e.clientX)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => updateSplit(e.clientX)
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, updateSplit])

  // Touch
  const onTouchStart = (e: React.TouchEvent) => {
    updateSplit(e.touches[0].clientX)
  }
  const onTouchMove = (e: React.TouchEvent) => {
    updateSplit(e.touches[0].clientX)
  }

  // Container drag (clicks on image area)
  const onContainerMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    updateSplit(e.clientX)
  }

  // Keyboard
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setSplitPct(p => Math.max(0, p - 5))
    if (e.key === 'ArrowRight') setSplitPct(p => Math.min(100, p + 5))
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden rounded-2xl select-none focus:outline-none"
      style={{ cursor: dragging ? 'col-resize' : 'ew-resize' }}
      onMouseDown={onContainerMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="Photo comparison slider"
      aria-valuenow={Math.round(splitPct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* BEFORE (bottom layer, always full width) */}
      <div className="absolute inset-0" style={{ userSelect: 'none' }}>
        <Image
          src={beforeUrl}
          alt={beforeLabel}
          fill
          className="object-cover pointer-events-none"
          unoptimized
        />
      </div>

      {/* AFTER (top layer, clipped to splitPct) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)`, userSelect: 'none' }}
      >
        <Image
          src={afterUrl}
          alt={afterLabel}
          fill
          className="object-cover pointer-events-none"
          unoptimized
        />
      </div>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 z-20"
        style={{ left: `${splitPct}%`, transform: 'translateX(-50%)', pointerEvents: 'auto' }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        {/* Line */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)]" />

        {/* Handle circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center z-30 cursor-col-resize">
          <span className="text-[#0c0c18] text-sm font-black leading-none select-none">&#9665;&#9655;</span>
        </div>
      </div>

      {/* BEFORE label + score */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
        <span className="text-xs font-black text-white bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full tracking-widest">
          {beforeLabel}
        </span>
        {beforeScore != null && <ScorePill score={beforeScore} label="Score" />}
      </div>

      {/* AFTER label + score */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5 items-end pointer-events-none">
        <span className="text-xs font-black text-white bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full tracking-widest">
          {afterLabel}
        </span>
        {afterScore != null && <ScorePill score={afterScore} label="Score" />}
      </div>

      {/* Keyboard hint */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none opacity-60">
        <span className="text-[10px] text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
          ← → or drag
        </span>
      </div>
    </div>
  )
}
