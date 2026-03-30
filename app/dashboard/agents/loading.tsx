import { AgentCardSkeleton, SkeletonStat } from '@/components/ui/Skeleton';

export default function AgentsLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-40 rounded shimmer mb-2" />
            <div className="h-4 w-64 rounded shimmer" />
          </div>
          <div className="h-10 w-36 rounded-xl shimmer" />
        </div>
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <SkeletonStat key={i} />
          ))}
        </div>
        {/* Agent cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
