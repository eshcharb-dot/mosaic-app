import { Skeleton } from '@/components/ui/Skeleton'

export default function AnalyticsLoading() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-60 rounded-xl" />
      </div>

      {/* Score Distribution */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-5 w-5 rounded" />
        </div>
        <Skeleton className="h-60 w-full" />
      </div>

      {/* Top + Bottom stores */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {[0, 1].map((i) => (
          <div key={i} className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-14 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Campaign comparison */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-60" />
          </div>
          <Skeleton className="h-5 w-5 rounded" />
        </div>
        <Skeleton className="h-60 w-full" />
      </div>

      {/* Trend */}
      <div className="bg-[#0c0c18] border border-[#222240] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-5 w-5 rounded" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  )
}
