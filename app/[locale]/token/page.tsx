'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import NextImage from 'next/image';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { ArrowRight, CheckCircle, CreditCard, Database, Rocket, ShieldCheck, Users, Zap } from 'lucide-react';
import { SOCIAL_LINKS } from '@/lib/config';
import { TokenBurnTracker } from '@/components/token/TokenBurnTracker';

const CA = 'Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump';

type UseCase = {
  icon: typeof Zap;
  title: string;
  description: string;
  linkHref?: string;
  linkLabel?: string;
};

const PLANNED_USE_CASES: UseCase[] = [
  {
    icon: Zap,
    title: 'Subscriptions & Extras',
    description: 'Use $HATCHER for eligible subscriptions and extra agent slots where token checkout is enabled. Prices remain USD-denominated.',
    linkHref: '/pricing',
    linkLabel: 'See plans & extras',
  },
  {
    icon: CreditCard,
    title: 'Payment Option',
    description: 'Card, SOL, USDC, $HATCHER, and $KAUSA sit behind one billing surface with transparent totals before checkout.',
  },
  {
    icon: Users,
    title: 'Future Governance',
    description: 'Governance can be added carefully for eligible platform decisions without turning billing into speculation.',
  },
];

export default function TokenPage() {
  const t = useTranslations('token');

  return (
    <MarketingShell>
      <div className="bg-[var(--bg-base)] text-[var(--text-primary)]">
        {/* ── HERO ───────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-4 py-20 md:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-live)]" aria-hidden />
                {t('liveLabel')}
              </p>

              <div className="mb-7 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-1 shadow-[var(--shadow-soft)]">
                  <NextImage
                    src="/img/hatcher_logo.png"
                    alt="Hatcher logo"
                    width={64}
                    height={64}
                    priority
                    className="h-full w-full rounded-lg object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">Hatcher utility token</p>
                  <h1 className="text-5xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] md:text-7xl">
                    {t('heading')}
                  </h1>
                </div>
              </div>

              <p className="max-w-2xl text-base leading-7 text-[var(--text-secondary)] md:text-lg">
                {t('subheading')}
              </p>

              <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">{t('networkLabel')}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-info)]" aria-hidden />
                    {t('networkValue')} · {t('splToken')}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">{t('statusLabel')}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                    <CheckCircle size={15} className="text-[var(--color-success)]" aria-hidden />
                    {t('statusValue')}
                  </div>
                </div>
              </div>

              <div className="mt-5 max-w-2xl rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                  <Database size={14} aria-hidden />
                  {t('contractLabel')}
                </div>
                <code className="block select-all break-all text-xs text-[var(--text-primary)]">
                  {CA}
                </code>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                  <a
                    href={`https://dexscreener.com/solana/${CA}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:text-[var(--accent-hover)]"
                  >
                    {t('viewDexscreener')}
                  </a>
                  <a
                    href={`https://solscan.io/token/${CA}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:text-[var(--accent-hover)]"
                  >
                    {t('viewSolscan')}
                  </a>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/create"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--action)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--action-hover)]"
                >
                  {t('createAgentCta')}
                  <Rocket size={15} aria-hidden />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
                >
                  {t('viewPricing')}
                  <ArrowRight size={15} aria-hidden />
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-muted)]">Billing utility</p>
                  <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">$HATCHER checkout</h2>
                </div>
                <span className="rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-success)]">
                  Utility
                </span>
              </div>

              <div className="space-y-3">
                {[
                  ['Subscription tier', 'USD price shown before payment'],
                  ['Payment rail', 'Card, SOL, USDC, $HATCHER, or $KAUSA'],
                  ['Burn mechanic', t('burnBadge')],
                  ['AI Credits', 'Hosted usage remains metered separately from BYOK'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-4">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">{label}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-primary)]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-lg border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
                <div className="mb-2 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  <ShieldCheck size={15} className="text-[var(--color-info)]" aria-hidden />
                  Clear billing first
                </div>
                Hatcher shows plan costs, extras, and token settlement details before paid actions are confirmed.
              </div>
            </div>
          </div>
        </section>

        <TokenBurnTracker />

        {/* ── PLANNED USE CASES ──────────────────────────────── */}
        <section className="py-16 px-4 border-t border-[var(--border-default)]">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">
                {t('plannedUtilityLabel')}
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] mb-4 text-[var(--text-primary)]">
                {t('whatPowers')}
              </h2>
              <p className="text-[var(--text-secondary)] max-w-lg mx-auto text-sm">
                {t('ecosystemDesc')}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {PLANNED_USE_CASES.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="group flex flex-col gap-3 p-6 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
                  >
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)] flex-shrink-0">
                      <Icon size={18} />
                    </span>
                    <h3 className="font-semibold text-base text-[var(--text-primary)]">
                      {item.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                    {item.linkHref && item.linkLabel && (
                      <Link
                        href={item.linkHref}
                        className="mt-auto pt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors self-start"
                      >
                        {item.linkLabel}
                        <ArrowRight size={12} />
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── KEY DETAILS ──────────────────────────────────────── */}
        <section className="py-16 px-4 border-t border-[var(--border-default)]">
          <div className="mx-auto max-w-3xl">
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 sm:p-8 shadow-[var(--shadow-soft)]">
              <h2 className="text-xl md:text-2xl font-semibold tracking-[-0.02em] mb-6 text-[var(--text-primary)]">
                {t('keyDetails')}
              </h2>
              <dl className="grid gap-0">
                <DetailRow label={t('networkLabel')}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" aria-hidden />
                  <span className="text-[var(--text-primary)]">{t('networkValue')}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md border font-semibold"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-accent)',
                      borderColor: 'var(--color-accent-border)',
                      background: 'var(--color-accent-bg)',
                    }}
                  >
                    {t('splToken')}
                  </span>
                </DetailRow>
                <DetailRow label={t('statusLabel')}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" aria-hidden />
                  <span className="text-[var(--text-primary)] font-medium">{t('statusValue')}</span>
                </DetailRow>
                <DetailRow label={t('contractLabel')}>
                  <code
                    className="text-[var(--text-primary)] text-[11px] select-all break-all"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {CA}
                  </code>
                </DetailRow>
                <DetailRow label={t('platformLabel')} last>
                  <span className="text-[var(--text-primary)]">{t('platformValue')}</span>
                </DetailRow>
              </dl>
            </div>
          </div>
        </section>

        {/* ── STAY UPDATED CTA ─────────────────────────────────── */}
        <section className="py-20 px-4 border-t border-[var(--border-default)]">
          <div className="mx-auto max-w-3xl">
            <div className="relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-8 sm:p-14 text-center overflow-hidden shadow-[var(--shadow-soft)]">
              <div className="relative">
                <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.04em] mb-4 text-[var(--text-primary)]">
                  {t('stayInLoop')}
                </h2>
                <p className="text-base mb-10 max-w-xl mx-auto text-[var(--text-secondary)]">
                  {t('stayInLoopBody')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/create"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg bg-[var(--action)] text-white text-sm font-semibold transition-colors hover:bg-[var(--action-hover)]"
                  >
                    {t('createAgentCta')}
                    <Rocket size={14} />
                  </Link>
                  <a
                    href={SOCIAL_LINKS.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] text-sm font-semibold transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
                  >
                    {t('followOnX')}
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}

function DetailRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-4 ${last ? '' : 'border-b border-[var(--border-default)]'}`}
    >
      <span className="text-xs font-semibold text-[var(--text-muted)] w-40 flex-shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  );
}
