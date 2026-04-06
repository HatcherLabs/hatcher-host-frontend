import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Security Audit — Hatcher',
  description: 'Open call for security researchers to audit the Hatcher AI agent hosting platform.',
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
              AUDIT OPEN
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] mb-3" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            Security Audit
          </h1>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed">
            We're inviting security researchers to audit Hatcher. We host AI agents in Docker containers with LLM access, shell access, and messaging platform connections — and we need to make sure our isolation is bulletproof.
          </p>
        </div>

        {/* Repo access */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 mb-4">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Frontend — open source</p>
          <a
            href="https://github.com/HatcherLabs/hatcher-host-frontend"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#06b6d4] hover:underline underline-offset-2 font-mono"
          >
            github.com/HatcherLabs/hatcher-host-frontend
          </a>
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 mb-10">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Backend — private, access granted to vetted researchers</p>
          <p className="text-xs text-[var(--text-muted)]">Apply below to request access. We review within 48h.</p>
        </div>

        {/* How to qualify */}
        <div className="mb-10">
          <h2 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-4 pb-2 border-b border-[var(--border-default)]">
            Qualifying for Backend Access
          </h2>
          <ul className="space-y-2 mt-4">
            {[
              'Past audits, CVEs, bug bounty profiles or published security research',
              'Active GitHub profile with security-related contributions',
              'Referral from someone we already trust in the space',
              'Known in the Solana or AI agent security community',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)] mt-0.5 shrink-0">–</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--text-muted)] mt-4">We're not gatekeeping — we just need to know the code is in responsible hands before sharing it.</p>
        </div>

        {/* Scope */}
        <div className="mb-10">
          <h2 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-4 pb-2 border-b border-[var(--border-default)]">
            What We Want Tested
          </h2>
          <div className="space-y-6 mt-4">
            {[
              {
                emoji: '🐳',
                title: 'Container Isolation',
                items: [
                  'Agent escaping Docker container',
                  'Agent A accessing Agent B\'s data',
                  'Host filesystem or Docker socket access',
                  'Container spawning or network escape',
                ],
              },
              {
                emoji: '🧠',
                title: 'LLM Proxy',
                items: [
                  'Bypassing our proxy to call LLM providers directly',
                  'Extracting our Groq API key from inside a container',
                  'Free tier exceeding message limits',
                  'BYOK key leakage through responses or logs',
                ],
              },
              {
                emoji: '🔑',
                title: 'Auth & Access Control',
                items: [
                  'JWT tampering, session hijacking, token replay',
                  'User A accessing User B\'s agents, files, billing',
                  'Non-Pro user accessing Pro-only endpoints',
                  'Wallet signature replay attacks',
                ],
              },
              {
                emoji: '💰',
                title: 'Payments',
                items: [
                  'Faking Solana transaction signatures',
                  'Upgrading tier without paying',
                  'Bypassing agent add-on limits',
                ],
              },
              {
                emoji: '🌐',
                title: 'API & Web',
                items: [
                  'SQL injection, XSS, CSRF, IDOR',
                  'Path traversal in file manager',
                  'WebSocket injection or hijacking',
                  'DoS vectors',
                ],
              },
            ].map((section) => (
              <div key={section.title}>
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                  {section.emoji} {section.title}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item, i) => (
                    <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                      <span className="text-[var(--text-muted)] shrink-0 mt-0.5">–</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Out of scope */}
        <div className="mb-10">
          <h2 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-4 pb-2 border-b border-[var(--border-default)]">
            Out of Scope
          </h2>
          <ul className="space-y-1.5 mt-4">
            {[
              'Rate limiting on free tier (by design)',
              'Self-XSS, social engineering',
              'Bugs in upstream frameworks (OpenClaw / Hermes / ElizaOS / Milady core code)',
              'Theoretical attacks without working PoC',
            ].map((item, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                <span className="text-red-400 shrink-0 mt-0.5">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Rewards */}
        <div className="mb-10">
          <h2 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-4 pb-2 border-b border-[var(--border-default)]">
            Rewards
          </h2>
          <div className="space-y-2 mt-4">
            {[
              { dot: 'bg-red-500',    label: 'Critical', reward: '6 months Pro free + public Hall of Fame credit' },
              { dot: 'bg-orange-500', label: 'High',     reward: '6 months Pro free' },
              { dot: 'bg-amber-400',  label: 'Medium',   reward: '3 months Pro free' },
              { dot: 'bg-emerald-500',label: 'Low',      reward: 'Public credit + Pro badge on Discord' },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-3 text-sm">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${r.dot}`} />
                <span className="font-medium text-[var(--text-primary)] w-16 shrink-0">{r.label}</span>
                <span className="text-[var(--text-secondary)]">{r.reward}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Process */}
        <div className="mb-10">
          <h2 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-4 pb-2 border-b border-[var(--border-default)]">
            How to Apply
          </h2>
          <ol className="space-y-3 mt-4">
            {[
              'Comment on our post, DM @HatcherLabs on Discord, or email us',
              'Include your background, links to past work, and GitHub profile',
              'We review within 48h and grant backend access to approved researchers',
              'You get a dedicated test environment with agent containers running',
              'Submit findings as structured reports with PoC',
              'We verify, fix, and credit you publicly',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <span className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Hall of Fame */}
        <div className="mb-10">
          <h2 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--text-muted)] mb-4 pb-2 border-b border-[var(--border-default)]">
            Hall of Fame
          </h2>
          <div className="py-10 text-center text-[var(--text-muted)] text-sm">
            No findings credited yet — be the first.
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Get in touch</p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:contact@hatcher.host"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-card-solid)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
            >
              contact@hatcher.host
            </a>
            <a
              href="https://discord.gg/7tY3HjKjMc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-card-solid)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
            >
              DM @HatcherLabs on Discord
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
