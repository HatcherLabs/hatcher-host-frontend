export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="h-8 shimmer rounded-lg w-32 mb-8" />

      {/* Settings sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card glass-noise p-6 mb-6">
          <div className="h-6 shimmer rounded-lg w-40 mb-4" />
          <div className="space-y-4">
            <div>
              <div className="h-3 shimmer rounded w-24 mb-2" />
              <div className="h-11 shimmer rounded-xl" />
            </div>
            <div>
              <div className="h-3 shimmer rounded w-28 mb-2" />
              <div className="h-11 shimmer rounded-xl" />
            </div>
          </div>
        </div>
      ))}

      {/* Save button */}
      <div className="h-11 shimmer rounded-xl w-32" />
    </div>
  );
}
