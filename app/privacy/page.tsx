import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Hatcher',
  description:
    'GDPR-aligned Privacy Policy for Hatcher — what we collect, why, how long we keep it, how to exercise your data subject rights.',
};

// Last-updated is the canonical truth for "when did this change". Bump
// it on any material edit (scope, retention, third-parties). GDPR
// requires material changes to be communicated to users — the
// sendPrivacyUpdated email hook in services/email.ts handles that.
const LAST_UPDATED = 'April 16, 2026';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-12">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">GDPR-aligned</p>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-[var(--text-primary)] mb-4"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Privacy policy
          </h1>
          <p className="text-sm text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose-custom space-y-10 text-[var(--text-secondary)] text-[15px] leading-relaxed">
          {/* Summary card — always useful up top */}
          <section className="card glass-noise p-5 sm:p-6 border-[var(--color-accent)]/20">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">
              At a glance
            </h2>
            <ul className="space-y-2 text-sm">
              <li>• We collect only what we need to run your account and your agents.</li>
              <li>• We never sell your data, and we never train AI on your chats or configs.</li>
              <li>• You can export or delete everything from your{' '}
                <Link href="/dashboard/settings" className="text-[var(--color-accent)] hover:underline">Settings</Link>{' '}
                page.
              </li>
              <li>• EU/EEA users have full GDPR rights — access, rectification, erasure, portability, objection.</li>
              <li>• Questions? Email{' '}
                <a href="mailto:contact@hatcher.host" className="text-[var(--color-accent)] hover:underline">
                  contact@hatcher.host
                </a>.
              </li>
            </ul>
          </section>

          <p>
            This Privacy Policy describes how <strong className="text-[var(--text-primary)]">HHX Technology SRL</strong>{' '}
            (&ldquo;Hatcher,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) collects, uses, stores, and
            protects your personal data when you use the Hatcher platform at{' '}
            <a href="https://hatcher.host" className="text-[var(--color-accent)] hover:underline">hatcher.host</a>{' '}
            (the &ldquo;Service&rdquo;).
          </p>

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">1. Data Controller</h2>
            <ul className="mt-3 space-y-1.5">
              <li><strong className="text-[var(--text-primary)]">HHX Technology SRL</strong></li>
              <li>CUI: 45318471 · Trade Register: J2021004947351</li>
              <li>Timișoara, Timiș County, Romania</li>
              <li>Privacy inquiries: <a href="mailto:contact@hatcher.host" className="text-[var(--color-accent)] hover:underline">contact@hatcher.host</a></li>
            </ul>
            <p className="mt-3 text-[13px] text-[var(--text-muted)]">
              We are not required to appoint a Data Protection Officer (DPO) under GDPR Art. 37. The founder acts
              as the point of contact for all data subject requests.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">2. Information We Collect</h2>

            <h3 className="text-base font-medium text-[var(--text-primary)] mt-4 mb-2">Account Information</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Email address and username (required for registration)</li>
              <li>Password — stored as a bcrypt hash; we never see or store the plaintext</li>
              <li>Solana wallet address (optional; filled automatically on your first on-chain payment)</li>
              <li>Stripe customer ID (optional; created on your first card payment)</li>
            </ul>

            <h3 className="text-base font-medium text-[var(--text-primary)] mt-4 mb-2">Agent Data</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Agent configurations — name, description, avatar, prompts, personality, plugin list</li>
              <li>Chat history with your agents (PostgreSQL, scoped to your account)</li>
              <li>Files you upload to or create within agent workspaces</li>
              <li>Agent activity logs and performance metrics</li>
              <li>Integration tokens (Telegram bot token, Discord, Twitter, etc.) — encrypted at rest with AES-256-GCM</li>
            </ul>

            <h3 className="text-base font-medium text-[var(--text-primary)] mt-4 mb-2">Usage Data</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>IP address (truncated after 24h), browser type, device information</li>
              <li>Pages visited, features used, session duration</li>
              <li>API usage patterns, message counts, search counts</li>
            </ul>

            <h3 className="text-base font-medium text-[var(--text-primary)] mt-4 mb-2">Payment Information</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Transaction signatures for on-chain payments (SOL, USDC, $HATCHER)</li>
              <li>Stripe handles all card data — we never see or store card numbers, CVC, or expiry</li>
              <li>Invoice line items (tier, addon, amount, currency, timestamp)</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">3. Lawful Bases for Processing (GDPR Art. 6)</h2>
            <p>For EU/EEA users, we rely on the following legal bases:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li>
                <strong className="text-[var(--text-primary)]">Contract (Art. 6(1)(b))</strong> — running your account,
                deploying your agents, processing payments. Without this data the Service cannot be delivered.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Legitimate interest (Art. 6(1)(f))</strong> — fraud
                prevention, abuse detection, infrastructure security, anonymized usage analytics.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Consent (Art. 6(1)(a))</strong> — optional analytics
                (PostHog), marketing emails, cookie banner choices. You can withdraw consent at any time.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Legal obligation (Art. 6(1)(c))</strong> — tax and
                accounting records (Romanian Fiscal Code requires 7-year retention).
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">4. How We Use Your Information</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li>Provide, maintain, and improve the Service</li>
              <li>Authenticate your identity and manage your account</li>
              <li>Process payments and manage subscriptions / addons</li>
              <li>Enforce tier limits (daily messages, agent count, resource quotas)</li>
              <li>Send transactional emails (signup, password reset, billing, expiry reminders)</li>
              <li>Monitor platform health, detect abuse, prevent fraud</li>
              <li>Analyze aggregate usage to improve features</li>
              <li>Respond to support requests</li>
            </ul>
            <p className="mt-3">
              <strong className="text-[var(--text-primary)]">We do not</strong> sell your personal data to third
              parties, use your agent configs or chat history to train AI models, or target advertising.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">5. Data Storage &amp; Security</h2>
            <p>Your data is stored on our infrastructure in Falkenstein, Germany (Hetzner EU). Security measures:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li>Passwords hashed with bcrypt before storage</li>
              <li>Integration secrets, API keys, and sensitive credentials encrypted with AES-256-GCM</li>
              <li>All traffic encrypted in transit via TLS 1.3 (HTTPS)</li>
              <li>Cloudflare provides DDoS protection and edge security</li>
              <li>Agent containers run as non-root, with CPU/memory limits and network isolation</li>
              <li>Database access restricted to the application server over localhost</li>
              <li>Firewall (iptables) limits Docker egress to our LLM proxy + API only</li>
              <li>Off-site encrypted backups rotated daily</li>
            </ul>
            <p className="mt-3">
              No method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security,
              but we commit to following industry best practices and notifying affected users without undue delay
              if a data breach occurs (GDPR Art. 33 &amp; 34 — within 72 hours where required).
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">6. Third-Party Services (Sub-Processors)</h2>
            <p>
              We use the following sub-processors. Each has their own privacy policy — by using Hatcher you consent
              to the data flows listed:
            </p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm border border-[var(--border-default)] rounded-lg overflow-hidden">
                <thead className="bg-[var(--bg-elevated)]">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-semibold text-[var(--text-primary)]">Service</th>
                    <th className="px-3 py-2 font-semibold text-[var(--text-primary)]">Purpose</th>
                    <th className="px-3 py-2 font-semibold text-[var(--text-primary)]">Data Shared</th>
                    <th className="px-3 py-2 font-semibold text-[var(--text-primary)]">Region</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  <tr><td className="px-3 py-2">Hetzner</td><td className="px-3 py-2">Hosting + compute</td><td className="px-3 py-2">All account + agent data</td><td className="px-3 py-2">Germany</td></tr>
                  <tr><td className="px-3 py-2">Cloudflare</td><td className="px-3 py-2">CDN, DDoS, DNS</td><td className="px-3 py-2">Request metadata</td><td className="px-3 py-2">Global</td></tr>
                  <tr><td className="px-3 py-2">Groq</td><td className="px-3 py-2">LLM inference (hosted key)</td><td className="px-3 py-2">Chat messages</td><td className="px-3 py-2">USA</td></tr>
                  <tr><td className="px-3 py-2">Stripe</td><td className="px-3 py-2">Card payments</td><td className="px-3 py-2">Email, billing address, card token</td><td className="px-3 py-2">Ireland / USA</td></tr>
                  <tr><td className="px-3 py-2">Resend</td><td className="px-3 py-2">Transactional email</td><td className="px-3 py-2">Email address, email content</td><td className="px-3 py-2">EU / USA</td></tr>
                  <tr><td className="px-3 py-2">PostHog</td><td className="px-3 py-2">Product analytics (opt-in)</td><td className="px-3 py-2">Anonymized events, session IDs</td><td className="px-3 py-2">EU</td></tr>
                  <tr><td className="px-3 py-2">Sentry</td><td className="px-3 py-2">Error tracking</td><td className="px-3 py-2">Error stacks, user ID</td><td className="px-3 py-2">EU</td></tr>
                  <tr><td className="px-3 py-2">Helius / Jupiter</td><td className="px-3 py-2">Solana RPC / price feeds</td><td className="px-3 py-2">Wallet address, tx signature</td><td className="px-3 py-2">USA</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              International transfers to US-based sub-processors rely on the EU-US Data Privacy Framework and
              Standard Contractual Clauses (SCCs) where applicable. When you use BYOK (Bring Your Own Key),
              your LLM requests go directly to your chosen provider through our proxy; their privacy policies
              apply to those requests.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">7. Cookies &amp; Local Storage</h2>
            <p>
              We use essential cookies for authentication and optional cookies for analytics. Full details are in
              our{' '}
              <Link href="/cookies" className="text-[var(--color-accent)] hover:underline">Cookie Policy</Link>.
            </p>
            <p className="mt-3 text-[13px] text-[var(--text-muted)]">
              We do not use advertising cookies or participate in cross-site tracking networks.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">8. Data Retention</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li><strong className="text-[var(--text-primary)]">Account data</strong> — for the lifetime of your account; deleted within 30 days of account deletion.</li>
              <li><strong className="text-[var(--text-primary)]">Chat history &amp; agent configs</strong> — until you delete them or the agent is removed.</li>
              <li><strong className="text-[var(--text-primary)]">Payment records &amp; invoices</strong> — 7 years minimum (Romanian Fiscal Code &amp; EU accounting directive).</li>
              <li><strong className="text-[var(--text-primary)]">Server &amp; access logs</strong> — 90 days then purged.</li>
              <li><strong className="text-[var(--text-primary)]">Backups</strong> — rotated on a 30-day cycle.</li>
              <li><strong className="text-[var(--text-primary)]">Anonymized analytics</strong> — retained indefinitely for aggregate trend analysis.</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">9. Your Rights (GDPR)</h2>
            <p>If you are in the EU/EEA, UK, or Switzerland you have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li><strong>Access</strong> — request a copy of the data we hold about you (Art. 15).</li>
              <li><strong>Rectification</strong> — correct inaccurate data (Art. 16). Most fields are self-service in Settings.</li>
              <li><strong>Erasure</strong> — &ldquo;right to be forgotten&rdquo; (Art. 17); delete your account from Settings.</li>
              <li><strong>Restriction</strong> — ask us to limit processing while a complaint is reviewed (Art. 18).</li>
              <li><strong>Portability</strong> — machine-readable export of configs + chat history (Art. 20). Available from Settings → Export data.</li>
              <li><strong>Objection</strong> — opt out of non-essential analytics or marketing (Art. 21).</li>
              <li><strong>Withdraw consent</strong> — for anything we process with your consent (Art. 7(3)).</li>
              <li><strong>Not be subject to automated decision-making</strong> — we do not make automated decisions with legal effect about you (Art. 22).</li>
            </ul>
            <p className="mt-3">
              Exercise any of these rights by emailing{' '}
              <a href="mailto:contact@hatcher.host" className="text-[var(--color-accent)] hover:underline">contact@hatcher.host</a>.
              We respond within 30 days (extendable by 60 days for complex requests, per GDPR).
            </p>
            <p className="mt-3 text-[13px] text-[var(--text-muted)]">
              You also have the right to lodge a complaint with your local data protection authority. In Romania that
              is the{' '}
              <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">
                ANSPDCP
              </a>.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">10. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for individuals under 18. We do not knowingly collect data from children.
              If you believe a minor has provided us with personal data, contact{' '}
              <a href="mailto:contact@hatcher.host" className="text-[var(--color-accent)] hover:underline">contact@hatcher.host</a>{' '}
              and we will delete the account and associated data promptly.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">11. International Transfers</h2>
            <p>
              Primary data storage is in Germany (EU/EEA). Certain sub-processors (Groq, Stripe, Helius) are US-based.
              Transfers outside the EU/EEA rely on the EU-US Data Privacy Framework and/or Standard Contractual
              Clauses as approved by the European Commission.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">12. Changes to This Policy</h2>
            <p>
              We may update this Policy. Material changes (scope of processing, new sub-processors affecting EU users,
              retention changes) will be announced by email at least 14 days before taking effect. The &ldquo;Last
              updated&rdquo; date above always reflects the current version.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">13. Contact</h2>
            <ul className="mt-3 space-y-1.5">
              <li>All inquiries (privacy, support, general): <a href="mailto:contact@hatcher.host" className="text-[var(--color-accent)] hover:underline">contact@hatcher.host</a></li>
              <li>Legal notice: <Link href="/impressum" className="text-[var(--color-accent)] hover:underline">Impressum</Link></li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
