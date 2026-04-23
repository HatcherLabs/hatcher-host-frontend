export default function AgentManagementLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-7 shimmer rounded-lg w-48" />
          <div className="h-4 shimmer rounded-lg w-32" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 shimmer rounded-xl w-24" />
          <div className="h-10 shimmer rounded-xl w-20" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--border-default)] pb-px">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 shimmer rounded-lg w-24" />
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card glass-noise p-4">
            <div className="h-3 shimmer rounded w-20 mb-2" />
            <div className="h-7 shimmer rounded w-16" />
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="card glass-noise p-6">
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 shimmer rounded-lg" style={{ width: `${85 - i * 8}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
