export default function BillingLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div>
          <div className="h-8 w-48 rounded shimmer mb-2" />
          <div className="h-4 w-72 rounded shimmer" />
        </div>
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card glass-noise p-5">
              <div className="h-4 w-28 rounded shimmer mb-3" />
              <div className="h-8 w-20 rounded shimmer mb-2" />
              <div className="h-3 w-32 rounded shimmer" />
            </div>
          ))}
        </div>
        {/* Content card skeleton */}
        <div className="card glass-noise p-6">
          <div className="h-5 w-40 rounded shimmer mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-[rgba(46,43,74,0.3)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg shimmer" />
                  <div className="h-4 w-36 rounded shimmer" />
                </div>
                <div className="h-4 w-16 rounded shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
