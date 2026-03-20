export default function ExploreLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10" style={{ background: '#0D0B1A' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-lg shimmer" />
          <div className="h-4 w-72 rounded-lg shimmer" />
        </div>

        {/* Search + filters skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="h-11 flex-1 max-w-md rounded-xl shimmer" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-20 rounded-full shimmer" />
            ))}
          </div>
        </div>

        {/* Agent cards grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-full shimmer" />
                <div className="h-6 w-16 rounded-full shimmer" />
              </div>
              <div className="h-5 w-32 rounded shimmer mb-2" />
              <div className="space-y-1.5 mb-4">
                <div className="h-3.5 w-full rounded shimmer" />
                <div className="h-3.5 w-3/4 rounded shimmer" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded-full shimmer" />
                <div className="h-6 w-16 rounded-full shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
