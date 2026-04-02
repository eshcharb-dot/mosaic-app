import { Skeleton } from '@/components/ui/Skeleton'

export default function StoresLoading() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Search/filter bar */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Table */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-[#222240]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-[#222240] last:border-0">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-24 self-center" />
            <Skeleton className="h-4 w-12 self-center" />
            <Skeleton className="h-6 w-20 rounded-full self-center" />
            <Skeleton className="h-4 w-16 self-center" />
          </div>
        ))}
      </div>
    </div>
  )
}
