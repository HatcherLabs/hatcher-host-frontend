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
            <div key={i} className="card glass-noise p-5">
              <div className="h-4 w-24 rounded shimmer mb-3" />
              <div className="h-8 w-16 rounded shimmer" />
            </div>
          ))}
        </div>
        {/* Agent cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card glass-noise p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl shimmer flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-32 rounded shimmer" />
                  <div className="h-3 w-full rounded shimmer" />
                  <div className="h-3 w-2/3 rounded shimmer" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="h-5 w-16 rounded-full shimmer" />
                <div className="h-5 w-14 rounded-full shimmer" />
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(46,43,74,0.3)]">
                <div className="h-3 w-20 rounded shimmer" />
                <div className="h-3 w-16 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
