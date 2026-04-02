'use client'
import React from 'react'

interface CheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export default function Checkbox({ checked, indeterminate = false, onChange, label, className = '', size = 'md' }: CheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  const dim = size === 'sm' ? 15 : 17

  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none ${className}`}>
      <span
        className="relative flex-shrink-0"
        style={{ width: dim, height: dim }}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          style={{ margin: 0 }}
        />
        {/* Custom visual */}
        <span
          className="block rounded transition-all duration-150"
          style={{
            width: dim,
            height: dim,
            background: checked || indeterminate ? '#7c6df5' : 'transparent',
            border: `2px solid ${checked || indeterminate ? '#7c6df5' : '#444466'}`,
            boxShadow: checked || indeterminate ? '0 0 0 2px #7c6df520' : 'none',
          }}
        >
          {checked && !indeterminate && (
            <svg
              viewBox="0 0 10 8"
              fill="none"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: dim * 0.6, height: dim * 0.6 }}
            >
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {indeterminate && (
            <svg
              viewBox="0 0 10 2"
              fill="none"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: dim * 0.6, height: dim * 0.2 }}
            >
              <path d="M1 1H9" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </span>
      </span>
      {label && <span className="text-sm text-[#b0b0d0]">{label}</span>}
    </label>
  )
}
