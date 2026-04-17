import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Hatcher',
  description:
    'Terms of Service for the Hatcher managed AI agent hosting platform — what you can and can\u2019t do, payment terms, liability, and EU consumer rights.',
};

const LAST_UPDATED = 'April 16, 2026';

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-12">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Legal</p>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-[var(--text-primary)] mb-4"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Terms of service
          </h1>
          <p className="text-sm text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose-custom space-y-10 text-[var(--text-secondary)] text-[15px] leading-relaxed">
          {/* Summary card */}
          <section className="card glass-noise p-5 sm:p-6 border-[#8b5cf6]/20">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">
              The short version
            </h2>
            <ul className="space-y-2 text-sm">
              <li>• You must be 18+ to use Hatcher.</li>
              <li>• You own your agent configs and chat history — we don&apos;t claim them.</li>
              <li>• You&apos;re fully responsible for what your agents say and do.</li>
              <li>• No refunds after 14 days of purchase; EU buyers keep statutory withdrawal rights (below).</li>
              <li>• We&apos;re a Romanian company; Romanian law governs these Terms.</li>
              <li>• Crypto trading = your own risk. Nothing here is financial advice.</li>
            </ul>
          </section>

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">1. Acceptance</h2>
            <p>
              These Terms form a legally binding contract between you and{' '}
              <strong className="text-[var(--text-primary)]">HHX Technology SRL</strong> (&ldquo;Hatcher,&rdquo;
              &ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;), a company registered in Romania (CUI: 45318471,
              Trade Register: J2021004947351), operating the platform at{' '}
              <a href="https://hatcher.host" className="text-[var(--color-accent)] hover:underline">hatcher.host</a>.
            </p>
            <p className="mt-3">
              By creating an account, subscribing to a plan, or otherwise using the Service you agree to these Terms
              and our{' '}
              <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">Privacy Policy</Link>.
              If you do not agree, do not use the Service.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">2. What the Service is</h2>
            <p>
              Hatcher is a managed hosting platform for open-source AI agent frameworks. You can deploy agents based
              on <strong className="text-[var(--text-primary)]">OpenClaw</strong>,{' '}
              <strong className="text-[var(--text-primary)]">Hermes</strong>,{' '}
              <strong className="text-[var(--text-primary)]">ElizaOS</strong>, or{' '}
              <strong className="text-[var(--text-primary)]">Milady</strong>, connect them to platforms (Telegram,
              Discord, X/Twitter, WhatsApp, Slack), and optionally provide your own API keys (BYOK) for LLM providers.
            </p>
            <p className="mt-3">
              We provide compute, container orchestration, storage, and optional LLM access via our hosted Groq key.
              You provide configuration, prompts, and any third-party tokens your agent needs.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">3. Account &amp; Eligibility</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>You must be at least <strong className="text-[var(--text-primary)]">18 years old</strong>.</li>
              <li>You must provide accurate registration info; one account per individual unless you&apos;re on a Team plan.</li>
              <li>You&apos;re responsible for keeping your password + API keys secret.</li>
              <li>Notify us immediately at{' '}
                <a href="mailto:contact@hatcher.host" className="text-[var(--color-accent)] hover:underline">contact@hatcher.host</a>{' '}
                if you suspect unauthorized access.
              </li>
              <li>Linking a Solana wallet is optional. We never see private keys or seed phrases.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">4. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li>Engage in illegal activity or facilitate it through your agents</li>
              <li>Distribute malware, spam, phishing, or CSAM</li>
              <li>Generate content that sexually depicts minors, incites violence, or violates applicable law</li>
              <li>Abuse resources — bypass tier limits, crash-loop containers, exploit shared infrastructure</li>
              <li>Scrape / harvest data from the Service or other users</li>
              <li>Impersonate others or engage in identity fraud</li>
              <li>Run market-manipulation, pump-and-dump, or wash-trading schemes via agent automations</li>
              <li>Attempt to gain unauthorized access to other accounts, containers, or our infrastructure</li>
              <li>Violate the terms of third-party platforms your agents connect to</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate these rules, with or without
              notice depending on severity. Severe violations (CSAM, targeted attacks, active fraud) trigger
              immediate termination and, where applicable, reporting to law enforcement.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">5. Your Agents, Your Responsibility</h2>
            <p>
              You are <strong className="text-[var(--text-primary)]">solely responsible</strong> for everything your
              agents do — messages posted on connected platforms, files created in their workspace, API calls they
              make, and on-chain transactions they sign with wallets you&apos;ve connected.
            </p>
            <p className="mt-3">
              We do not monitor agent output in real time and are not liable for harm, damages, or violations caused
              by agent behavior. If an agent you deployed is reported to us for abuse, we may suspend it while we
              investigate.
            </p>
            <p className="mt-3">
              You agree to promptly address any issues arising from your agents and to comply with the terms of any
              third-party platform they interact with.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">6. Intellectual Property</h2>
            <p>
              You retain ownership of your agent configurations, prompts, custom skills, and the content your agents
              generate. We do not claim rights to any of it and do not use it to train AI models.
            </p>
            <p className="mt-3">
              The Hatcher platform itself — its UI, backend code, branding, Docker images, and documentation — is
              our intellectual property and protected by copyright and trademark law. You may not copy, modify,
              resell, or mirror the platform.
            </p>
            <p className="mt-3">
              The open-source frameworks we host (OpenClaw, Hermes, ElizaOS, Milady) remain under their respective
              licenses.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">7. Payment Terms</h2>
            <p>
              Paid features are billed as one-time charges for a fixed period. Prices are listed in USD and payable in
              SOL, USDC, $HATCHER (on-chain), by credit/debit card via Stripe, or with HATCHER credits on your
              account. Crypto amounts are calculated at the live Jupiter rate at checkout time.
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-1.5">
              <li>
                <strong className="text-[var(--text-primary)]">Monthly plans</strong> grant 30 days of access from
                purchase. Renewals stack days on your current expiry.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Annual plans</strong> grant 365 days at a 15%
                discount vs. 12 × monthly.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Founding Member</strong> ($99) is a one-time lifetime
                tier; capped at 20 seats. Once sold out it&apos;s gone for good.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Add-ons</strong> stack with your tier — agent slots,
                message quotas, searches, per-agent utilities. Account-level subscription addons accumulate by count
                on each purchase.
              </li>
            </ul>
            <p className="mt-3">
              Upgrading from a lower tier mid-cycle refunds the unused portion of the old tier as HATCHER credits
              (applied automatically).
            </p>
            <p className="mt-3">
              VAT: prices are displayed exclusive of VAT where applicable. EU B2B buyers with a valid VAT ID receive
              a reverse-charge invoice. Romanian consumers pay the local VAT rate. On-chain crypto payments do not
              trigger VAT invoicing unless requested.
            </p>
            <p className="mt-3">
              We may change prices at any time. Changes apply only to future purchases; active subscriptions keep
              their current rate until their expiry. Price changes affecting renewals are communicated at least 30
              days in advance.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">8. Refunds &amp; EU Withdrawal</h2>
            <p>
              All sales are generally <strong className="text-[var(--text-primary)]">final</strong>. Because we
              deliver digital services immediately, the standard 14-day refund window does not apply once the Service
              is actively provided.
            </p>
            <p className="mt-3">
              <strong className="text-[var(--text-primary)]">EU consumers:</strong> under Directive 2011/83/EU, you
              normally have a 14-day right of withdrawal for distance contracts. By purchasing, you explicitly
              request and consent to the immediate start of the Service and acknowledge that you lose the right of
              withdrawal once the service has been fully performed. Unused and unconsumed purchases (e.g., founding
              member seat claimed but not activated within 14 days) remain refundable.
            </p>
            <p className="mt-3">
              If you believe you were charged in error, contact{' '}
              <a href="mailto:support@hatcher.host" className="text-[var(--color-accent)] hover:underline">support@hatcher.host</a>{' '}
              within 30 days. We handle refunds case-by-case; legitimate billing errors are always refunded in full
              to the original payment method.
            </p>
            <p className="mt-3">
              <strong className="text-[var(--text-primary)]">On-chain payments (SOL/USDC/$HATCHER)</strong> are
              technically non-reversible. We can issue refunds as HATCHER credits on your account, but we cannot
              refund crypto on-chain because the blockchain doesn&apos;t let us.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">9. Free Tier &amp; BYOK</h2>
            <p>
              The Free tier includes 1 agent, 20 messages/day (account-wide), 150 MB workspace, and auto-sleep after
              4 hours of inactivity. It&apos;s for evaluation and personal use.
            </p>
            <p className="mt-3">
              <strong className="text-[var(--text-primary)]">BYOK</strong> (Bring Your Own LLM Key — OpenAI,
              Anthropic, Groq, Google, etc.) bypasses our daily message limit entirely on every tier. Your requests
              go through our proxy directly to the provider, whose pricing and terms apply separately.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">10. Service Availability</h2>
            <p>
              The Service is provided on a &ldquo;best effort&rdquo; basis. We target high uptime but do not promise
              an SLA. Maintenance windows, network incidents, and upstream provider issues (Groq, Stripe, Cloudflare,
              Hetzner) can cause downtime.
            </p>
            <p className="mt-3">
              Paid plans receive priority support but no formal SLA credits at this time. We communicate scheduled
              maintenance through our Discord and status updates.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">11. Termination</h2>
            <p>
              You may delete your account at any time from{' '}
              <Link href="/dashboard/settings" className="text-[var(--color-accent)] hover:underline">Settings</Link>{' '}
              or by emailing support. Agents stop immediately; data is purged within 30 days (except billing records
              we&apos;re legally required to retain).
            </p>
            <p className="mt-3">
              We may suspend or terminate your account for Terms violations (Section 4), abusive behavior, or risk to
              other users / our infrastructure. Severe violations → immediate termination without notice. Non-severe
              → we&apos;ll try to reach you first.
            </p>
            <p className="mt-3">
              Upon termination, your right to use the Service ends. We don&apos;t refund pre-paid subscriptions in
              termination cases caused by your violations. Legitimate termination by us (e.g., we shut down the
              Service) → we refund the prorated unused portion.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">12. Disclaimers</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any
              kind, express or implied, including merchantability, fitness for a particular purpose, or
              non-infringement, to the fullest extent permitted by applicable law.
            </p>
            <p className="mt-3">
              We do not warrant that AI agent output is accurate, appropriate, safe, or suitable for any particular
              purpose. LLM-generated content can be wrong or harmful — review it before acting on it, especially for
              financial, medical, legal, or safety-critical decisions.
            </p>
            <p className="mt-3 text-[13px] text-[var(--text-muted)]">
              Nothing in these Terms limits liability that cannot be excluded under mandatory Romanian or EU law
              (gross negligence, wilful misconduct, death or personal injury, or mandatory consumer protections).
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">13. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, our total aggregate liability for all claims arising
              from or relating to the Service or these Terms is limited to the greater of:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li>the amount you paid us in the 12 months before the claim, or</li>
              <li>$50 USD.</li>
            </ul>
            <p className="mt-3">
              We are not liable for indirect, incidental, special, consequential, or punitive damages — loss of
              profits, data, reputation, goodwill, wallet drains, on-chain losses, or third-party platform bans —
              even if advised of the possibility.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">14. Indemnification</h2>
            <p>
              You agree to defend and hold us harmless against any third-party claim arising from your use of the
              Service, your agent&apos;s behavior, your breach of these Terms, or your violation of third-party rights.
              This includes reasonable legal fees.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">15. Governing Law &amp; Disputes</h2>
            <p>
              These Terms are governed by the laws of <strong className="text-[var(--text-primary)]">Romania</strong>,
              excluding conflict-of-laws rules. Disputes arising from or relating to the Service or these Terms are
              subject to the exclusive jurisdiction of the competent courts of Timișoara, Romania — except where
              mandatory consumer-protection law grants you the right to sue in your country of residence.
            </p>
            <p className="mt-3">
              EU consumers can also use the European Commission&apos;s{' '}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">
                Online Dispute Resolution (ODR) platform
              </a>{' '}
              to resolve disputes out of court. We are not obliged to participate in a specific consumer
              arbitration scheme.
            </p>
          </section>

          {/* 16 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">16. Changes to Terms</h2>
            <p>
              We may revise these Terms. Material changes affecting your rights or obligations will be announced by
              email at least 14 days before taking effect. Continued use after the effective date = acceptance of the
              new Terms. If you don&apos;t accept, stop using the Service and delete your account before the effective
              date.
            </p>
          </section>

          {/* 17 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">17. Miscellaneous</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li><strong>Severability:</strong> if a court finds part of these Terms unenforceable, the rest stays in force.</li>
              <li><strong>No waiver:</strong> our failure to enforce a provision is not a waiver.</li>
              <li><strong>Assignment:</strong> you can&apos;t transfer your account without our written consent. We may assign our rights on notice (e.g., in a merger or acquisition).</li>
              <li><strong>Entire agreement:</strong> these Terms + the Privacy Policy + any addon-specific terms = the full agreement.</li>
              <li><strong>Force majeure:</strong> we&apos;re not liable for delays caused by events outside our control (natural disasters, war, infrastructure failure upstream).</li>
            </ul>
          </section>

          {/* 18 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">18. Company &amp; Contact</h2>
            <ul className="mt-3 space-y-1.5">
              <li><strong className="text-[var(--text-primary)]">HHX Technology SRL</strong></li>
              <li>CUI: 45318471 · Trade Register: J2021004947351</li>
              <li>Timișoara, Timiș County, Romania</li>
            </ul>
            <p className="mt-4">Reach us at:</p>
            <ul className="mt-3 space-y-1.5">
              <li>All inquiries (support, legal, security, privacy): <a href="mailto:contact@hatcher.host" className="text-[var(--color-accent)] hover:underline">contact@hatcher.host</a></li>
              <li>Discord: <a href="https://discord.gg/7tY3HjKjMc" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">discord.gg/7tY3HjKjMc</a></li>
              <li>Legal notice: <Link href="/impressum" className="text-[var(--color-accent)] hover:underline">Impressum</Link></li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
