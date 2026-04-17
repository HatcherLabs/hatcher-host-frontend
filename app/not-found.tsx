import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-[160px] sm:text-[200px] font-bold leading-none text-[var(--color-accent)]/15 select-none tabular-nums" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
          404
        </p>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-3 mt-4" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>Page not found</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Go home
          </Link>
          <Link
            href="/dashboard/agents"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-md border border-[var(--border-hover)] text-[var(--text-secondary)] font-medium text-sm hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition-colors"
          >
            My agents
          </Link>
        </div>
      </div>
    </div>
  );
}
