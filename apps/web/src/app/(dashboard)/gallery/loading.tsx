import { Skeleton } from '@/components/ui/Skeleton'

export default function GalleryLoading() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="h-10 w-44 rounded-xl" />
        <Skeleton className="h-10 w-64 rounded-xl" />
      </div>

      {/* Photo grid — 4x3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
            {/* Image area */}
            <Skeleton className="aspect-square w-full rounded-none" />
            {/* Info area */}
            <div className="p-3 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
