import { Skeleton } from '@/components/ui/Skeleton'

export default function CampaignsLoading() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Table skeleton */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-[#222240]">
          {['Campaign', 'Status', 'Stores', 'Compliance', 'Created'].map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-[#222240] last:border-0">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full self-center" />
            <Skeleton className="h-4 w-12 self-center" />
            <Skeleton className="h-4 w-16 self-center" />
            <Skeleton className="h-4 w-24 self-center" />
          </div>
        ))}
      </div>
    </div>
  )
}
