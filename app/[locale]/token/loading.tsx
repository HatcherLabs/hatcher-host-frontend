export default function TokenLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-44 rounded shimmer mb-2" />
          <div className="h-4 w-64 rounded shimmer" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card glass-noise p-5">
              <div className="h-3 w-20 rounded shimmer mb-4" />
              <div className="h-8 w-24 rounded shimmer mb-3" />
              <div className="h-3 w-16 rounded shimmer" />
            </div>
          ))}
        </div>

        {/* Chart placeholder */}
        <div className="card glass-noise p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="h-5 w-32 rounded shimmer" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-16 rounded-lg shimmer" />
              ))}
            </div>
          </div>
          <div className="h-[280px] w-full rounded-xl shimmer" />
        </div>

        {/* Token info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="card glass-noise p-5">
              <div className="h-5 w-28 rounded shimmer mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex justify-between">
                    <div className="h-4 w-24 rounded shimmer" />
                    <div className="h-4 w-20 rounded shimmer" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
