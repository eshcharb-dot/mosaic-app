import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton */}
      <div className="w-60 flex-shrink-0 bg-[#0c0c18] border-r border-[#222240] p-5 flex flex-col gap-4">
        {/* Logo area */}
        <Skeleton className="h-9 w-32 mb-4" />
        {/* Nav items */}
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
        {/* Bottom user area */}
        <div className="mt-auto flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-4 flex-1" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 mb-5">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <Skeleton className="h-52 w-full" />
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-3">
            <Skeleton className="h-5 w-40 mb-5" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 space-y-3">
            <Skeleton className="h-5 w-36 mb-5" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
