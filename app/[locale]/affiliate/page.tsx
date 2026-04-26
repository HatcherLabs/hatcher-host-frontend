// ============================================================
// /affiliate — public marketing page for the affiliate program
// ============================================================
// Server component for SEO (metadata export). The FAQ accordion
// is split into a small client sub-component so the rest of the
// page stays static-shippable — the meta description, hero copy,
// and program mechanics are the SEO target, not the toggles.
//
// Visual conventions mirror /pricing and /frameworks: editorial
// eyebrow + big headline, CSS-token colors, single accent, glass
// cards, lucide icons. No new tokens introduced.

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { buildLanguagesMap } from '@/lib/seo';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import {
  ArrowRight,
  Wallet,
  Coins,
  Sparkles,
  Crown,
  Rocket,
  Check,
  UserPlus,
  ShieldCheck,
  Share2,
  TrendingUp,
} from 'lucide-react';
import { AffiliateFAQ } from './faq-client';

export const metadata: Metadata = {
  title: 'Affiliate Program — Hatcher',
  description:
    'Earn up to 40% recurring commissions referring developers and AI builders to Hatcher. Pick cash, credits, or a hybrid split. Flat $20 bonus on every Founding Member signup.',
  alternates: {
    canonical: '/affiliate',
    languages: buildLanguagesMap('/affiliate'),
  },
  openGraph: {
    title: 'Affiliate Program — Hatcher',
    description:
      'Up to 40% recurring commissions. Cash, credits, or hybrid. Flat $20 on every Founding Member. Apply in minutes.',
    type: 'website',
  },
};

// ─── Payout mode cards ───────────────────────────────────────
// One flat structure so both the layout and the apply page can
// cross-reference the percentages without drifting. Typed explicitly
// so `highlighted` stays optional (TS narrows literal arrays otherwise).
type PayoutModeCard = {
  key: 'CASH_ONLY' | 'CREDITS_ONLY' | 'HYBRID';
  title: string;
  tagline: string;
  percent: string;
  payoutLabel: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
  highlighted?: boolean;
  tradeoff: string;
  bullets: string[];
};

const PAYOUT_MODES: readonly PayoutModeCard[] = [
  {
    key: 'CASH_ONLY',
    title: 'Cash Only',
    tagline: '20% recurring, paid out in SOL, USDC, or $HATCHER.',
    percent: '20%',
    payoutLabel: 'cash',
    icon: Wallet,
    accent: '#22c55e',
    tradeoff:
      'Lower headline rate, but money hits your wallet on the first monthly review. Ideal if you want revenue you can spend anywhere.',
    bullets: [
      'Pay out in SOL, USDC, or $HATCHER',
      'Monthly admin review',
      '30-day hold before each commission unlocks',
    ],
  },
  {
    key: 'CREDITS_ONLY',
    title: 'Credits Only',
    tagline: '40% recurring, paid as Hatcher platform credits.',
    percent: '40%',
    payoutLabel: 'credits',
    icon: Coins,
    accent: 'var(--color-accent)',
    highlighted: true,
    tradeoff:
      'Highest percentage. Credits spend 1:1 USD on any Hatcher tier, addon, or hosted LLM usage — great if you deploy agents yourself.',
    bullets: [
      '1:1 USD spend across tiers, addons, LLM',
      'Applied automatically to your account balance',
      'No wallet, no on-chain friction',
    ],
  },
  {
    key: 'HYBRID',
    title: 'Hybrid',
    tagline: '15% cash + 25% credits on every eligible payment.',
    percent: '15% + 25%',
    payoutLabel: 'cash and credits',
    icon: Sparkles,
    accent: '#8b5cf6',
    tradeoff:
      'Best of both. Some cash to spend off-platform, some credits to stack with your own deployment usage. Recommended for active builders.',
    bullets: [
      '15% cash + 25% credits (40% total value)',
      'Cash paid to your Solana wallet',
      'Credits applied to your account',
    ],
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Apply',
    body: 'Tell us about your platform, audience, and how you\'ll share Hatcher. Pick a payout mode — you can change it later.',
    icon: UserPlus,
  },
  {
    step: '02',
    title: 'Get approved',
    body: 'Most applications are reviewed in 3–5 days. We look for real audiences, aligned content, and no obvious click-farm patterns.',
    icon: ShieldCheck,
  },
  {
    step: '03',
    title: 'Share your link',
    body: 'Once approved you get a 6-char referral code and a share link. Anyone who signs up through it is permanently attributed to you.',
    icon: Share2,
  },
  {
    step: '04',
    title: 'Earn for life',
    body: 'Every paid tier, addon, or Founding Member purchase your referrals make accrues a commission. Payouts reviewed monthly.',
    icon: TrendingUp,
  },
];

export default async function AffiliatePage() {
  const t = await getTranslations('affiliate');

  return (
    <MarketingShell>
      <div className="mx-auto max-w-7xl px-4 pt-12 sm:pt-16 pb-20">
        {/* ── HERO ────────────────────────────────────────────── */}
        <section className="mb-16">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {t('eyebrow')}
          </p>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-5 text-[var(--text-primary)] max-w-3xl"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            {t('heading')}
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            {t('subheading')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/affiliate/apply"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {t('applyNowCta')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5"
            >
              {t('howItWorksLink')}
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

        {/* ── PAYOUT MODES ───────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {t('pickYourPayout')}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] max-w-2xl">
              {t('threeWays')}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl">
              {t('threeWaysSubheading')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PAYOUT_MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <div
                  key={mode.key}
                  className={`relative rounded-xl p-6 flex flex-col ${
                    mode.highlighted
                      ? 'border-2 border-[var(--color-accent)] bg-[var(--bg-card)]'
                      : 'border border-[var(--border-default)] bg-[var(--bg-card)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: `color-mix(in oklab, ${mode.accent} 15%, transparent)`,
                        border: `1px solid color-mix(in oklab, ${mode.accent} 25%, transparent)`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: mode.accent }} />
                    </div>
                    {mode.highlighted && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">
                        {t('popularLabel')}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{mode.title}</h3>
                  <div className="mb-3">
                    <span
                      className="text-3xl font-bold tabular-nums"
                      style={{ color: mode.accent }}
                    >
                      {mode.percent}
                    </span>
                    <span className="ml-1.5 text-sm text-[var(--text-muted)]">{mode.payoutLabel}</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">
                    {mode.tradeoff}
                  </p>
                  <ul className="space-y-2 mt-auto">
                    {mode.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                      >
                        <Check
                          className="w-4 h-4 mt-0.5 flex-shrink-0"
                          style={{ color: mode.accent }}
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FOUNDING MEMBER BONUS ──────────────────────────── */}
        <section className="mb-20">
          <div className="card glass-noise p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[radial-gradient(circle,rgba(225,29,72,0.08),transparent_70%)] pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(225,29,72,0.12)',
                  border: '1px solid rgba(225,29,72,0.25)',
                }}
              >
                <Crown className="w-7 h-7 text-[#e11d48]" />
              </div>
              <div className="flex-1">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e11d48]">
                  {t('foundingBonusLabel')}
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">
                  {t('foundingBonusHeading')}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                  {t('foundingBonusBody')}
                </p>
              </div>
              <Link
                href="/affiliate/apply"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
              >
                {t('applyLabel')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────────── */}
        <section id="how-it-works" className="mb-20 scroll-mt-20">
          <div className="mb-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {t('howItWorksLabel')}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              {t('fourSteps')}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/40 p-5 hover:border-[var(--border-hover)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--text-muted)]">
                      {item.step}
                    </span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: 'color-mix(in oklab, var(--color-accent) 12%, transparent)',
                      }}
                    >
                      <Icon className="w-4 h-4 text-[var(--color-accent)]" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 text-center">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {t('faqLabel')}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              {t('everythingYoudAsk')}
            </h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <AffiliateFAQ />
          </div>
        </section>

        {/* ── FINAL CTA ──────────────────────────────────────── */}
        <section>
          <div className="card glass-noise p-10 sm:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.08),transparent_60%)] pointer-events-none" />
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 relative text-[var(--text-primary)]">
              {t('readyHeading')}
            </h2>
            <p className="text-[var(--text-secondary)] text-base max-w-lg mx-auto mb-8 leading-relaxed relative">
              {t('readyBody')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 relative">
              <Link
                href="/affiliate/apply"
                className="btn-primary px-10 py-4 text-base font-bold inline-flex items-center gap-2"
              >
                <Rocket className="w-5 h-5" />
                {t('applyNowCta')}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {t('seePricing')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
