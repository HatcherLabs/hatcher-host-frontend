export default function AgentDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Back link */}
      <div className="h-4 shimmer rounded-lg w-32 mb-6" />

      {/* Profile card */}
      <div className="card glass-noise p-8 mb-6">
        <div className="flex items-start gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl shimmer flex-shrink-0" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="h-7 shimmer rounded-lg w-2/3" />
            <div className="flex gap-2">
              <div className="h-5 shimmer rounded-full w-16" />
              <div className="h-5 shimmer rounded-full w-20" />
            </div>
            <div className="h-4 shimmer rounded-lg w-28" />
          </div>
        </div>
        <div className="space-y-2 mb-6">
          <div className="h-4 shimmer rounded-lg" />
          <div className="h-4 shimmer rounded-lg w-5/6" />
        </div>
        <div className="pt-4 border-t border-[var(--border-default)] flex justify-between">
          <div className="h-4 shimmer rounded-lg w-40" />
          <div className="h-8 shimmer rounded-lg w-20" />
        </div>
      </div>

      {/* Stats card */}
      <div className="card glass-noise p-6">
        <div className="h-6 shimmer rounded-lg w-32 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-[var(--bg-elevated)] p-4">
              <div className="h-3 shimmer rounded w-16 mx-auto mb-2" />
              <div className="h-5 shimmer rounded w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
