export default function DashboardLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ background: 'var(--bg-base)' }}>
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-soft)] lg:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl shimmer" />
            <div className="h-4 w-28 rounded-full shimmer" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <div className="h-8 w-8 rounded-lg shimmer" />
                <div className="h-3.5 w-28 rounded-full shimmer" />
              </div>
            ))}
          </div>
        </aside>

        <main className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 rounded-xl shimmer" />
              <div className="h-4 w-72 rounded-full shimmer" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-36 rounded-xl shimmer" />
              <div className="h-10 w-10 rounded-xl shimmer" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
                <div className="mb-5 flex items-center justify-between">
                  <div className="h-3 w-24 rounded-full shimmer" />
                  <div className="h-8 w-8 rounded-lg shimmer" />
                </div>
                <div className="mb-3 h-8 w-16 rounded-xl shimmer" />
                <div className="h-3 w-32 rounded-full shimmer" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)] lg:col-span-3">
              <div className="mb-5 flex items-center justify-between">
                <div className="h-5 w-40 rounded-full shimmer" />
                <div className="h-8 w-24 rounded-lg shimmer" />
              </div>
              <div className="space-y-3">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl shimmer" />
                      <div className="space-y-2">
                        <div className="h-4 w-36 rounded-full shimmer" />
                        <div className="h-3 w-24 rounded-full shimmer" />
                      </div>
                    </div>
                    <div className="h-7 w-20 rounded-full shimmer" />
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)] lg:col-span-2">
              <div className="mb-5 h-5 w-36 rounded-full shimmer" />
              <div className="mb-5 h-3 w-full rounded-full shimmer" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-3.5 w-28 rounded-full shimmer" />
                    <div className="h-3.5 w-12 rounded-full shimmer" />
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
