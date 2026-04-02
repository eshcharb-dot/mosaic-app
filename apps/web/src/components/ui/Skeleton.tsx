interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer rounded-lg bg-gradient-to-r from-[#0c0c18] via-[#222240] to-[#0c0c18] bg-[length:200%_100%] ${className}`}
    />
  )
}
