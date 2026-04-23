export default function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[var(--border-default)] border-t-[var(--text-muted)] animate-spin" />
    </div>
  );
}
