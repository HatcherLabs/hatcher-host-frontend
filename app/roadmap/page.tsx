import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Roadmap — Hatcher',
  description: 'Where Hatcher is headed. See what we shipped, what's launching this week, and what's coming next.',
};

type Status = 'done' | 'launching' | 'soon' | 'planned';

interface Item {
  text: string;
  note?: string;
}

interface Phase {
  period: string;
  status: Status;
  label: string;
  items: Item[];
}

const STATUS_CONFIG: Record<Status, { dot: string; badge: string; line: string }> = {
  done:      { dot: 'bg-emerald-400',          badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',   line: 'bg-emerald-500/30' },
  launching: { dot: 'bg-amber-400 animate-pulse', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',     line: 'bg-amber-500/30' },
  soon:      { dot: 'bg-purple-400',            badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',     line: 'bg-purple-500/20' },
  planned:   { dot: 'bg-[var(--text-muted)]',   badge: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-default)]', line: 'bg-[var(--border-default)]' },
};

const PHASES: Phase[] = [
  {
    period: 'Live now',
    status: 'done',
    label: 'BETA',
    items: [
      { text: '4 agent frameworks — OpenClaw, Hermes, ElizaOS, Milady' },
      { text: '20+ platform integrations — Telegram, Discord, Twitter/X, WhatsApp, Slack and more' },
      { text: 'BYOK — bring your own LLM key, 7 providers supported, always free' },
      { text: '$HATCHER token launched on Solana', note: 'CA: Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump' },
      { text: 'Free tier + Starter / Pro / Business + Founding Member ($99 lifetime)' },
      { text: 'SDK, CLI, Zapier, Make, GitHub Action' },
      { text: 'Teams, custom domains, agent versioning, workflow builder' },
      { text: 'Referral program — earn credits for every signup you bring' },
      { text: 'Embeddable chat widget — add your agent to any website' },
      { text: 'Full docs, live changelog, support tickets' },
    ],
  },
  {
    period: 'This week',
    status: 'launching',
    label: 'LAUNCHING',
    items: [
      { text: 'Official public launch — Product Hunt, Hacker News, X threads' },
      { text: 'Stripe live payments — pay with card in addition to SOL / HATCHER' },
      { text: 'Platform directory listings — AlternativeTo, There\'s An AI For That, Futurepedia and more' },
      { text: 'Signal integration — QR code pairing, encrypted messaging' },
      { text: 'Mobile app — iOS & Android (Capacitor-based)' },
      { text: 'Agent template gallery expansion — 30+ ready-to-deploy templates' },
    ],
  },
  {
    period: 'Next 2–4 weeks',
    status: 'soon',
    label: 'SOON',
    items: [
      { text: 'Agent Marketplace — browse, rent, and sell pre-configured agents' },
      { text: 'Scheduled agents — run agents on a cron schedule (daily reports, auto-posts, etc.)' },
      { text: 'Conversation analytics — sentiment, topics, drop-off, message volume over time' },
      { text: 'WhatsApp Business API — for higher volume use cases, no QR code required' },
      { text: 'More BYOK providers — Mistral, Cohere, Perplexity' },
      { text: 'Improved embeds — custom colors, position, avatar, trigger button' },
    ],
  },
  {
    period: 'Next 1–3 months',
    status: 'planned',
    label: 'PLANNED',
    items: [
      { text: 'Agent-to-Agent — one agent can call another, simple multi-agent pipelines' },
      { text: 'Token staking — stake HATCHER for subscription discounts and early access' },
      { text: 'No-code framework — deploy an agent from a prompt, no config required' },
      { text: 'Voice-first agents — native voice (Twilio / ElevenLabs), not just browser Speech API' },
      { text: 'Affiliate dashboard — dedicated panel for tracking referral revenue in HATCHER tokens' },
      { text: 'Public agent profiles — shareable pages for your agent with live chat embed' },
    ],
  },
  {
    period: 'Next 3–6 months',
    status: 'planned',
    label: 'FUTURE',
    items: [
      { text: 'Multi-agent orchestration — define pipelines where N agents collaborate with defined roles' },
      { text: 'Token governance — HATCHER holders vote on platform features and treasury allocation' },
      { text: 'Enterprise / White-label — run Hatcher on your own infra, under your own brand' },
      { text: 'Hatcher for Teams (B2B) — SSO, audit logs, granular role access, centralized billing' },
      { text: 'Agent App Store — community-certified skills and plugins with revenue sharing' },
      { text: 'API v2 — improved REST API with native webhooks, streaming, and batch operations' },
    ],
  },
];

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export default function RoadmapPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-20">

        {/* Header */}
        <div className="mb-14">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              LAUNCHING THIS WEEK
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] mb-3" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            Roadmap
          </h1>
          <p className="text-[var(--text-secondary)] text-base leading-relaxed">
            What we've built, what's shipping now, and where we're headed.
            We build in public — follow along on{' '}
            <Link href="https://x.com/hatcherlabs" target="_blank" rel="noopener noreferrer" className="text-[var(--text-primary)] underline underline-offset-2 hover:text-[#06b6d4] transition-colors">
              X&nbsp;/@hatcherlabs
            </Link>
            {' '}or check the{' '}
            <Link href="/changelog" className="text-[var(--text-primary)] underline underline-offset-2 hover:text-[#06b6d4] transition-colors">
              live changelog
            </Link>
            .
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-12">
          {PHASES.map((phase, i) => {
            const cfg = STATUS_CONFIG[phase.status];
            const isDone = phase.status === 'done';
            const isLaunching = phase.status === 'launching';

            return (
              <div key={i} className="relative flex gap-5">
                {/* Left column: dot + line */}
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${cfg.dot}`} />
                  {i < PHASES.length - 1 && (
                    <div className={`w-px flex-1 mt-2 min-h-[2rem] ${cfg.line}`} />
                  )}
                </div>

                {/* Right column: content */}
                <div className="flex-1 pb-2">
                  {/* Period + badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-semibold tracking-[0.10em] uppercase text-[var(--text-muted)]">
                      {phase.period}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg.badge}`}>
                      {isLaunching && <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />}
                      {phase.label}
                    </span>
                  </div>

                  {/* Items */}
                  <ul className="space-y-2.5">
                    {phase.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <span className={isDone ? 'text-emerald-400' : 'text-[var(--text-muted)]'}>
                          {isDone ? <CheckIcon /> : <CircleIcon />}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-sm leading-snug ${isDone ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                            {item.text}
                          </p>
                          {item.note && (
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-14 pt-8 border-t border-[var(--border-default)]">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Have a feature request? We read everything.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/support"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
            >
              Submit a request
            </Link>
            <Link
              href="https://x.com/hatcherlabs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
            >
              Follow on X
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
