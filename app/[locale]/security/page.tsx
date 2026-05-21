import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import {
  AlertTriangle,
  ArrowRight,
  Database,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Network,
  Server,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security | Hatcher',
  description:
    'How Hatcher protects agent credentials, wallets, containers, network access, logs, and platform infrastructure.',
};

const LAST_UPDATED = 'May 21, 2026';

const SECURITY_LAYERS: Array<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: 'Encrypted secrets at rest',
    body:
      'API keys, integration tokens, custom environment variables, Nostr keys, and managed wallet keys are encrypted before storage using AES-256-GCM. Passwords are stored as bcrypt hashes.',
    icon: LockKeyhole,
  },
  {
    title: 'Just-in-time runtime access',
    body:
      'Secrets are decrypted only on trusted backend paths when an agent runtime, signing action, or owner-approved export needs them. Saved secrets are masked in the UI and not returned by normal read APIs.',
    icon: KeyRound,
  },
  {
    title: 'Isolated agent containers',
    body:
      'Agents run in dedicated containers with resource limits, read-only root filesystems where supported, writable tmpfs for runtime state, and no-new-privileges container hardening.',
    icon: Server,
  },
  {
    title: 'Network egress controls',
    body:
      'Agent web access and platform calls go through Hatcher-controlled endpoints. Private, loopback, link-local, and cloud metadata addresses are blocked for webhook-style URLs and internal network paths.',
    icon: Network,
  },
  {
    title: 'Provider key separation',
    body:
      'Hatcher provider keys for LLMs, billing, analytics, and partner integrations are not placed inside general agent containers. Agents use scoped platform endpoints instead of raw platform credentials.',
    icon: EyeOff,
  },
  {
    title: 'Owner-scoped wallets',
    body:
      'Managed agent wallets are scoped to the agent. Private key export requires owner authentication, and runtime signing is limited to wallet actions explicitly exposed by Hatcher.',
    icon: Wallet,
  },
];

const CREDENTIAL_FLOW = [
  'You enter a credential through the dashboard or API over HTTPS.',
  'The backend validates the request, encrypts the value with a server-held encryption key, and stores only ciphertext plus the nonce/authentication data needed for AES-256-GCM.',
  'Normal config reads return masked placeholders or stripped data, not the plaintext secret.',
  'When an agent starts or uses a managed platform action, the backend decrypts only the specific values needed for that agent and action.',
  'Logs and admin views pass through secret redaction so tokens, private keys, passwords, and credentials are not printed back by default.',
];

const CONTAINER_CONTROLS = [
  'Dedicated per-agent runtime boundary',
  'CPU, memory, and process limits',
  'Read-only root filesystem where the framework supports it',
  'Writable tmpfs for temporary runtime state',
  'No-new-privileges hardening',
  'No broad platform secrets in the agent environment',
  'Authenticated calls back to Hatcher platform APIs',
  'Egress diagnostics for owner-visible network decisions',
];

const BLAST_RADIUS = [
  {
    title: 'If an agent process is compromised',
    body:
      'The expected exposure is limited to that agent runtime, its workspace, its scoped runtime token, and any owner-provided secrets intentionally mounted for that agent.',
  },
  {
    title: 'If a container escape is suspected',
    body:
      'We treat it as a host compromise: isolate the host, rotate affected runtime tokens and provider keys, rebuild workloads on clean infrastructure, and notify affected users when required.',
  },
  {
    title: 'What should not be reachable',
    body:
      'A normal agent container should not contain database credentials, Stripe keys, Hatcher treasury keys, SSH keys, raw hosted LLM provider keys, or secrets belonging to other users or agents.',
  },
];

export default function SecurityPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Platform security
            </p>
            <h1
              className="text-4xl font-bold leading-[1.05] tracking-tight text-[var(--text-primary)] sm:text-5xl md:text-6xl"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              How Hatcher protects agents, credentials, and wallets
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              Hatcher runs autonomous agents on managed infrastructure. That means security is built around a simple
              principle: keep platform secrets out of agent runtimes, scope each agent tightly, and decrypt sensitive
              user data only when a trusted backend path needs it.
            </p>
            <p className="mt-4 text-sm text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
          </div>

          <div className="card glass-noise border-[var(--color-accent)]/20 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                <ShieldCheck size={20} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]">
                  Security posture
                </h2>
                <p className="text-sm text-[var(--text-muted)]">Defense in depth for hosted AI agents.</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              <li>Agent credentials are encrypted at rest and masked after save.</li>
              <li>Agent containers do not receive general Hatcher infrastructure secrets.</li>
              <li>Network access is routed through platform-controlled, auditable paths.</li>
              <li>Container escape is treated as low-likelihood but high-impact incident response.</li>
            </ul>
          </div>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY_LAYERS.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="card glass-noise p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--color-accent)]">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Credentials
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Where credentials live and how they are decrypted
            </h2>
            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
              Hatcher does not encrypt secrets with an individual container public key. Credentials are encrypted
              server-side before storage, and plaintext is only reconstructed by the trusted backend when the platform
              needs to start an agent, perform a scoped action, or complete an owner-authenticated private key export.
            </p>
          </div>

          <ol className="space-y-3">
            {CREDENTIAL_FLOW.map((item, index) => (
              <li key={item} className="flex gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/60 p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-accent)]/30 text-xs font-semibold text-[var(--color-accent)]">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-[var(--text-secondary)]">{item}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Runtime isolation
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Agent container controls
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Containers are still software, so Hatcher assumes compromise is possible and designs the runtime to
              reduce what any single agent can reach.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CONTAINER_CONTROLS.map((control) => (
              <div key={control} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/60 p-4 text-sm text-[var(--text-secondary)]">
                {control}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-4 lg:grid-cols-3">
          {BLAST_RADIUS.map((item) => (
            <article key={item.title} className="card glass-noise p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
                <AlertTriangle size={18} aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-2">
          <article className="card glass-noise p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3 text-[var(--color-accent)]">
              <Database size={20} aria-hidden="true" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Data and logs</h2>
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Sensitive fields are stripped or redacted from normal API responses and operational logs. We keep
              logs for debugging, abuse prevention, billing integrity, and reliability, but they are not a place for
              long-term secret storage. Agents are instructed not to write private keys, API keys, or raw credentials
              into memory files.
            </p>
          </article>

          <article className="card glass-noise p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3 text-[var(--color-accent)]">
              <Wallet size={20} aria-hidden="true" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Wallets and signing</h2>
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              Managed wallets are created per agent and encrypted server-side. Agents can only use wallet operations
              exposed by Hatcher runtime tools, and owner-visible private key export requires account password
              confirmation. Users remain responsible for funds they deposit into agent wallets.
            </p>
          </article>
        </section>

        <section className="mt-14 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/60 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Responsible disclosure
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Found a security issue?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Please send enough detail for us to reproduce the issue. Do not access or modify other users&apos;
                data, do not exfiltrate secrets, and do not disrupt the service while testing.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:contact@hatcher.host?subject=Security%20report"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Report an issue
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <Link
                href="/privacy"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--color-accent)]/40"
              >
                Privacy policy
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
