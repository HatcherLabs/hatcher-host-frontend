import { Link } from '@/i18n/routing';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  Coins,
  Cpu,
  FileText,
  GitBranch,
  LockKeyhole,
  Network,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

const TOKEN_ADDRESS = 'Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump';
const SOLSCAN_URL = `https://solscan.io/token/${TOKEN_ADDRESS}`;
const DEXSCREENER_URL = `https://dexscreener.com/solana/${TOKEN_ADDRESS}`;

const TABLE_OF_CONTENTS = [
  { id: 'summary', label: 'Executive summary' },
  { id: 'problem', label: 'Problem' },
  { id: 'platform', label: 'Platform' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'token', label: '$HATCHER token' },
  { id: 'utility', label: 'Token utility' },
  { id: 'credits', label: 'AI Credits' },
  { id: 'partners', label: 'Partner compute' },
  { id: 'developers', label: 'Developer workflows' },
  { id: 'security', label: 'Security model' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'legal', label: 'Legal notes' },
] as const;

const PRODUCT_POINTS = [
  'Agent creation and configuration',
  'OpenClaw and Hermes framework support',
  'Web chat, session history, and secure terminal access',
  '3D agent rooms and Hatcher City',
  'File manager, workspace storage, runtime logs, and monitoring',
  'Model selector, provider table, BYOK, and AI Credits',
  'Telegram, Discord, WhatsApp, Slack, X/Twitter, Nostr, and web integrations',
  'Solana, Base, and SKALE wallet surfaces',
  'Agent-to-agent communication and orchestration primitives',
  'Crypto payments through SOL, USDC, $HATCHER, and card',
] as const;

const ARCHITECTURE_LAYERS: Array<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: 'Agent runtime layer',
    body:
      'Each agent runs as a managed runtime with framework-specific setup, environment injection, secrets handling, health checks, logs, lifecycle controls, workspace persistence, skills, plugins, and secure dashboard access.',
    icon: Cpu,
  },
  {
    title: 'Control plane',
    body:
      'The control plane manages dashboards, model configuration, integrations, wallets, billing, AI Credits, usage tracking, schedules, workflows, logs, and team or admin controls.',
    icon: Boxes,
  },
  {
    title: 'Provider and tool layer',
    body:
      'Agents can access hosted model providers, partner compute, web tools, GitHub workflows, wallet tools, and user-owned credentials through Hatcher-managed routing and policy.',
    icon: Network,
  },
  {
    title: 'Ecosystem and token layer',
    body:
      '$HATCHER connects platform usage, on-chain payments, burns, future marketplace flows, governance experiments, and partner settlement into a Solana-native agent economy.',
    icon: Coins,
  },
] as const;

const TOKEN_UTILITY = [
  {
    title: 'Platform payments',
    body:
      'Users can pay for subscriptions, agent slots, and eligible platform extras using $HATCHER. Prices are listed in USD and converted at live rates at checkout.',
  },
  {
    title: 'AI Credit purchases',
    body:
      '$HATCHER can be used as a payment method for plans or top-ups that grant AI Credits. BYOK usage stays separate because users pay their provider directly.',
  },
  {
    title: 'Agent capacity',
    body:
      'Plans and add-ons control agent count, runtime resources, workspace limits, and AI Credit grants. Token payments can unlock eligible plan tiers and extra agent slots.',
  },
  {
    title: 'Burn mechanics',
    body:
      'When users pay Hatcher with $HATCHER, 10% of the token payment is designed to be burned on-chain in the same transaction and tracked publicly on the token page.',
  },
  {
    title: 'Future governance',
    body:
      'Hatcher may introduce governance that lets token holders signal or vote on ecosystem decisions once the product surface is mature enough for meaningful participation.',
  },
  {
    title: 'Marketplace economy',
    body:
      'Future marketplace flows may let users publish, rent, sell, or monetize agents, skills, templates, workflows, and services with $HATCHER as one supported settlement method.',
  },
] as const;

const PARTNER_COMPUTE = [
  {
    name: 'IDLE',
    body:
      'Hatcher agents can consume selected partner compute tasks, while running or idle agents can be registered as providers where appropriate.',
  },
  {
    name: 'KausaLayer',
    body:
      'Agents can access selected privacy wallet and MCP-style tools through Hatcher-managed or user-supplied keys.',
  },
] as const;

const SECURITY_POINTS = [
  'Secrets are encrypted before storage using AES-256-GCM.',
  'Passwords are stored as bcrypt hashes.',
  'Agent runtime tokens are scoped to the agent.',
  'Platform-managed secrets are protected from user environment variable override.',
  'Wallet private keys are not exposed to the browser.',
  'User-provided integration keys are mounted only where needed.',
  'Logs and admin views are designed to redact secrets.',
  'Runtime containers are isolated from each other and from the host by Docker boundaries and platform controls.',
] as const;

const ROADMAP_POINTS = [
  'More robust model presets and BYOK provider support',
  'Multi-agent orchestration and project rooms',
  'Agent marketplace',
  'More framework support',
  'Better mobile applications',
  'Agent-native developer tools',
  'Public agent profiles',
  'Token staking for access or discounts, subject to legal review',
  'Governance experiments',
  'Enterprise and white-label deployments',
  'Expanded partner compute integrations',
] as const;

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-[var(--border-default)] py-10">
      {eyebrow ? (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className="text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-3xl"
        style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
      >
        {title}
      </h2>
      <div className="mt-5 space-y-5 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">{children}</div>
    </section>
  );
}

function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
    >
      {children}
      <ArrowUpRight size={14} aria-hidden="true" />
    </a>
  );
}

export default function WhitepaperPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Product and ecosystem overview
            </p>
            <h1
              className="max-w-4xl text-4xl font-bold leading-[1.04] text-[var(--text-primary)] sm:text-5xl md:text-6xl"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Hatcher Whitepaper
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              Hatcher is a managed AI agent hosting platform for creating, configuring, deploying, monitoring, and
              operating autonomous agents. This whitepaper covers the platform, $HATCHER utility, AI Credits, partner
              compute, security model, and roadmap.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/token"
                className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--color-accent)]/35 bg-[var(--color-accent)]/10 px-4 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/15"
              >
                View token page
              </Link>
              <a
                href={SOLSCAN_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-card)]/70 px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--color-accent)]/35"
              >
                Solscan
              </a>
              <a
                href={DEXSCREENER_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-card)]/70 px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--color-accent)]/35"
              >
                Dexscreener
              </a>
            </div>
          </div>

          <aside className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/70 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                <FileText size={19} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Version</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">0.1 Draft · May 2026</p>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Token</dt>
                <dd className="mt-1 font-semibold text-[var(--text-primary)]">$HATCHER</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Network</dt>
                <dd className="mt-1 text-[var(--text-secondary)]">Solana · SPL / Token-2022</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Contract address</dt>
                <dd className="mt-1 break-all font-mono text-xs text-[var(--text-secondary)]">{TOKEN_ADDRESS}</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="mt-10 rounded-lg border border-amber-300/20 bg-amber-300/10 p-5 text-sm leading-6 text-amber-100/90">
          <p className="font-semibold text-amber-100">Important notice</p>
          <p className="mt-2">
            This document is an informational product and ecosystem overview. It is not an offer to sell securities, an
            investment prospectus, legal advice, tax advice, or financial advice. $HATCHER is described as an ecosystem
            token for platform utility, payment, access, and future governance functions inside the Hatcher ecosystem.
            No statement should be read as a promise of token price appreciation, profit, yield, or future market
            performance.
          </p>
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
          <nav className="hidden lg:block">
            <div className="sticky top-24 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/55 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                <BookOpen size={14} aria-hidden="true" />
                Contents
              </div>
              <ol className="space-y-2">
                {TABLE_OF_CONTENTS.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block rounded-md px-2 py-1.5 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <article className="min-w-0">
            <Section id="summary" eyebrow="Executive summary" title="Hatcher is the operating layer for AI agents">
              <p>
                Hatcher makes autonomous agents usable by founders, creators, developers, and teams without requiring
                them to run their own infrastructure. Users can create, configure, deploy, monitor, and operate agents
                through a hosted control panel, web chat, integrations, terminal access, workflows, and 3D agent rooms.
              </p>
              <p>
                The platform supports OpenClaw and Hermes agent frameworks, hosted model routing through providers such
                as UsePod, OpenRouter, and IDLE, Bring Your Own Key configurations, AI Credits for metered hosted usage,
                and integrations such as Telegram, Discord, WhatsApp, Slack, and X/Twitter.
              </p>
              <p>
                $HATCHER is the ecosystem token of Hatcher. It is a Solana SPL token designed to support platform
                payments, extra agent capacity, AI Credit purchases, subscription settlement, token-denominated
                discounts, burn mechanics, and future ecosystem governance.
              </p>
            </Section>

            <Section id="problem" eyebrow="The problem" title="Agent deployment is still fragmented">
              <p>
                AI agents are becoming more capable, but production deployment remains difficult. Teams have to combine
                framework setup, provider keys, secure credentials, logs, memory, files, terminals, schedules,
                monitoring, payment rails, and user-facing controls across many disconnected systems.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  'Framework setup is fragmented across repositories, Docker images, plugins, and providers.',
                  'Model usage is difficult to price, route, and monitor across providers.',
                  'Integrations require secure credential storage and runtime configuration.',
                  'Agents need memory, logs, files, terminals, schedules, and monitoring to move beyond demos.',
                  'Teams need durable workers, not one-off chat windows.',
                  'Crypto-native users need wallet-aware agents without exposing private keys.',
                ].map((item) => (
                  <li key={item} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/55 p-4">
                    {item}
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="platform" eyebrow="What Hatcher is building" title="From idea to live agent in minutes">
              <p>
                Hatcher is a platform for creating and operating hosted AI agents. The goal is to let a user go from
                idea to live agent quickly, then continuously improve that agent through configuration, skills, tools,
                integrations, model presets, workflows, and memory.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {PRODUCT_POINTS.map((point) => (
                  <div key={point} className="flex gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/55 p-4">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="architecture" eyebrow="Product architecture" title="Four layers of the Hatcher stack">
              <div className="grid gap-4 sm:grid-cols-2">
                {ARCHITECTURE_LAYERS.map((layer) => {
                  const Icon = layer.icon;
                  return (
                    <article key={layer.title} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/60 p-5">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                        <Icon size={18} aria-hidden="true" />
                      </div>
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">{layer.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{layer.body}</p>
                    </article>
                  );
                })}
              </div>
            </Section>

            <Section id="token" eyebrow="$HATCHER token" title="A utility token for the Hatcher platform">
              <p>
                $HATCHER is designed as a utility token for the Hatcher platform. Its initial role is to support
                payments and ecosystem alignment. Future roles may include governance, marketplace participation,
                staking-based access, and partner settlement mechanisms, subject to legal, technical, and product
                readiness.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/55 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Network</p>
                  <p className="mt-2 font-semibold text-[var(--text-primary)]">Solana</p>
                </div>
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/55 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Standard</p>
                  <p className="mt-2 font-semibold text-[var(--text-primary)]">SPL / Token-2022</p>
                </div>
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/55 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Explorer</p>
                  <p className="mt-2">
                    <TextLink href={SOLSCAN_URL}>View on Solscan</TextLink>
                  </p>
                </div>
              </div>
            </Section>

            <Section id="utility" eyebrow="Token utility" title="How $HATCHER fits into platform usage">
              <div className="grid gap-4 md:grid-cols-2">
                {TOKEN_UTILITY.map((item) => (
                  <article key={item.title} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/60 p-5">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                  </article>
                ))}
              </div>
            </Section>

            <Section id="credits" eyebrow="AI Credits" title="One metering unit across hosted usage">
              <p>
                AI Credits simplify usage metering across different model and tool providers. Hosted usage can include
                LLM inference, web search, compute tools, partner-provider calls, and selected model routes such as IDLE
                Haiku and Sonnet where available.
              </p>
              <p>
                AI Credits are not cash, stored value, or redeemable currency. They are a platform usage unit for hosted
                services.
              </p>
            </Section>

            <Section id="partners" eyebrow="Partner compute and provider economy" title="Agents as economic workers">
              <p>
                Hatcher is integrating with partner networks that let agents consume external compute and, in some
                cases, provide compute back to external networks. These integrations are intended to make agents
                economically active workers rather than static chatbots.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {PARTNER_COMPUTE.map((partner) => (
                  <article key={partner.name} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/60 p-5">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{partner.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{partner.body}</p>
                  </article>
                ))}
              </div>
            </Section>

            <Section id="developers" eyebrow="Developer workflows" title="Agents for software development loops">
              <p>
                Hatcher is expanding beyond consumer bots into developer-focused workflows. The long-term goal is for
                agents to participate in software development loops: reading issues, inspecting repositories, drafting
                pull requests, running tests, summarizing risk, and coordinating with other agents.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['Secure terminal sessions', LockKeyhole],
                  ['GitHub skill and credential mounting', GitBranch],
                  ['Agent-to-agent communication', Network],
                  ['CLI, SDK, GitHub Action, Zapier, and Make surfaces', FileText],
                ].map(([label, Icon]) => {
                  const TypedIcon = Icon as LucideIcon;
                  return (
                    <div key={label as string} className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/55 p-4">
                      <TypedIcon size={18} className="text-[var(--color-accent)]" aria-hidden="true" />
                      <span>{label as string}</span>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section id="security" eyebrow="Security model" title="Defense in depth for hosted agents">
              <p>
                Hatcher treats agent hosting as a security-sensitive environment. No hosted container platform can claim
                zero risk, so Hatcher's approach is to isolate workloads, limit secret exposure, encrypt at rest,
                minimize browser exposure, monitor runtime behavior, and rotate affected credentials if a compromise is
                suspected.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SECURITY_POINTS.map((point) => (
                  <div key={point} className="flex gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/55 p-4">
                    <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="roadmap" eyebrow="Roadmap" title="Directional areas Hatcher is building toward">
              <p>
                Hatcher is built in public and ships frequently. Roadmap items are directional and may change based on
                user demand, technical constraints, legal review, and partner readiness.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {ROADMAP_POINTS.map((point) => (
                  <div key={point} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/55 p-4">
                    {point}
                  </div>
                ))}
              </div>
            </Section>

            <Section id="legal" eyebrow="Legal and compliance" title="Utility first, no performance promises">
              <p>
                Hatcher will continue to evaluate token utility, governance, staking, rewards, and marketplace mechanics
                with legal and compliance constraints in mind. Features may be limited, delayed, modified, or unavailable
                in certain jurisdictions.
              </p>
              <p>
                This whitepaper should not be read as a guarantee that any planned token feature will launch in a
                specific form.
              </p>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]/60 p-5">
                <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
                  <Wallet size={18} className="text-[var(--color-accent)]" aria-hidden="true" />
                  Useful links
                </h3>
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <TextLink href="https://hatcher.host">Website</TextLink>
                  <TextLink href={SOLSCAN_URL}>Solscan</TextLink>
                  <TextLink href={DEXSCREENER_URL}>Dexscreener</TextLink>
                  <TextLink href="https://x.com/hatcherlabs">X</TextLink>
                  <TextLink href="https://github.com/HatcherLabs">GitHub</TextLink>
                </div>
              </div>
            </Section>
          </article>
        </div>
      </main>
    </MarketingShell>
  );
}
