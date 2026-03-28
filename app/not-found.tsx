import Link from 'next/link';
import { FileQuestion, Bot } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4 bg-[var(--bg-base)]">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-gradient-to-br from-cyan-600/10 via-cyan-500/5 to-transparent blur-3xl" />
      </div>

      <div className="card glass-noise text-center max-w-md p-10">
        <div className="w-20 h-20 rounded-2xl bg-[#06b6d4]/10 flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-10 h-10 text-[#06b6d4]" />
        </div>

        <div className="font-semibold text-sm tracking-widest mb-3 uppercase text-[var(--accent-400)]">
          404
        </div>

        <h1 className="text-3xl font-extrabold mb-4 tracking-tight text-[var(--text-primary)]">
          Page not found
        </h1>

        <p className="text-base leading-relaxed mb-8 text-[var(--text-secondary)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="btn-primary px-6 py-3"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard/agents"
            className="btn-secondary px-6 py-3 inline-flex items-center gap-2"
          >
            <Bot size={16} />
            My Agents
          </Link>
        </div>
      </div>
    </div>
  );
}
