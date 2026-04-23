'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import NextImage from 'next/image';
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
type UseCase = {
  icon: typeof Zap;
  title: string;
  description: string;
  color: string;
  linkHref?: string;
  linkLabel?: string;
};

const PLANNED_USE_CASES: UseCase[] = [
  {
    icon: Zap,
    title: 'Subscriptions & Add-ons',
    description: 'Pay for any subscription tier or agent add-on directly with $HATCHER. Prices settled at live rates on-chain.',
    color: 'var(--color-accent)',
    linkHref: '/pricing',
    linkLabel: 'See plans & add-ons',
  },
  {
    icon: CreditCard,
    title: 'Token Economy',
    description: 'Prices listed in USD. Pay with SOL or $HATCHER at live rates.',
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
  const t = useTranslations('token');
  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative py-28 md:py-36 px-4 text-center">
        {/* Single subtle background glow — toned down from 3-layer
            gradient stack to one restrained radial. */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-[var(--color-accent)]/8 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={fadeUpTransition}
            className="mb-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#14F195] inline-flex items-center gap-2 justify-center"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#14F195] animate-pulse" />
            {t('liveLabel')}
          </motion.p>

          {/* Token hero logo — Hatcher mascot cropped into a round coin
              shape so it reads as "token" rather than a rectangular
              artwork. Gradient border + soft cyan halo frame it. */}
          <div
            className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-8"
            style={{ animation: 'float 3s ease-in-out infinite' }}
          >
            <div
              aria-hidden="true"
              className="absolute -inset-2 rounded-full blur-2xl opacity-70"
              style={{
                background: 'radial-gradient(circle at center, rgba(6,182,212,0.55), rgba(139,92,246,0.35) 55%, transparent 75%)',
              }}
            />
            <div
              className="relative z-10 w-full h-full rounded-full p-[3px] shadow-[0_0_30px_rgba(6,182,212,0.45)]"
              style={{
                background: 'conic-gradient(from 140deg at 50% 50%, #8b5cf6 0deg, #06b6d4 140deg, #14f195 260deg, #8b5cf6 360deg)',
              }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden"
                style={{ background: '#0a0a14' }}
              >
                <NextImage
                  src="/hatcher-logo.png"
                  alt="$HATCHER token logo"
                  width={160}
                  height={160}
                  priority
                  className="w-full h-full object-cover scale-110"
                />
              </div>
            </div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...fadeUpTransition, delay: 0.06 }}
            className="text-5xl md:text-7xl font-bold mb-5 tracking-tight text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            {t('heading')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...fadeUpTransition, delay: 0.12 }}
            className="text-lg md:text-xl mb-6 max-w-2xl mx-auto leading-relaxed text-[var(--text-secondary)]"
          >
            {t('subheading')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...fadeUpTransition, delay: 0.18 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="px-5 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--solana-green)]/30 text-sm">
              <span className="text-[var(--text-muted)] mr-2">{t('caLabel')}</span>
              <code className="text-[var(--solana-green)] font-mono text-xs sm:text-sm select-all font-semibold">Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump</code>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs">
              <a
                href="https://dexscreener.com/solana/Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] hover:text-[#22d3ee] transition-colors underline underline-offset-2"
              >
                {t('viewDexscreener')}
              </a>
              {/* Thin vertical rule — previously a raw `|` glyph which
                  rendered lower than the surrounding text baseline on
                  small screens. A 1px element centers cleanly via flex. */}
              <span aria-hidden="true" className="block w-px h-3 bg-[var(--border-default)]" />
              <a
                href="https://solscan.io/token/Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] hover:text-[#22d3ee] transition-colors underline underline-offset-2"
              >
                {t('viewSolscan')}
              </a>
            </div>
          </motion.div>

          {/* Burn mechanic badge — visible on the hero so new visitors
              immediately see that the token isn't purely utility: 10% of
              every $HATCHER payment on the platform gets burned on-chain
              in the same signed transaction. Each subscription / addon
              purchase shrinks total supply by that percentage atomically. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...fadeUpTransition, delay: 0.22 }}
            className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/[0.08] text-[11px] font-medium text-[#f59e0b]"
          >
            <span className="text-sm">🔥</span>
            <span>{t('burnBadge')}</span>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link href="/create" className="btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2">
              {t('createAgentCta')}
              <Rocket className="w-4 h-4" />
            </Link>
            <Link href="/pricing" className="btn-secondary text-base px-8 py-3.5 inline-flex items-center gap-2 border-[var(--border-hover)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
              {t('viewPricing')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── PLANNED USE CASES ──────────────────────────────── */}
      <section className="py-12 sm:py-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="section-label mb-3">{t('plannedUtilityLabel')}</div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3 }}
              className="text-4xl font-bold mb-4 text-[var(--text-primary)]"
            >
              {t('whatPowers')}
            </motion.h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              {t('ecosystemDesc')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {PLANNED_USE_CASES.map((item) => {
              const Icon = item.icon;
              const { linkHref, linkLabel } = item;
              return (
                <motion.div
                  key={item.title}
                  className="card glass-noise p-8 group flex flex-col"
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
                  {linkHref && linkLabel && (
                    <Link
                      href={linkHref}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] hover:text-[#22d3ee] transition-colors self-start"
                    >
                      {linkLabel}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── KEY DETAILS ──────────────────────────────────────── */}
      <section className="py-12 sm:py-20 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="card glass-noise p-8">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold mb-6 text-[var(--text-primary)]"
            >
              {t('keyDetails')}
            </motion.h2>
            <div className="grid gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-5 border-b border-[var(--border-default)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">{t('networkLabel')}</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#9945FF]" />
                  <span className="text-[var(--text-primary)] font-medium">{t('networkValue')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#9945FF]/10 text-[#9945FF] border border-[#9945FF]/20 font-medium">{t('splToken')}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-5 border-b border-[var(--border-default)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">{t('statusLabel')}</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#14F195]" />
                  <span className="text-[#14F195] font-medium">{t('statusValue')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#14F195]/10 text-[#14F195] border border-[#14F195]/20 font-medium">{t('trading')}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-5 border-b border-[var(--border-default)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">{t('contractLabel')}</span>
                <code className="text-[var(--text-primary)] font-mono text-xs select-all">Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump</code>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">{t('platformLabel')}</span>
                <span className="text-[var(--text-primary)] font-medium">{t('platformValue')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAY UPDATED CTA ─────────────────────────────────── */}
      <section className="py-12 sm:py-20 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)]/15 via-[var(--color-accent)]/10 to-[#0891b2]/10" />
            <div className="absolute inset-0 border border-[var(--color-accent)]/20 rounded-3xl" />
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-[var(--color-accent)]/8 blur-3xl" />

            <div className="relative text-center px-8 py-16">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-[var(--text-primary)]">
                {t('stayInLoop')}
              </h2>
              <p className="text-lg mb-10 max-w-xl mx-auto text-[var(--text-secondary)]">
                {t('stayInLoopBody')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="btn-primary text-base px-10 py-4 inline-flex items-center gap-2">
                  {t('createAgentCta')}
                  <Rocket className="w-5 h-5" />
                </Link>
                <a
                  href={SOCIAL_LINKS.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-base px-8 py-4 inline-flex items-center gap-2"
                >
                  {t('followOnX')}
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
