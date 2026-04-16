import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Building2, Receipt, FileText, MapPin, Mail, Twitter, User,
  Server, ShieldAlert, AlertTriangle, Scale,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Impressum | Hatcher',
  description:
    'Legal information for Hatcher.host — operator details, registered address, liability notice, and disclaimers for the managed AI agent hosting platform.',
};

// Impressum / "legal notice" — a German-speaking-markets requirement that
// many EU businesses publish whether legally obligated or not. Keeping
// all operator identity in one page makes due-diligence for B2B and EU
// users trivial, and consolidates our liability + risk boilerplate
// (Disclaimer + Liability) so it's not duplicated across ToS and Cookie
// policy. Keep the headings stable — partners and compliance reviewers
// scan for fixed anchors (company info, contact, responsible person).
export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#8b5cf6] text-[11px] font-semibold uppercase tracking-wider mb-4">
            <Scale className="w-3 h-3" />
            Legal Notice
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-3"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Impressum
          </h1>
          <p className="text-sm text-[var(--text-muted)]">Last updated: April 10, 2026</p>
        </div>

        <div className="space-y-8 text-[var(--text-secondary)] text-[15px] leading-relaxed">
          {/* Company Information */}
          <section className="card glass-noise p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-4 h-4 text-[var(--color-accent)]" />
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Company Information</h2>
            </div>
            <dl className="grid sm:grid-cols-[160px_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-[var(--text-muted)]">Legal Name</dt>
              <dd className="text-[var(--text-primary)] font-semibold">HHX Technology SRL</dd>

              <dt className="text-[var(--text-muted)] flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                CUI
              </dt>
              <dd className="text-[var(--text-primary)] font-mono text-[13px]">45318471</dd>

              <dt className="text-[var(--text-muted)] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Trade Register
              </dt>
              <dd className="text-[var(--text-primary)] font-mono text-[13px]">J2021004947351</dd>

              <dt className="text-[var(--text-muted)] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Registered Address
              </dt>
              <dd className="text-[var(--text-primary)]">
                Timișoara, Timiș County<br />
                Romania
              </dd>
            </dl>
          </section>

          {/* Contact */}
          <section className="card glass-noise p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-5">
              <Mail className="w-4 h-4 text-[var(--color-accent)]" />
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Contact</h2>
            </div>
            <dl className="grid sm:grid-cols-[160px_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-[var(--text-muted)]">Email</dt>
              <dd>
                <a
                  href="mailto:contact@hatcher.host"
                  className="text-[var(--color-accent)] hover:underline font-medium"
                >
                  contact@hatcher.host
                </a>
              </dd>

              <dt className="text-[var(--text-muted)] flex items-center gap-1.5">
                <Twitter className="w-3.5 h-3.5" />
                X / Twitter
              </dt>
              <dd>
                <a
                  href="https://x.com/HatcherLabs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent)] hover:underline font-medium"
                >
                  @HatcherLabs
                </a>
              </dd>
            </dl>
          </section>

          {/* Responsible Person */}
          <section className="card glass-noise p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-4 h-4 text-[var(--color-accent)]" />
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Responsible Person</h2>
            </div>
            <p className="text-sm mb-1">
              <span className="text-[var(--text-primary)] font-semibold">Cristian G.</span>
              <span className="text-[var(--text-muted)]"> — Founder &amp; CEO</span>
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Geschäftsführer / Administrator per Romanian &amp; EU legal requirements.
            </p>
          </section>

          {/* Platform Purpose */}
          <section className="card glass-noise p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-[var(--color-accent)]" />
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Platform Purpose</h2>
            </div>
            <p>
              <span className="text-[var(--text-primary)] font-semibold">Hatcher.host</span> is a managed hosting platform
              for open-source AI agent frameworks. Users deploy agents based on frameworks such as{' '}
              <span className="text-[var(--text-primary)]">OpenClaw</span>,{' '}
              <span className="text-[var(--text-primary)]">Hermes</span>,{' '}
              <span className="text-[var(--text-primary)]">ElizaOS</span>, and{' '}
              <span className="text-[var(--text-primary)]">Milady</span>. Each agent runs in an isolated Docker container
              with tier-based resource limits.
            </p>
          </section>

          {/* Disclaimer */}
          <section className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Disclaimer</h2>
            </div>
            <ul className="space-y-3 text-sm list-disc pl-5">
              <li>
                All agents run in <span className="text-[var(--text-primary)]">isolated Docker containers</span> with
                strict resource and network limits. Agent behavior is nonetheless determined by the user&apos;s
                configuration, prompts, and connected integrations.
              </li>
              <li>
                Users are <span className="text-[var(--text-primary)]">fully responsible</span> for their agents&apos;
                actions, any on-chain transactions, wallet approvals, connected platform accounts (Telegram, Discord,
                Twitter, WhatsApp, Slack), and any financial outcomes — profit or loss.
              </li>
              <li>
                We do <span className="text-[var(--text-primary)]">not</span> provide financial, trading, investment,
                legal, or tax advice. Nothing on this platform constitutes a recommendation to buy, sell, or hold any
                asset.
              </li>
              <li>
                <span className="text-[var(--text-primary)]">Crypto trading involves high risk</span>, including the
                possibility of total capital loss. Only use funds you can afford to lose.
              </li>
            </ul>
          </section>

          {/* Liability */}
          <section className="rounded-xl border border-red-500/25 bg-red-500/[0.04] p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Liability</h2>
            </div>
            <p className="text-sm mb-3">
              Hatcher.host is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any
              kind, express or implied. To the fullest extent permitted by applicable law, we are not liable for:
            </p>
            <ul className="space-y-2 text-sm list-disc pl-5">
              <li>Direct, indirect, incidental, or consequential damages arising from platform use.</li>
              <li>
                Losses caused by the underlying open-source frameworks (OpenClaw, Hermes, ElizaOS, Milady) or their
                third-party dependencies.
              </li>
              <li>Loss of funds, data, account access, or third-party platform integrations.</li>
              <li>Downtime, data loss, or service interruption — including during maintenance or network incidents.</li>
            </ul>
            <p className="text-xs text-[var(--text-muted)] mt-4">
              This does not limit liability that cannot be excluded under mandatory law (e.g., gross negligence or
              wilful misconduct under Romanian and EU consumer protection law).
            </p>
          </section>

          {/* Related Legal Pages — Cookie handling is covered in the
              Privacy Policy, not a separate Cookie Policy, so we don't
              link a dead page. */}
          <section>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Related legal documents</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link
                href="/privacy"
                className="card glass-noise p-4 text-sm hover:border-[var(--color-accent)]/30 transition-colors group"
              >
                <p className="text-xs text-[var(--text-muted)] mb-1">How we handle data &amp; cookies</p>
                <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                  Privacy Policy →
                </p>
              </Link>
              <Link
                href="/terms"
                className="card glass-noise p-4 text-sm hover:border-[var(--color-accent)]/30 transition-colors group"
              >
                <p className="text-xs text-[var(--text-muted)] mb-1">Rules of use</p>
                <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                  Terms of Service →
                </p>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
