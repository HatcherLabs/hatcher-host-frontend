'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Rocket,
  Zap,
  CreditCard,
  Bell,
  Users,
} from 'lucide-react';
import { SOCIAL_LINKS } from '@/lib/config';

/* ── Animation helpers ──────────────────────────────────── */
const fadeUpTransition = { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const };

/* ── What the token will power ──────────────────────────── */
const PLANNED_USE_CASES = [
  {
    icon: Zap,
    title: 'Subscriptions & Add-ons',
    description: 'Subscribe to Starter ($4.99/mo), Pro ($14.99/mo), or Business ($39.99/mo) tiers. Purchase agent add-ons to scale your fleet.',
    color: '#06b6d4',
  },
  {
    icon: CreditCard,
    title: 'Token Economy',
    description: 'Prices listed in USD. Pay with SOL or platform tokens at live rates.',
    color: '#22D3EE',
  },
  {
    icon: Users,
    title: 'Governance',
    description: 'Participate in platform governance decisions, vote on new features, and shape the future roadmap.',
    color: '#A78BFA',
  },
];

/* ── Page ──────────────────────────────────────────────── */
export default function TokenPage() {
  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative py-28 md:py-36 px-4 text-center">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full bg-gradient-to-br from-[#06b6d4]/12 via-[#06b6d4]/6 to-transparent blur-3xl" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] rounded-full bg-[#0891b2]/5 blur-3xl" />
          <div className="absolute -bottom-20 left-1/4 w-[300px] h-[300px] rounded-full bg-[#06b6d4]/4 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={fadeUpTransition}
            className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#06b6d4]/25 bg-[#06b6d4]/8 text-[#06b6d4] text-sm font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Coming Soon
          </motion.div>

          <div
            className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#06b6d4] to-[#0891b2] flex items-center justify-center text-5xl mx-auto mb-8 shadow-[0_0_60px_rgba(6,182,212,0.35)]"
            style={{ animation: 'float 3s ease-in-out infinite' }}
          >
            &#x1F95A;
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...fadeUpTransition, delay: 0.06 }}
            className="text-5xl md:text-7xl font-extrabold mb-5 tracking-tight"
          >
            <span className="text-[var(--text-primary)]">Platform</span>{' '}
            <span className="text-[var(--text-primary)]">Token</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...fadeUpTransition, delay: 0.12 }}
            className="text-lg md:text-xl mb-6 max-w-2xl mx-auto leading-relaxed text-[var(--text-secondary)]"
          >
            The native token of the Hatcher platform. It will power tier subscriptions,
            agent add-ons, and platform governance on Solana.
          </motion.p>

          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] text-sm">
            <Bell className="w-4 h-4 text-[#06b6d4]" />
            Token launch has not happened yet. Stay tuned for announcements.
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link href="/create" className="btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2">
              Create Free Agent
              <Rocket className="w-4 h-4" />
            </Link>
            <Link href="/pricing" className="btn-secondary text-base px-8 py-3.5 inline-flex items-center gap-2">
              View Pricing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── PLANNED USE CASES ──────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="section-label mb-3">Planned Utility</div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3 }}
              className="text-4xl font-bold mb-4 text-[var(--text-primary)]"
            >
              What the Token Will Power
            </motion.h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              When launched, the platform token will be the native currency of the Hatcher ecosystem.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANNED_USE_CASES.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  className="card glass-noise p-8 group"
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: item.color + '15', border: `1px solid ${item.color}25` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: item.color }} />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-[var(--text-primary)]">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── KEY DETAILS ──────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="card glass-noise p-8">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold mb-6 text-[var(--text-primary)]"
            >
              Key Details
            </motion.h2>
            <div className="grid gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-5 border-b border-[var(--border-default)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Network</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#9945FF]" />
                  <span className="text-[var(--text-primary)] font-medium">Solana</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#9945FF]/10 text-[#9945FF] border border-[#9945FF]/20 font-medium">SPL Token</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-5 border-b border-[var(--border-default)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Status</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-400 font-medium">Not Yet Launched</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-5 border-b border-[var(--border-default)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Supply Model</span>
                <span className="text-[var(--text-primary)] font-medium">Details at launch</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Platform</span>
                <span className="text-[var(--text-primary)] font-medium">Free tier available now &mdash; token enables paid tiers &amp; add-ons</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAY UPDATED CTA ─────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#06b6d4]/15 via-[#06b6d4]/10 to-[#0891b2]/10" />
            <div className="absolute inset-0 border border-[#06b6d4]/20 rounded-3xl" />
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-[#06b6d4]/10 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-[#06b6d4]/8 blur-3xl" />

            <div className="relative text-center px-8 py-16">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-[var(--text-primary)]">
                Stay in the Loop
              </h2>
              <p className="text-lg mb-10 max-w-xl mx-auto text-[var(--text-secondary)]">
                Follow us for token launch announcements. In the meantime, create your first agent for free.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="btn-primary text-base px-10 py-4 inline-flex items-center gap-2">
                  Create Free Agent
                  <Rocket className="w-5 h-5" />
                </Link>
                <a
                  href={SOCIAL_LINKS.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-base px-8 py-4 inline-flex items-center gap-2"
                >
                  Follow on X
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
