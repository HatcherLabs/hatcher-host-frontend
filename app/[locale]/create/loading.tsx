export default function CreateLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Progress bar skeleton */}
        <div className="flex items-center justify-center gap-2 py-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full shimmer" />
              {i < 3 && <div className="w-16 h-0.5 rounded shimmer" />}
            </div>
          ))}
        </div>

        {/* Title skeleton */}
        <div className="text-center space-y-3">
          <div className="h-8 w-64 mx-auto rounded-lg shimmer" />
          <div className="h-4 w-96 mx-auto rounded-lg shimmer" />
        </div>

        {/* Template cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)]" />
                <div className="h-5 w-28 rounded bg-[var(--bg-card)]" />
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-full rounded bg-[var(--bg-card)]" />
                <div className="h-3.5 w-2/3 rounded bg-[var(--bg-card)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
