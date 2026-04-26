import Link from 'next/link';
import type { Metadata } from 'next';
import { Cookie, ShieldCheck, BarChart3, Wrench } from 'lucide-react';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';

export const metadata: Metadata = {
  title: 'Cookie Policy | Hatcher',
  description:
    'Detailed breakdown of the cookies and local-storage mechanisms used by Hatcher — what they do, which are strictly necessary, and how to opt out.',
};

const LAST_UPDATED = 'April 16, 2026';

// Keep the rows in this table in sync with what the app actually sets.
// CookieConsent.tsx reads the `cookie_consent` key in localStorage
// (essential, not optional). PostHog + Sentry only initialize when the
// user gives analytics consent — see the hooks in app/layout.tsx.
export default function CookiePolicyPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-12">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Legal</p>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-[var(--text-primary)] mb-4"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Cookie policy
          </h1>
          <p className="text-sm text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose-custom space-y-10 text-[var(--text-secondary)] text-[15px] leading-relaxed">
          {/* Summary */}
          <section className="card glass-noise p-5 sm:p-6 border-[#f59e0b]/20">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">
              In one sentence
            </h2>
            <p className="text-sm">
              We use cookies + localStorage for login state (essential) and product analytics (optional — off by
              default until you accept). No advertising cookies, no cross-site tracking.
            </p>
          </section>

          <p>
            This page explains the cookies and local-storage keys Hatcher (
            <strong className="text-[var(--text-primary)]">HHX Technology SRL</strong>) uses, why, and how to control
            them. It supplements our{' '}
            <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">Privacy Policy</Link>.
          </p>

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">1. What is a cookie?</h2>
            <p>
              A cookie is a small text file stored in your browser that lets a site remember something between visits.
              Modern sites also use <em>localStorage</em> and <em>sessionStorage</em> for the same purpose. We use
              both interchangeably in this policy — the legal treatment is identical in the EU.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">2. Categories we use</h2>

            {/* Strictly necessary */}
            <div className="card glass-noise p-5 mb-4 border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Strictly necessary (always on)</h3>
              </div>
              <p className="text-sm mb-3">
                Without these the Service can&apos;t authenticate you or remember your theme / wallet choice. They
                don&apos;t require consent under GDPR + ePrivacy Directive.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-[var(--border-default)] rounded">
                  <thead className="bg-[var(--bg-elevated)] text-left">
                    <tr>
                      <th className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">Key</th>
                      <th className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">Type</th>
                      <th className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">Purpose</th>
                      <th className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">Lifetime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    <tr>
                      <td className="px-2 py-1.5 font-mono">jwt_token</td>
                      <td className="px-2 py-1.5">localStorage</td>
                      <td className="px-2 py-1.5">Authentication session</td>
                      <td className="px-2 py-1.5">7 days</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1.5 font-mono">refresh_token</td>
                      <td className="px-2 py-1.5">localStorage</td>
                      <td className="px-2 py-1.5">Renew JWT without re-login</td>
                      <td className="px-2 py-1.5">30 days</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1.5 font-mono">cookie_consent</td>
                      <td className="px-2 py-1.5">localStorage</td>
                      <td className="px-2 py-1.5">Remember your consent choice</td>
                      <td className="px-2 py-1.5">6 months</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1.5 font-mono">theme</td>
                      <td className="px-2 py-1.5">localStorage</td>
                      <td className="px-2 py-1.5">Dark / light theme</td>
                      <td className="px-2 py-1.5">Persistent</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1.5 font-mono">walletName</td>
                      <td className="px-2 py-1.5">localStorage</td>
                      <td className="px-2 py-1.5">Remember selected Solana wallet</td>
                      <td className="px-2 py-1.5">Until disconnect</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1.5 font-mono">__cf_bm</td>
                      <td className="px-2 py-1.5">Cookie (Cloudflare)</td>
                      <td className="px-2 py-1.5">Bot protection</td>
                      <td className="px-2 py-1.5">30 min</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Analytics */}
            <div className="card glass-noise p-5 mb-4 border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Analytics (optional)</h3>
              </div>
              <p className="text-sm mb-3">
                Off by default. Only set after you click &ldquo;Accept&rdquo; on our cookie banner. Used to understand
                which features are useful in aggregate.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-[var(--border-default)] rounded">
                  <thead className="bg-[var(--bg-elevated)] text-left">
                    <tr>
                      <th className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">Key / Provider</th>
                      <th className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">Type</th>
                      <th className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">Purpose</th>
                      <th className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">Lifetime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    <tr>
                      <td className="px-2 py-1.5 font-mono">ph_*</td>
                      <td className="px-2 py-1.5">PostHog (localStorage)</td>
                      <td className="px-2 py-1.5">Anonymized page views, feature usage</td>
                      <td className="px-2 py-1.5">1 year</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1.5 font-mono">sentryReplaySession</td>
                      <td className="px-2 py-1.5">Sentry (sessionStorage)</td>
                      <td className="px-2 py-1.5">Error-replay capture on opt-in</td>
                      <td className="px-2 py-1.5">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Functional */}
            <div className="card glass-noise p-5 border-[var(--border-default)]">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-[var(--text-muted)]" />
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Functional (set as you use the app)</h3>
              </div>
              <p className="text-sm mb-3">
                Written only when you interact with a specific feature. Strictly necessary for that feature, still
                part of the normal use of the Service.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-[var(--border-default)] rounded">
                  <thead className="bg-[var(--bg-elevated)] text-left">
                    <tr>
                      <th className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">Key</th>
                      <th className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">Purpose</th>
                      <th className="px-2 py-1.5 font-semibold text-[var(--text-primary)]">Lifetime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    <tr><td className="px-2 py-1.5 font-mono">recent_agents</td><td className="px-2 py-1.5">Remember your last-opened agents for quick-switcher</td><td className="px-2 py-1.5">Persistent</td></tr>
                    <tr><td className="px-2 py-1.5 font-mono">tour_seen</td><td className="px-2 py-1.5">Dismiss onboarding tour after first time</td><td className="px-2 py-1.5">Persistent</td></tr>
                    <tr><td className="px-2 py-1.5 font-mono">dashboard:*</td><td className="px-2 py-1.5">Cache dashboard shape for fast reload</td><td className="px-2 py-1.5">24h</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">3. How to control cookies</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-[var(--text-primary)]">In-app:</strong> the cookie banner on your first visit
                lets you accept or reject analytics. Change your mind later from{' '}
                <Link href="/dashboard/settings" className="text-[var(--color-accent)] hover:underline">Settings → Privacy</Link>.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Browser settings:</strong> every major browser lets you
                view, block, or delete cookies per-site. Do-Not-Track is respected — if your browser sends it, we
                skip the analytics banner and default to &ldquo;reject&rdquo;.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">localStorage:</strong> clearing site data in your
                browser removes all non-cookie keys. You&apos;ll be logged out.
              </li>
            </ul>
            <p className="mt-3 text-[13px] text-[var(--text-muted)]">
              Disabling strictly-necessary storage will break login and can&apos;t be opted out of — only the
              analytics category is optional.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">4. Third-party cookies</h2>
            <p>
              When you interact with a Stripe checkout or authorize a Solana wallet (Phantom, Solflare), those
              services may set their own cookies on their domains. We don&apos;t control those; consult Stripe and
              your wallet provider&apos;s policies.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">5. Changes</h2>
            <p>
              We update this page whenever we change which cookies we set. Bigger changes (new analytics provider,
              new category) re-trigger the consent banner so you can confirm your preferences.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">6. Contact</h2>
            <p>
              Questions? Email{' '}
              <a href="mailto:contact@hatcher.host" className="text-[var(--color-accent)] hover:underline">
                contact@hatcher.host
              </a>.
              Related pages:{' '}
              <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">Privacy Policy</Link>{' '}
              ·{' '}
              <Link href="/terms" className="text-[var(--color-accent)] hover:underline">Terms of Service</Link>{' '}
              ·{' '}
              <Link href="/impressum" className="text-[var(--color-accent)] hover:underline">Impressum</Link>.
            </p>
          </section>
        </div>
      </div>
    </MarketingShell>
  );
}
