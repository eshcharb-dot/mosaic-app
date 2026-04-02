interface BadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active:        { label: 'Active',        color: '#00e096', bg: 'rgba(0,224,150,0.1)',   border: 'rgba(0,224,150,0.25)' },
  draft:         { label: 'Draft',         color: '#ffc947', bg: 'rgba(255,201,71,0.1)',  border: 'rgba(255,201,71,0.25)' },
  paused:        { label: 'Paused',        color: '#ff9b47', bg: 'rgba(255,155,71,0.1)',  border: 'rgba(255,155,71,0.25)' },
  completed:     { label: 'Completed',     color: '#7c6df5', bg: 'rgba(124,109,245,0.1)', border: 'rgba(124,109,245,0.25)' },
  compliant:     { label: 'Compliant',     color: '#00e096', bg: 'rgba(0,224,150,0.1)',   border: 'rgba(0,224,150,0.25)' },
  non_compliant: { label: 'Non-Compliant', color: '#ff6b9d', bg: 'rgba(255,107,157,0.1)', border: 'rgba(255,107,157,0.25)' },
  pending:       { label: 'Pending',       color: '#b0b0d0', bg: 'rgba(176,176,208,0.1)', border: 'rgba(176,176,208,0.2)' },
}

export default function Badge({ status, size = 'md' }: BadgeProps) {
  const def = STATUS_MAP[status] ?? {
    label: status,
    color: '#b0b0d0',
    bg: 'rgba(176,176,208,0.1)',
    border: 'rgba(176,176,208,0.2)',
  }

  const padding = size === 'sm' ? '2px 8px' : '3px 10px'
  const fontSize = size === 'sm' ? '11px' : '12px'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding,
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: def.color,
        background: def.bg,
        border: `1px solid ${def.border}`,
        borderRadius: 999,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: size === 'sm' ? 5 : 6,
          height: size === 'sm' ? 5 : 6,
          borderRadius: '50%',
          background: def.color,
          flexShrink: 0,
        }}
      />
      {def.label}
    </span>
  )
}
