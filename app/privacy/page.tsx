import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Hatcher',
  description: 'Privacy Policy for the Hatcher AI agent hosting platform.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-3" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--text-muted)]">Last updated: March 30, 2026</p>
        </div>

        <div className="prose-custom space-y-10 text-[var(--text-secondary)] text-[15px] leading-relaxed">
          <p>
            HatcherLabs (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the Hatcher platform at{' '}
            <a href="https://hatcher.host" className="text-cyan-400 hover:underline">hatcher.host</a>.
            This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our Service.
          </p>

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">1. Information We Collect</h2>
            <p>We collect the following types of information:</p>

            <h3 className="text-base font-medium text-[var(--text-primary)] mt-4 mb-2">Account Information</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Email address and username (required for registration)</li>
              <li>Password (stored as a bcrypt hash &mdash; we never store plaintext passwords)</li>
              <li>Solana wallet address (optional, provided for payment purposes only)</li>
            </ul>

            <h3 className="text-base font-medium text-[var(--text-primary)] mt-4 mb-2">Agent Data</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Agent configurations, including names, descriptions, prompts, and settings</li>
              <li>Chat history between you and your agents (stored in PostgreSQL)</li>
              <li>Files uploaded to or created within agent workspaces</li>
              <li>Agent activity logs and performance metrics</li>
            </ul>

            <h3 className="text-base font-medium text-[var(--text-primary)] mt-4 mb-2">Usage Data</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>IP address, browser type, and device information</li>
              <li>Pages visited, features used, and session duration</li>
              <li>API usage patterns and message counts</li>
            </ul>

            <h3 className="text-base font-medium text-[var(--text-primary)] mt-4 mb-2">Payment Information</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Transaction signatures for on-chain payments (SOL, $HATCHER)</li>
              <li>Stripe processes card payments &mdash; we do not store card numbers</li>
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li>Provide, maintain, and improve the Hatcher platform</li>
              <li>Authenticate your identity and manage your account</li>
              <li>Process payments and manage subscriptions</li>
              <li>Enforce usage limits and tier restrictions</li>
              <li>Send transactional emails (account confirmation, password resets, billing)</li>
              <li>Monitor platform health, detect abuse, and prevent fraud</li>
              <li>Analyze usage patterns to improve the Service (in aggregate, anonymized form)</li>
              <li>Respond to support requests and communicate with you about the Service</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal information to third parties. We do not use your agent configurations or chat data to train AI models.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">3. Data Storage &amp; Security</h2>
            <p>
              Your data is stored in a PostgreSQL database on our infrastructure. We implement the following security measures:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li>Passwords are hashed using bcrypt before storage</li>
              <li>API keys and sensitive credentials are encrypted using AES-256-GCM</li>
              <li>All traffic is encrypted in transit via TLS (HTTPS)</li>
              <li>Cloudflare provides DDoS protection and edge security</li>
              <li>Agent containers run with non-root users, resource limits, and network isolation</li>
              <li>Database access is restricted to the application server only</li>
            </ul>
            <p className="mt-3">
              While we take reasonable precautions to protect your data, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">4. Third-Party Services</h2>
            <p>
              We use the following third-party services that may process your data:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li><strong>Groq</strong> &mdash; LLM inference for agent responses (when using our hosted key). Chat messages are sent to Groq for processing.</li>
              <li><strong>Stripe</strong> &mdash; Payment processing for USD transactions. Stripe&apos;s privacy policy governs payment data.</li>
              <li><strong>PostHog</strong> &mdash; Product analytics to understand how users interact with the platform. Data is anonymized where possible.</li>
              <li><strong>Cloudflare</strong> &mdash; CDN, DDoS protection, and DNS. Cloudflare processes request metadata.</li>
              <li><strong>Resend</strong> &mdash; Transactional email delivery (from noreply@hatcher.host). Email addresses are shared for delivery.</li>
            </ul>
            <p className="mt-3">
              When you use BYOK (Bring Your Own Key), your LLM requests go directly to your chosen provider through our proxy, and their respective privacy policies apply.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">5. Cookies &amp; Tracking</h2>
            <p>We use the following client-side storage mechanisms:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li><strong>localStorage</strong> &mdash; Stores your JWT authentication token for session persistence. This is essential for the Service to function.</li>
              <li><strong>PostHog analytics</strong> &mdash; Uses cookies and local storage to track anonymous usage patterns, page views, and feature adoption.</li>
            </ul>
            <p className="mt-3">
              We do not use advertising cookies or trackers. We do not participate in cross-site tracking networks.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">6. Data Retention</h2>
            <p>We retain your data as follows:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li><strong>Account data</strong> &mdash; Retained for the duration of your account. Deleted within 30 days of account deletion.</li>
              <li><strong>Chat history</strong> &mdash; Retained for the duration of your account. You may request deletion of specific conversations.</li>
              <li><strong>Agent configurations</strong> &mdash; Retained until you delete the agent or your account.</li>
              <li><strong>Payment records</strong> &mdash; Retained for a minimum of 7 years for legal and accounting purposes.</li>
              <li><strong>Server logs</strong> &mdash; Retained for 90 days for debugging and security purposes, then automatically purged.</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5">
              <li><strong>Access</strong> your personal data &mdash; Request a copy of the data we hold about you.</li>
              <li><strong>Correct</strong> inaccurate data &mdash; Update your email, username, or other account information.</li>
              <li><strong>Delete</strong> your data &mdash; Request account deletion and removal of all associated data.</li>
              <li><strong>Export</strong> your data &mdash; Request a machine-readable export of your agent configurations and chat history.</li>
              <li><strong>Object</strong> to processing &mdash; Opt out of non-essential analytics tracking.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:support@hatcher.host" className="text-cyan-400 hover:underline">support@hatcher.host</a>.
              We will respond to your request within 30 days.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">8. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected data from a child under 18, we will take steps to delete that information promptly.
            </p>
            <p className="mt-3">
              If you believe that a child under 18 has provided us with personal information, please contact us at{' '}
              <a href="mailto:support@hatcher.host" className="text-cyan-400 hover:underline">support@hatcher.host</a>.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">9. International Data Transfers</h2>
            <p>
              Our servers are located in specific geographic regions. If you access the Service from outside the country where our servers are located, your data may be transferred across international borders.
            </p>
            <p className="mt-3">
              By using the Service, you consent to the transfer of your information to our servers and to the third-party services described in Section 4, which may be located in different jurisdictions. We take reasonable steps to ensure your data is treated securely and in accordance with this Privacy Policy.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated &ldquo;Last updated&rdquo; date. Material changes will be communicated via email or a prominent notice on the platform.
            </p>
            <p className="mt-3">
              Your continued use of the Service after changes are posted constitutes acceptance of the revised Privacy Policy.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">11. Contact</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <ul className="mt-3 space-y-1.5">
              <li>Support: <a href="mailto:support@hatcher.host" className="text-cyan-400 hover:underline">support@hatcher.host</a></li>
              <li>General inquiries: <a href="mailto:contact@hatcher.host" className="text-cyan-400 hover:underline">contact@hatcher.host</a></li>
              <li>Discord: <a href="https://discord.gg/7tY3HjKjMc" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">discord.gg/7tY3HjKjMc</a></li>
              <li>Telegram: <a href="https://t.me/HatcherLabs" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">t.me/HatcherLabs</a></li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
