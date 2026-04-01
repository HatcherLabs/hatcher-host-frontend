export default function AdminLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-48 rounded shimmer mb-2" />
            <div className="h-4 w-56 rounded shimmer" />
          </div>
          <div className="h-10 w-32 rounded-xl shimmer" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card glass-noise p-5">
              <div className="h-3 w-20 rounded shimmer mb-4" />
              <div className="h-8 w-16 rounded shimmer mb-3" />
              <div className="h-3 w-24 rounded shimmer" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="card glass-noise p-5">
          <div className="h-5 w-36 rounded shimmer mb-6" />
          {/* Table header */}
          <div className="flex gap-4 pb-3 border-b border-[var(--border-default)] mb-3">
            {[80, 120, 96, 64, 72].map((w, i) => (
              <div key={i} className="h-3 rounded shimmer" style={{ width: w }} />
            ))}
          </div>
          {/* Table rows */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-[var(--border-default)]">
              <div className="w-8 h-8 rounded-lg shimmer flex-shrink-0" />
              <div className="h-4 w-28 rounded shimmer" />
              <div className="h-4 w-24 rounded shimmer" />
              <div className="h-5 w-16 rounded-full shimmer" />
              <div className="h-4 w-20 rounded shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
