export default function PricingLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="h-9 shimmer rounded-lg w-64 mx-auto mb-3" />
        <div className="h-5 shimmer rounded-lg w-96 mx-auto" />
      </div>

      {/* Pricing cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card glass-noise p-6">
            <div className="h-6 shimmer rounded-lg w-24 mb-2" />
            <div className="h-10 shimmer rounded-lg w-20 mb-4" />
            <div className="space-y-3 mb-6">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-4 shimmer rounded-lg" style={{ width: `${90 - j * 10}%` }} />
              ))}
            </div>
            <div className="h-11 shimmer rounded-xl" />
          </div>
        ))}
      </div>

      {/* Feature table */}
      <div className="card glass-noise p-6">
        <div className="h-7 shimmer rounded-lg w-48 mb-6" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-[var(--border-default)] last:border-0">
            <div className="h-4 shimmer rounded-lg w-40" />
            <div className="h-4 shimmer rounded-lg w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
