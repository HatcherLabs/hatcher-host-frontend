export default function CreateLoading() {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-10" style={{ background: 'var(--bg-base)' }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="mx-auto w-full max-w-3xl space-y-4 text-center">
          <div className="mx-auto h-3 w-28 rounded-full shimmer" />
          <div className="mx-auto h-10 w-full max-w-xl rounded-2xl shimmer" />
          <div className="mx-auto h-4 w-full max-w-lg rounded-full shimmer" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl shimmer" />
                <div className="space-y-2">
                  <div className="h-4 w-36 rounded-full shimmer" />
                  <div className="h-3 w-24 rounded-full shimmer" />
                </div>
              </div>
              <div className="h-8 w-24 rounded-lg shimmer" />
            </div>

            <div className="space-y-3">
              <div className="ml-auto h-20 w-5/6 rounded-2xl shimmer" />
              <div className="h-28 w-11/12 rounded-2xl shimmer" />
              <div className="ml-auto h-16 w-2/3 rounded-2xl shimmer" />
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
              <div className="h-10 flex-1 rounded-xl shimmer" />
              <div className="h-10 w-24 rounded-xl shimmer" />
            </div>
          </section>

          <aside className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-36 rounded-full shimmer" />
                <div className="h-3 w-28 rounded-full shimmer" />
              </div>
              <div className="h-7 w-20 rounded-full shimmer" />
            </div>

            <div className="grid gap-3">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg shimmer" />
                    <div className="space-y-2">
                      <div className="h-3 w-28 rounded-full shimmer" />
                      <div className="h-3 w-20 rounded-full shimmer" />
                    </div>
                  </div>
                  <div className="h-6 w-14 rounded-full shimmer" />
                </div>
              ))}
            </div>

            <div className="mt-5 h-24 rounded-2xl shimmer" />
          </aside>
        </div>
      </div>
    </div>
  );
}
