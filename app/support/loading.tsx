export default function SupportLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-36 rounded shimmer mb-2" />
          <div className="h-4 w-72 rounded shimmer" />
        </div>

        {/* Submit form placeholder */}
        <div className="card glass-noise p-6 mb-8">
          <div className="h-5 w-40 rounded shimmer mb-4" />
          <div className="h-10 w-full rounded-xl shimmer mb-4" />
          <div className="h-24 w-full rounded-xl shimmer mb-4" />
          <div className="h-10 w-32 rounded-xl shimmer" />
        </div>

        {/* Ticket list skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card glass-noise p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg shimmer flex-shrink-0" />
                  <div className="space-y-2">
                    <div className="h-4 w-48 rounded shimmer" />
                    <div className="h-3 w-32 rounded shimmer" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-16 rounded-full shimmer" />
                  <div className="h-3 w-20 rounded shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
