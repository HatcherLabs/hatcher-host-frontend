import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-white/[0.04]', className)}
    />
  );
}

// ── Compound skeleton shapes ─────────────────────────────────

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-5 space-y-4',
        'bg-[rgba(26,23,48,0.8)] border-[rgba(46,43,74,0.4)]',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonAgentList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-5',
        'bg-[rgba(26,23,48,0.8)] border-[rgba(46,43,74,0.4)]',
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-7 w-24 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function SkeletonTab({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 p-6', className)}>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-6 w-6 rounded-lg" />
        <Skeleton className="h-5 w-40" />
      </div>
      <SkeletonText lines={3} />
      <div className="grid grid-cols-2 gap-3 mt-4">
        <SkeletonStat />
        <SkeletonStat />
      </div>
    </div>
  );
}
