'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import NextImage from 'next/image';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { ArrowRight, Rocket, Zap, CreditCard, Users } from 'lucide-react';
import { SOCIAL_LINKS } from '@/lib/config';

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
    title: 'Subscriptions & Add-ons',
    description: 'Pay for any subscription tier or agent add-on directly with $HATCHER. Prices settled at live rates on-chain.',
    linkHref: '/pricing',
    linkLabel: 'See plans & add-ons',
  },
  {
    icon: CreditCard,
    title: 'Token Economy',
    description: 'Prices listed in USD. Pay with SOL or $HATCHER at live rates.',
  },
  {
    icon: Users,
    title: 'Governance',
    description: 'Participate in platform governance decisions, vote on new features, and shape the future roadmap.',
  },
];

export default function TokenPage() {
  const t = useTranslations('token');

  return (
    <MarketingShell>
      <div className="bg-[var(--bg-base)] text-[var(--text-primary)]">
        {/* ── HERO ───────────────────────────────────────────── */}
        <section className="relative px-4 py-24 md:py-32 text-center overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full -z-10 opacity-50"
            style={{ background: 'radial-gradient(circle at center, var(--accent-glow), transparent 70%)' }}
          />

          <div className="mx-auto max-w-4xl">
            {/* Live label */}
            <p
              className="mb-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--accent)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              ▎ {t('liveLabel')}
            </p>

            {/* Token logo — square v3 frame */}
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 mx-auto mb-10">
              <div
                aria-hidden
                className="absolute -inset-3 rounded-[6px] blur-2xl opacity-60"
                style={{ background: 'radial-gradient(circle at center, var(--accent-glow), transparent 70%)' }}
              />
              <div className="relative z-10 w-full h-full rounded-[6px] p-[2px] bg-[var(--accent)] shadow-[0_0_24px_var(--accent-glow)]">
                <div className="w-full h-full rounded-[4px] overflow-hidden bg-[var(--bg-base)]">
                  <NextImage
                    src="/hatcher-logo.png"
                    alt="$HATCHER token logo"
                    width={160}
                    height={160}
                    priority
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <h1
              className="text-5xl md:text-7xl font-bold mb-5 tracking-tight"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t('heading')}
            </h1>

            <p className="text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed text-[var(--text-secondary)]">
              {t('subheading')}
            </p>

            {/* CA pill */}
            <div
              className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-[3px] bg-[var(--bg-elevated)] border border-[var(--border-default)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--text-muted)]">
                {t('caLabel')}
              </span>
              <code className="text-[var(--accent)] text-[11px] sm:text-xs select-all break-all">
                {CA}
              </code>
            </div>

            {/* External links */}
            <div
              className="flex items-center justify-center gap-3 mt-3 text-[11px] uppercase tracking-[0.08em] font-bold"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <a
                href={`https://dexscreener.com/solana/${CA}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors underline underline-offset-4 decoration-1"
              >
                {t('viewDexscreener')}
              </a>
              <span aria-hidden className="block w-px h-3 bg-[var(--border-default)]" />
              <a
                href={`https://solscan.io/token/${CA}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors underline underline-offset-4 decoration-1"
              >
                {t('viewSolscan')}
              </a>
            </div>

            {/* Burn badge */}
            <div
              className="mt-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-[3px] border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.08)] text-[11px] font-bold uppercase tracking-[0.06em] text-[#fbbf24]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <span aria-hidden>🔥</span>
              <span>{t('burnBadge')}</span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
              <Link
                href="/create"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-[3px] bg-[var(--accent)] text-[var(--bg-base)] text-[13px] font-bold uppercase tracking-[0.06em] transition-shadow hover:shadow-[0_0_20px_var(--accent-glow)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span aria-hidden>▎</span>
                {t('createAgentCta')}
                <Rocket size={14} />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-[3px] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] font-bold uppercase tracking-[0.06em] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[rgba(74,222,128,0.06)] transition-all"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {t('viewPricing')}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── PLANNED USE CASES ──────────────────────────────── */}
        <section className="py-16 px-4 border-t border-[var(--border-default)]">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <p
                className="text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] mb-3"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                ▎ {t('plannedUtilityLabel')}
              </p>
              <h2
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
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
                    className="group flex flex-col gap-3 p-6 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[4px] transition-all hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                  >
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-[3px] border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent)] flex-shrink-0">
                      <Icon size={18} />
                    </span>
                    <h3
                      className="font-bold text-base"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {item.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                    {item.linkHref && item.linkLabel && (
                      <Link
                        href={item.linkHref}
                        className="mt-auto pt-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.06em] font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors self-start"
                        style={{ fontFamily: 'var(--font-mono)' }}
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
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[4px] p-6 sm:p-8">
              <h2
                className="text-xl md:text-2xl font-bold mb-6"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                ▎ {t('keyDetails')}
              </h2>
              <dl className="grid gap-0">
                <DetailRow label={t('networkLabel')}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9945FF]" aria-hidden />
                  <span className="text-[var(--text-primary)]">{t('networkValue')}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-[3px] border uppercase font-bold tracking-[0.06em]"
                    style={{ fontFamily: 'var(--font-mono)', color: '#9945FF', borderColor: '#9945FF50', background: '#9945FF14' }}
                  >
                    {t('splToken')}
                  </span>
                </DetailRow>
                <DetailRow label={t('statusLabel')}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" aria-hidden />
                  <span className="text-[var(--accent)] font-medium">{t('statusValue')}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-[3px] border uppercase font-bold tracking-[0.06em] text-[var(--accent)] border-[rgba(74,222,128,0.4)] bg-[rgba(74,222,128,0.08)]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {t('trading')}
                  </span>
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
            <div className="relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[4px] p-8 sm:p-14 text-center overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-50 blur-3xl"
                style={{ background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)' }}
              />
              <div className="relative">
                <h2
                  className="text-3xl md:text-5xl font-bold mb-4"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {t('stayInLoop')}
                </h2>
                <p className="text-base mb-10 max-w-xl mx-auto text-[var(--text-secondary)]">
                  {t('stayInLoopBody')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/create"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-[3px] bg-[var(--accent)] text-[var(--bg-base)] text-[13px] font-bold uppercase tracking-[0.06em] transition-shadow hover:shadow-[0_0_20px_var(--accent-glow)]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    <span aria-hidden>▎</span>
                    {t('createAgentCta')}
                    <Rocket size={14} />
                  </Link>
                  <a
                    href={SOCIAL_LINKS.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-[3px] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] font-bold uppercase tracking-[0.06em] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[rgba(74,222,128,0.06)] transition-all"
                    style={{ fontFamily: 'var(--font-mono)' }}
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
      <span
        className="text-[10px] uppercase tracking-[0.16em] font-bold text-[var(--text-muted)] w-40 flex-shrink-0"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  );
}
