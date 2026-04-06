import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Security — Hatcher',
  description: 'Security practices, responsible disclosure, and our public audit program.',
};

export default function SecurityPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-20">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              AUDIT IN PROGRESS
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] mb-3" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            Security
          </h1>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed">
            We take security seriously. Hatcher is currently undergoing a public community audit — find a real vulnerability and get credited here.
          </p>
        </div>

        {/* Public Audit Contest */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 mb-10">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Public Audit Contest — Open Now
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
            We've opened Hatcher's codebase and infrastructure to community review. If you find a valid security vulnerability — authentication bypass, data exposure, injection, privilege escalation, or similar — report it and get permanently credited on this page.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="mailto:hatcherlabs@gmail.com?subject=Security Report"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm font-medium text-amber-400 hover:bg-amber-500/15 transition-colors"
            >
              Report a vulnerability
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Open a support ticket
            </Link>
          </div>
        </div>

        {/* Hall of Fame */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold tracking-[0.10em] uppercase text-[var(--text-muted)] mb-4 pb-2 border-b border-[var(--border-default)]">
            Hall of Fame
          </h2>
          <div className="py-10 text-center text-[var(--text-muted)] text-sm">
            No reports yet — be the first.
          </div>
        </div>

        {/* Our practices */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold tracking-[0.10em] uppercase text-[var(--text-muted)] mb-4 pb-2 border-b border-[var(--border-default)]">
            Our Security Practices
          </h2>
          <ul className="space-y-3 mt-4">
            {[
              { label: 'Credentials encrypted at rest', detail: 'All integration tokens (Telegram, Discord, etc.) are encrypted with AES-256-GCM before storage. Keys are never logged or returned to the frontend.' },
              { label: 'JWT authentication', detail: '7-day expiry tokens, short-lived API keys with hk_ prefix, bcrypt password hashing.' },
              { label: 'Rate limiting on all endpoints', detail: 'Per-IP and per-user rate limits across all API routes to prevent abuse and brute force.' },
              { label: 'Container isolation', detail: 'Each agent runs in its own Docker container with resource limits, no Docker socket access, and a non-root user.' },
              { label: 'No shell injection', detail: 'All shell commands use execFileSync with array arguments — no string interpolation into shell commands anywhere in the codebase.' },
              { label: 'HTTPS everywhere', detail: 'All traffic is served over TLS via Cloudflare. HTTP requests are redirected to HTTPS.' },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Scope */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold tracking-[0.10em] uppercase text-[var(--text-muted)] mb-4 pb-2 border-b border-[var(--border-default)]">
            Scope
          </h2>
          <div className="space-y-2 mt-4">
            {[
              { inScope: true,  text: 'api.hatcher.host — API endpoints, authentication, data access' },
              { inScope: true,  text: 'hatcher.host — frontend, client-side vulnerabilities, CSP' },
              { inScope: true,  text: 'Agent containers — escape, privilege escalation, resource abuse' },
              { inScope: true,  text: 'LLM proxy — request forgery, model key extraction attempts' },
              { inScope: false, text: 'DoS / DDoS attacks' },
              { inScope: false, text: 'Social engineering or phishing' },
              { inScope: false, text: 'Third-party services (Groq, Cloudflare, GitHub)' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`text-xs font-semibold shrink-0 mt-0.5 px-1.5 py-0.5 rounded ${item.inScope ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {item.inScope ? 'IN' : 'OUT'}
                </span>
                <p className="text-sm text-[var(--text-secondary)]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="pt-6 border-t border-[var(--border-default)]">
          <p className="text-xs text-[var(--text-muted)]">
            For sensitive reports, email{' '}
            <a href="mailto:hatcherlabs@gmail.com" className="text-[var(--text-primary)] hover:underline underline-offset-2">
              hatcherlabs@gmail.com
            </a>
            {' '}directly. We aim to respond within 24 hours.
          </p>
        </div>

      </div>
    </main>
  );
}
