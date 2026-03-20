export default function DashboardLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10" style={{ background: '#0D0B1A' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl shimmer" />
            <div className="space-y-2">
              <div className="h-6 w-40 rounded-lg shimmer" />
              <div className="h-4 w-28 rounded-lg shimmer" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-48 rounded-xl shimmer" />
            <div className="h-10 w-10 rounded-xl shimmer" />
          </div>
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5">
              <div className="h-3 w-20 rounded shimmer mb-4" />
              <div className="h-8 w-16 rounded shimmer mb-3" />
              <div className="h-3 w-24 rounded shimmer" />
            </div>
          ))}
        </div>

        {/* Quick actions skeleton */}
        <div className="flex gap-3">
          <div className="h-10 w-36 rounded-xl shimmer" />
          <div className="h-10 w-32 rounded-xl shimmer" />
          <div className="h-10 w-28 rounded-xl shimmer" />
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 card p-5">
            <div className="h-5 w-32 rounded shimmer mb-6" />
            <div className="h-[220px] rounded-xl shimmer" />
          </div>
          <div className="lg:col-span-2 card p-5">
            <div className="h-5 w-28 rounded shimmer mb-6" />
            <div className="flex justify-center mb-6">
              <div className="w-40 h-40 rounded-full shimmer" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-20 rounded shimmer" />
                  <div className="h-4 w-8 rounded shimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
