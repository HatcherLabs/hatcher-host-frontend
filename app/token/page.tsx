'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Rocket,
  Zap,
  CreditCard,
  Vote,
  Bell,
} from 'lucide-react';
import { SOCIAL_LINKS } from '@/lib/config';

/* ── Animation variants ─────────────────────────────────── */
const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

/* ── What the token will power ──────────────────────────── */
const PLANNED_USE_CASES = [
  {
    icon: Zap,
    title: 'Agent Features',
    description: 'Unlock premium platforms, skills, persistent memory, webhooks, and more for your AI agents.',
    color: '#f97316',
  },
  {
    icon: CreditCard,
    title: 'Platform Credits',
    description: 'Purchase hosted LLM credits to power your agents with premium models without managing API keys.',
    color: '#22D3EE',
  },
  {
    icon: Vote,
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
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full bg-gradient-to-br from-[#f97316]/12 via-[#f97316]/6 to-transparent blur-3xl" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] rounded-full bg-[#ea580c]/5 blur-3xl" />
          <div className="absolute -bottom-20 left-1/4 w-[300px] h-[300px] rounded-full bg-[#f97316]/4 blur-3xl" />
        </div>

        <motion.div
          className="mx-auto max-w-4xl"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#f97316]/25 bg-[#f97316]/8 text-[#f97316] text-sm font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Coming Soon
          </motion.div>

          <motion.div
            variants={scaleIn}
            className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center text-5xl mx-auto mb-8 shadow-[0_0_60px_rgba(249,115,22,0.35)]"
            style={{ animation: 'float 3s ease-in-out infinite' }}
          >
            &#x1F95A;
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-extrabold mb-5 tracking-tight">
            <span className="text-gradient">Platform</span>{' '}
            <span className="text-[var(--text-primary)]">Token</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg md:text-xl mb-6 max-w-2xl mx-auto leading-relaxed text-[var(--text-secondary)]">
            The native token of the Hatcher platform. It will power feature unlocks,
            hosted LLM credits, and platform governance on Solana.
          </motion.p>

          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1A1730] border border-[rgba(46,43,74,0.6)] text-[var(--text-secondary)] text-sm">
            <Bell className="w-4 h-4 text-[#f97316]" />
            Token launch has not happened yet. Stay tuned for announcements.
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link href="/create" className="btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2">
              Create Free Agent
              <Rocket className="w-4 h-4" />
            </Link>
            <Link href="/pricing" className="btn-secondary text-base px-8 py-3.5 inline-flex items-center gap-2">
              View Pricing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── PLANNED USE CASES ──────────────────────────────── */}
      <motion.section
        className="py-20 px-4"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="mx-auto max-w-6xl">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <div className="section-label mb-3">Planned Utility</div>
            <h2 className="text-4xl font-bold mb-4 text-[var(--text-primary)]">What the Token Will Power</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              When launched, the platform token will be the native currency of the Hatcher ecosystem.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANNED_USE_CASES.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  className="card glass-noise p-8 group"
                  variants={fadeUp}
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
      </motion.section>

      {/* ── KEY DETAILS ──────────────────────────────────────── */}
      <motion.section
        className="py-16 px-4"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="mx-auto max-w-4xl">
          <motion.div variants={fadeUp} className="card glass-noise p-8">
            <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Key Details</h2>
            <div className="grid gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-5 border-b border-[rgba(46,43,74,0.6)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Network</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#9945FF]" />
                  <span className="text-[var(--text-primary)] font-medium">Solana</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#9945FF]/10 text-[#9945FF] border border-[#9945FF]/20 font-medium">SPL Token</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-5 border-b border-[rgba(46,43,74,0.6)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Status</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-400 font-medium">Not Yet Launched</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-5 border-b border-[rgba(46,43,74,0.6)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Supply Model</span>
                <span className="text-[var(--text-primary)] font-medium">Details at launch</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Platform</span>
                <span className="text-[var(--text-primary)] font-medium">Free to use now with BYOK &mdash; token adds premium features</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── STAY UPDATED CTA ─────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-4xl">
          <motion.div
            className="relative rounded-3xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#f97316]/15 via-[#f97316]/10 to-[#ea580c]/10" />
            <div className="absolute inset-0 border border-[#f97316]/20 rounded-3xl" />
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-[#f97316]/10 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-[#f97316]/8 blur-3xl" />

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
          </motion.div>
        </div>
      </section>
    </div>
  );
}
