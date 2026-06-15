export default function PricingLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8" style={{ background: 'var(--bg-base)' }}>
      <div className="mx-auto mb-10 max-w-3xl space-y-4 text-center">
        <div className="mx-auto h-3 w-32 rounded-full shimmer" />
        <div className="mx-auto h-10 w-full max-w-xl rounded-2xl shimmer" />
        <div className="mx-auto h-4 w-full max-w-lg rounded-full shimmer" />
        <div className="mx-auto mt-6 flex h-11 w-64 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-1">
          <div className="h-full flex-1 rounded-lg shimmer" />
          <div className="h-full flex-1 rounded-lg" />
        </div>
      </div>

      <div className="mb-12 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="h-5 w-20 rounded-full shimmer" />
              <div className="h-6 w-14 rounded-full shimmer" />
            </div>
            <div className="mb-5 h-9 w-28 rounded-xl shimmer" />
            <div className="mb-6 space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-3.5 rounded-full shimmer" style={{ width: `${94 - j * 9}%` }} />
              ))}
            </div>
            <div className="h-10 rounded-xl shimmer" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="h-6 w-48 rounded-full shimmer" />
          <div className="h-8 w-28 rounded-lg shimmer" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-[var(--border-default)] last:border-0">
            <div className="h-3.5 w-44 rounded-full shimmer" />
            <div className="flex gap-5">
              <div className="h-3.5 w-16 rounded-full shimmer" />
              <div className="h-3.5 w-16 rounded-full shimmer" />
              <div className="h-3.5 w-16 rounded-full shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
