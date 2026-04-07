export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    </div>
  );
}
