'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Hash,
  Phone,
  Slack,
  Twitter,
  ShieldAlert,
  Plug,
  Clock,
  DollarSign,
  Signal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Animation variants ─────────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ── Difficulty badge ────────────────────────────────────────────

function DifficultyBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    Easy: 'bg-green-500/10 text-green-400 border-green-500/20',
    Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Advanced: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border', styles[level])}>
      {level}
    </span>
  );
}

// ── Platform data ───────────────────────────────────────────────

const PLATFORMS = [
  {
    id: 'telegram',
    name: 'Telegram',
    icon: MessageCircle,
    color: '#26A5E4',
    difficulty: 'Easy',
    cost: 'Free',
    setupTime: '2 min',
    description: 'Connect your agent to Telegram using BotFather. The most popular integration for crypto communities.',
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: Hash,
    color: '#5865F2',
    difficulty: 'Easy',
    cost: 'Free',
    setupTime: '5 min',
    description: 'Add your agent to Discord servers with message content intents and slash commands.',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: Phone,
    color: '#25D366',
    difficulty: 'Medium',
    cost: 'Free (1K msgs/mo)',
    setupTime: '15 min',
    description: 'Connect via the WhatsApp Cloud API. Requires a Meta Business account and app setup.',
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: Slack,
    color: '#E01E5A',
    difficulty: 'Easy',
    cost: 'Free',
    setupTime: '5 min',
    description: 'Bring your agent into Slack workspaces with event subscriptions and bot token scopes.',
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    icon: Twitter,
    color: 'var(--text-primary)',
    difficulty: 'Advanced',
    cost: 'Pay-per-use',
    setupTime: '10 min',
    description: 'Post tweets and read mentions. Requires X Developer account with Pay-Per-Use credits.',
  },
  {
    id: 'signal',
    name: 'Signal',
    icon: Signal,
    color: '#3A76F0',
    difficulty: 'Advanced',
    cost: 'Free',
    setupTime: '30 min',
    description: 'Privacy-focused messaging via signal-cli. Requires a spare phone number and manual setup.',
  },
];

// ── Page ────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-5xl">

        {/* ── Back link ─────────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-8">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--color-accent)] transition-colors duration-200"
          >
            <ArrowLeft size={16} />
            Back to Docs
          </Link>
        </motion.div>

        {/* ── Hero ───────────────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-4 py-1.5 text-sm font-medium text-[var(--color-accent)]">
            <Plug className="h-4 w-4" />
            Integrations
          </div>
          <h1
            className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Platform Integrations
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--text-secondary)]">
            Connect your Hatcher agents to messaging platforms. Each guide walks you through
            setup from start to finish.
          </p>
        </motion.div>

        {/* ── Platform grid ──────────────────────────────────── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {PLATFORMS.map((platform) => {
            const Icon = platform.icon;
            return (
              <motion.div key={platform.id} variants={staggerItem}>
                <Link
                  href={`/docs/integrations/${platform.id}`}
                  className="group relative card glass-noise p-6 flex flex-col gap-4 transition-all duration-200 hover:border-[rgba(6,182,212,0.3)] hover:shadow-[0_0_24px_rgba(6,182,212,0.06)] block h-full"
                >
                  {/* Platform icon + name */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-105"
                      style={{ backgroundColor: `${platform.color}18` }}
                    >
                      <Icon size={22} style={{ color: platform.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                        {platform.name}
                      </h3>
                      <DifficultyBadge level={platform.difficulty} />
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
                    {platform.description}
                  </p>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} />
                      {platform.setupTime}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <DollarSign size={12} />
                      {platform.cost}
                    </span>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent)]/70 group-hover:text-[var(--color-accent)] transition-colors">
                    View guide
                    <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Info callout ───────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mt-10">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 backdrop-blur-xl">
            <ShieldAlert size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Platform changes in 2025-2026</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Several platforms have made significant API changes recently. Twitter/X moved to pay-per-use pricing (Jan 2026),
                Slack deprecated legacy bots (March 2025), and WhatsApp discontinued On-Premises API (Oct 2025).
                Each guide reflects the latest requirements.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Help CTA ───────────────────────────────────────── */}
        <motion.div variants={cardVariants} className="mt-8">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 text-center backdrop-blur-xl">
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Need help with the API? Check out the full endpoint reference.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/docs/api"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent)]/20 transition-all duration-200 hover:bg-[#0891b2] hover:shadow-[var(--color-accent)]/30"
              >
                API Reference
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--color-accent)]/30 hover:text-[var(--text-primary)]"
              >
                All Documentation
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
