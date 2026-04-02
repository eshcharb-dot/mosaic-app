'use client'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

const shortcuts = [
  { keys: ['⌘', 'K'], label: 'Global search' },
  { keys: ['?'], label: 'Keyboard shortcuts' },
  { keys: ['Esc'], label: 'Close modal / palette' },
  { keys: ['↑', '↓'], label: 'Navigate results' },
  { keys: ['↵'], label: 'Open selected result' },
]

export default function KeyboardShortcutsModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0c0c18] border border-[#222240] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222240]">
          <div>
            <div className="text-white font-bold text-sm">Keyboard Shortcuts</div>
            <div className="text-[#b0b0d0] text-xs mt-0.5">Navigate Mosaic faster</div>
          </div>
          <button
            onClick={onClose}
            className="text-[#b0b0d0] hover:text-white transition-colors bg-[#030305] rounded-lg p-1.5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcut list */}
        <div className="px-5 py-4 space-y-3">
          {shortcuts.map(({ keys, label }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-[#b0b0d0]">{label}</span>
              <div className="flex items-center gap-1">
                {keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-1 bg-[#222240] border border-[#333360] rounded text-[11px] text-white font-mono min-w-[28px] text-center"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-[#222240] bg-[#030305]/40">
          <p className="text-[10px] text-[#b0b0d0]/50 text-center">Press Esc or ? to close</p>
        </div>
      </div>
    </div>
  )
}
