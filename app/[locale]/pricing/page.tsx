'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FOUNDING_MEMBER_MAX_SLOTS } from '@hatcher/shared';
import { Link } from '@/i18n/routing';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Crown,
  Gem,
  Globe,
  HelpCircle,
  MessageSquare,
  Plus,
  Rocket,
  Shield,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';

/* ── Tier definitions ────────────────────────────────────── */

interface TierDef {
  key: string;
  name: string;
  price: number;
  icon: React.ReactNode;
  accent: string;
  badge?: string;
  highlighted?: boolean;
}

const TIERS_META: TierDef[] = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    icon: <Rocket className="w-5 h-5" />,
    accent: '#22c55e',
  },
  {
    key: 'starter',
    name: 'Starter',
    price: 6.99,
    icon: <Zap className="w-5 h-5" />,
    accent: 'var(--color-accent)',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 19.99,
    icon: <Crown className="w-5 h-5" />,
    accent: '#8b5cf6',
    highlighted: true,
  },
  {
    key: 'business',
    name: 'Business',
    price: 49.99,
    icon: <Building2 className="w-5 h-5" />,
    accent: '#f59e0b',
  },
  {
    key: 'founding_member',
    name: 'Founding Member',
    price: 99,
    icon: <Gem className="w-5 h-5" />,
    accent: '#e11d48',
  },
];

/* ── Add-on group keys (for messages lookup) ─────────────── */

const ADDON_GROUP_KEYS = ['extraAgents', 'extraMessages', 'extraSearches', 'perAgent'] as const;
type AddonGroupKey = typeof ADDON_GROUP_KEYS[number];

/* The prices stay hardcoded (USD amounts, not translatable) */
const ADDON_PRICES: Record<AddonGroupKey, { price: string; isSubscription: boolean }[]> = {
  extraAgents:   [
    { price: '$2.99',  isSubscription: true },
    { price: '$6.99',  isSubscription: true },
    { price: '$11.99', isSubscription: true },
    { price: '$19.99', isSubscription: true },
  ],
  extraMessages: [
    { price: '$1.99', isSubscription: true },
    { price: '$3.99', isSubscription: true },
    { price: '$5.99', isSubscription: true },
    { price: '$9.99', isSubscription: true },
  ],
  extraSearches: [
    { price: '$3.99', isSubscription: true },
    { price: '$6.99', isSubscription: true },
  ],
  perAgent: [
    { price: '$7.99', isSubscription: true  },
    { price: '$4.99', isSubscription: false },
    { price: '$2.99', isSubscription: true  },
    { price: '$5.99', isSubscription: true  },
  ],
};

/* ── Page ─────────────────────────────────────────────────── */
export default function PricingPage() {
  const t = useTranslations('pricing');
  const tTiers = useTranslations('shared.tiers');
  const [isAnnual, setIsAnnual] = useState(false);
  // Founding Member availability — fetched from /features (public).
  // null = still loading; a number = actual remaining slots.
  const [foundingRemaining, setFoundingRemaining] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getTiersCatalog();
        if (!cancelled && res.success) {
          setFoundingRemaining(res.data.founding.remaining);
        }
      } catch {
        // Silent — we just won't render the slots bar.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <MarketingShell>
      <div className="mx-auto max-w-7xl px-4 pt-12 sm:pt-16 pb-16 relative">
        {/* HERO */}
        <div className="mb-14">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]"
          >
            {t('eyebrow')}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-5 text-[var(--text-primary)] max-w-3xl"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            {t('heading')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed"
          >
            {t('subheading')}
          </motion.p>

          {/* Monthly / Annual toggle */}
          <div className="inline-flex items-center mt-8 p-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-default)]">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                'px-4 py-1.5 rounded text-[13px] font-semibold transition-colors',
                !isAnnual
                  ? 'bg-[var(--bg-base)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {t('billingToggle.monthly')}
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                'px-4 py-1.5 rounded text-[13px] font-semibold transition-colors flex items-center gap-1.5',
                isAnnual
                  ? 'bg-[var(--bg-base)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {t('billingToggle.annual')}
              <span className="text-[10px] font-semibold text-[var(--color-accent)]">{t('billingToggle.annualDiscount')}</span>
            </button>
          </div>
        </div>

        {/* TIER CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-20">
          {TIERS_META.map((tier) => {
            const isLifetime = tier.key === 'founding_member';
            const monthlyPrice = tier.price;
            const annualMonthlyPrice = monthlyPrice === 0 || isLifetime ? monthlyPrice : parseFloat((monthlyPrice * 0.85).toFixed(2));
            const displayPrice = isLifetime ? monthlyPrice : (isAnnual ? annualMonthlyPrice : monthlyPrice);
            const annualTotal = isAnnual && monthlyPrice > 0 && !isLifetime ? parseFloat((annualMonthlyPrice * 12).toFixed(2)) : null;

            // Tier-specific translated strings
            const tierKey = tier.key as 'free' | 'starter' | 'pro' | 'business' | 'founding_member';
            const tierAgents   = t(`tiers.${tierKey}.agents`);
            const tierMessages = t(`tiers.${tierKey}.messages`);
            const tierCpu      = t(`tiers.${tierKey}.cpu`);
            const tierRam      = t(`tiers.${tierKey}.ram`);
            const tierStorage  = t(`tiers.${tierKey}.storage`);
            const tierSleep    = t(`tiers.${tierKey}.sleep`);
            // Features and missing as raw arrays via JSON
            const tierFeatures = t.raw(`tiers.${tierKey}.features`) as string[];
            const tierMissing  = t.raw(`tiers.${tierKey}.missing`) as string[];

            return (
              <motion.div
                key={tier.key}
                initial={{ y: 20 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4 }}
                className={cn(
                  'relative rounded-xl p-6 flex flex-col',
                  tier.highlighted
                    ? 'border-2 border-[var(--color-accent)] bg-[var(--bg-card)]'
                    : isLifetime
                      ? 'border border-[var(--color-accent)]/40 bg-[var(--bg-card)]'
                      : 'border border-[var(--border-default)] bg-[var(--bg-card)]/40'
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--text-muted)]">{tTiers(`${tier.key as 'free' | 'starter' | 'pro' | 'business' | 'founding_member'}.name`)}</p>
                  {tier.highlighted && <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">{t('tierBadges.popular')}</span>}
                  {isLifetime && <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">{t('tierBadges.limited')}</span>}
                </div>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${tier.key}-price-${isAnnual}`}
                        className="text-[32px] font-bold text-[var(--text-primary)] tabular-nums leading-none"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18 }}
                      >
                        {displayPrice === 0 ? '$0' : `$${displayPrice}`}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-sm text-[var(--text-muted)]">
                      {displayPrice === 0 ? t('priceUnit.perMonth') : isLifetime ? t('priceUnit.once') : t('priceUnit.perMonth')}
                    </span>
                  </div>
                  {annualTotal && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                      {t('annualSavings', { annualTotal, saved: (monthlyPrice * 12 - annualTotal).toFixed(2) })}
                    </p>
                  )}
                  {!isAnnual && monthlyPrice > 0 && !isLifetime && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-1.5">{t('switchToAnnual')}</p>
                  )}
                  {isLifetime && (
                    <p className="text-[11px] text-[var(--color-accent)] font-medium mt-1.5">{t('payOnce')}</p>
                  )}
                </div>

                {/* Founding availability */}
                {isLifetime && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-[var(--text-muted)]">{t('availability')}</span>
                      {foundingRemaining === null ? (
                        <span className="text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 border-2 border-[var(--text-muted)]/30 border-t-[var(--text-muted)] rounded-full animate-spin" />
                          {t('availabilityLoading')}
                        </span>
                      ) : (
                        <span className={cn(
                          'text-[11px] font-semibold tabular-nums',
                          foundingRemaining === 0 ? 'text-red-400'
                            : foundingRemaining <= 3 ? 'text-orange-400'
                            : 'text-[var(--text-primary)]'
                        )}>
                          {foundingRemaining === 0
                            ? t('soldOut')
                            : t('slotsLeft', { remaining: foundingRemaining, max: FOUNDING_MEMBER_MAX_SLOTS })}
                        </span>
                      )}
                    </div>
                    <div className="relative h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      {foundingRemaining === null ? (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--color-accent)]/40 to-transparent animate-[shimmer_1.4s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />
                      ) : (
                        <div className="absolute inset-y-0 left-0 bg-[var(--color-accent)] transition-all duration-700" style={{ width: `${((FOUNDING_MEMBER_MAX_SLOTS - foundingRemaining) / FOUNDING_MEMBER_MAX_SLOTS) * 100}%` }} />
                      )}
                    </div>
                  </div>
                )}

                {/* Features */}
                <div className="space-y-2 flex-1 mb-7">
                  <FeatureCheck color="var(--color-accent)">{tierAgents}</FeatureCheck>
                  <FeatureCheck color="var(--color-accent)">{tierMessages}</FeatureCheck>
                  <FeatureCheck color="var(--color-accent)">{tierCpu} / {tierRam}</FeatureCheck>
                  <FeatureCheck color="var(--color-accent)">{tierStorage}</FeatureCheck>
                  <FeatureCheck color="var(--color-accent)">{tierSleep}</FeatureCheck>
                  {tierFeatures.map((f) => (
                    <FeatureCheck key={f} color="var(--color-accent)">{f}</FeatureCheck>
                  ))}
                  {tierMissing.map((f) => (
                    <FeatureMissing key={f}>{f}</FeatureMissing>
                  ))}
                </div>

                {/* CTA */}
                <Link
                  href={tier.key === 'free' ? '/register' : `/dashboard/billing?upgrade=${tier.key}`}
                  className={cn(
                    'block text-center font-semibold px-5 py-2.5 rounded-md text-sm transition-opacity',
                    tier.highlighted || isLifetime
                      ? 'bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90'
                      : 'border border-[var(--border-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  )}
                >
                  {tier.key === 'free' ? t('tierCta.free') : t('tierCta.paid', { tierName: tTiers(`${tier.key as 'free' | 'starter' | 'pro' | 'business' | 'founding_member'}.name`) })}
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* ADD-ONS SECTION */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold mb-3 flex items-center justify-center gap-3"
            >
              <Plus className="w-6 h-6 text-[var(--accent)]" />
              <span className="text-[var(--text-primary)]">{t('addons.heading')}</span>
            </motion.h2>
            <p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto">
              {t('addons.subheading')}
            </p>
          </div>

          <div className="max-w-6xl mx-auto space-y-6">
            {ADDON_GROUP_KEYS.map((groupKey) => {
              const groupLabel = t(`addons.groups.${groupKey}.label`);
              const groupItems = t.raw(`addons.groups.${groupKey}.items`) as { name: string; period: string; description: string }[];
              const prices = ADDON_PRICES[groupKey];

              return (
                <div key={groupKey}>
                  <h3 className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3 text-center">
                    {groupLabel}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {groupItems.map((addon, idx) => {
                      const { price, isSubscription } = prices[idx];
                      const monthlyNum = parseFloat(price.replace('$', ''));
                      const annualMonthly = isSubscription && isAnnual ? parseFloat((monthlyNum * 0.85).toFixed(2)) : monthlyNum;
                      const displayPrice = isAnnual && isSubscription ? `$${annualMonthly}` : price;
                      return (
                        <motion.div
                          key={addon.name}
                          whileHover={{ y: -3 }}
                          transition={{ duration: 0.2 }}
                          className="card glass-noise p-4 text-center"
                        >
                          <h4 className="font-bold text-[var(--text-primary)] text-sm mb-2">{addon.name}</h4>
                          <div className="text-xl font-extrabold mb-0.5 text-[var(--text-primary)]">
                            {displayPrice}
                          </div>
                          <p className="text-[var(--text-muted)] text-[10px] mb-2 font-medium">
                            {addon.period}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            {addon.description}
                          </p>
                          {isAnnual && isSubscription && (
                            <p className="text-[10px] text-green-400 font-semibold mt-2">
                              {t('addons.annualDiscount')}
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* BYOK + INTEGRATIONS CALLOUT */}
        <section className="mb-20">
          <div className="card glass-noise p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,rgba(34,197,94,0.06),transparent_70%)] pointer-events-none" />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('integrations.heading')}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 rounded-full">
                  {t('integrations.badge')}
                </span>
              </div>
            </div>
            <p className="text-[var(--text-muted)] text-sm mb-4">
              {t('integrations.body')}
            </p>
            <p className="text-[var(--text-secondary)] text-sm font-medium p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]">
              {t('integrations.note')}
            </p>
          </div>
        </section>

        {/* COMPARE PLANS TABLE */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold mb-3 flex items-center justify-center gap-3"
            >
              <Shield className="w-6 h-6 text-[var(--accent)]" />
              <span className="text-[var(--text-primary)]">{t('compareTable.heading')}</span>
            </motion.h2>
            <p className="text-[var(--text-muted)] text-sm">{t('compareTable.subheading')}</p>
          </div>

          <div className="card glass-noise p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left px-2.5 py-3 sm:p-5 text-[var(--text-muted)] font-medium text-[10px] sm:text-xs uppercase tracking-wider">{t('compareTable.featureColumn')}</th>
                    <th className="text-center px-2 py-3 sm:p-5 text-green-400 font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">{tTiers('free.name')}</div>
                      <div className="text-sm sm:text-lg font-extrabold">$0</div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[var(--color-accent)] font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">{tTiers('starter.name')}</div>
                      <div className="text-sm sm:text-lg font-extrabold text-[var(--text-primary)]">$6.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">{t('priceUnit.perMonth')}</span></div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[#8b5cf6] font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">{tTiers('pro.name')}</div>
                      <div className="text-sm sm:text-lg font-extrabold text-[var(--text-primary)]">$19.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">{t('priceUnit.perMonth')}</span></div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[#f59e0b] font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">{tTiers('business.name')}</div>
                      <div className="text-sm sm:text-lg font-extrabold text-[var(--text-primary)]">$49.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">{t('priceUnit.perMonth')}</span></div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[#e11d48] font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">{tTiers('founding_member.name')}</div>
                      <div className="text-sm sm:text-lg font-extrabold text-[var(--text-primary)]">$99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">{t('compareTable.onceSuffix')}</span></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      { rowKey: 'agents',         free: '1',         starter: '1',         pro: '3',    business: '10',  founding: '10' },
                      { rowKey: 'messages',        free: '20',        starter: '50',        pro: '100',  business: '300', founding: '300' },
                      { rowKey: 'searches',        free: '3',         starter: '10',        pro: '50',   business: '200', founding: '200' },
                      { rowKey: 'byok',            free: 'unlimited', starter: 'unlimited', pro: 'unlimited', business: 'unlimited', founding: 'unlimited' },
                      { rowKey: 'cpuRam',          free: '0.5 / 1GB', starter: '1 / 1.5GB', pro: '1.5 / 2GB', business: '2 / 3GB', founding: '2 / 4GB' },
                      { rowKey: 'storage',         free: '50 MB',     starter: '150 MB',    pro: '500 MB', business: '1 GB', founding: '2 GB' },
                      { rowKey: 'autoSleep',       free: '1h',        starter: '4h',        pro: '12h',  business: 'alwaysOn', founding: 'alwaysOn' },
                      { rowKey: 'fileManager',     free: 'addon',     starter: 'addon',     pro: 'addon', business: true, founding: true },
                      { rowKey: 'fullLogs',        free: 'addon',     starter: 'addon',     pro: 'addon', business: true, founding: true },
                      { rowKey: 'teamCollab',      free: false,       starter: false,       pro: false,  business: true,  founding: true },
                      { rowKey: 'prioritySupport', free: false,       starter: false,       pro: false,  business: true,  founding: true },
                      { rowKey: 'plugins',         free: '3',         starter: '10',        pro: '25',   business: '50',  founding: '50' },
                      { rowKey: 'integrations',    free: true,        starter: true,        pro: true,   business: true,  founding: true },
                      { rowKey: 'byokKey',         free: true,        starter: true,        pro: true,   business: true,  founding: true },
                      { rowKey: 'defaultLlm',      free: 'llama4Scout', starter: 'llama4Scout', pro: 'llama4Scout', business: 'llama4Scout', founding: 'llama4Scout' },
                    ] as Array<{ rowKey: string; free: string | boolean; starter: string | boolean; pro: string | boolean; business: string | boolean; founding: string | boolean }>
                  ).map((row, i) => (
                    <tr
                      key={row.rowKey}
                      className={cn(
                        'border-b border-[var(--border-default)] transition-colors hover:bg-[var(--bg-card)]',
                        i % 2 === 0 && 'bg-[var(--bg-card)]'
                      )}
                    >
                      <td className="px-2.5 py-3 sm:p-4 text-[var(--text-secondary)] text-xs sm:text-sm">{t(`compareTable.rows.${row.rowKey}`)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.free, t)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.starter, t)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center bg-[#8b5cf6]/[0.03]">{renderCell(row.pro, t)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.business, t)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center bg-[#e11d48]/[0.03]">{renderCell(row.founding, t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold flex items-center justify-center gap-3"
            >
              <HelpCircle className="w-6 h-6 text-[var(--accent)]" />
              <span className="text-[var(--text-primary)]">{t('faq.heading')}</span>
            </motion.h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {(t.raw('faq.items') as { q: string; a: string }[]).map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* NEED HELP */}
        <div className="text-center mb-20">
          <p className="text-[var(--text-muted)] text-sm">
            {t('help.text')}{' '}
            <a href="mailto:support@hatcher.host" className="text-[var(--accent)] hover:underline font-medium">
              {t('help.emailLabel')}
            </a>
            {' '}{/* "or" — intentionally kept as a simple connector, not extracted */}or{' '}
            <a href="https://discord.gg/7tY3HjKjMc" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline font-medium">
              {t('help.discordLabel')}
            </a>
            {' '}or{' '}
            <a href="https://t.me/HatcherLabs" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline font-medium">
              {t('help.telegramLabel')}
            </a>
          </p>
        </div>

        {/* CTA BANNER */}
        <div className="card glass-noise p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--accent-glow),transparent_60%)] pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 relative text-[var(--text-primary)]">
            {t('cta.heading')}
          </h2>
          <p className="text-[var(--text-secondary)] text-base max-w-lg mx-auto mb-8 leading-relaxed relative">
            {t('cta.body')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 relative">
            <Link href="/create" className="btn-primary px-10 py-4 text-base font-bold">
              <Rocket className="w-5 h-5" />
              {t('cta.createAgent')}
            </Link>
            <Link
              href="/frameworks"
              className="inline-flex items-center gap-2 px-6 py-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {t('cta.seeFrameworks')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* FOOTER NOTE */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-10 max-w-xl mx-auto leading-relaxed">
          {t('footerNote')}
        </p>
      </div>
    </MarketingShell>
  );
}

/* ── renderCell ──────────────────────────────────────────── */

type TranslationFn = ReturnType<typeof useTranslations<'pricing'>>;

function renderCell(value: string | boolean, t: TranslationFn) {
  if (value === true)  return <Check className="w-4 h-4 text-green-400 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-[var(--text-muted)] opacity-40 mx-auto" />;
  // Special token strings mapped to translated values
  if (value === 'unlimited')   return <span className="text-[var(--text-secondary)] text-xs font-medium">{t('compareTable.values.unlimited')}</span>;
  if (value === 'alwaysOn')    return <span className="text-[var(--text-secondary)] text-xs font-medium">{t('compareTable.values.alwaysOn')}</span>;
  if (value === 'addon')       return <span className="text-[var(--text-secondary)] text-xs font-medium">{t('compareTable.values.addon')}</span>;
  if (value === 'llama4Scout') return <span className="text-[var(--text-secondary)] text-xs font-medium">{t('compareTable.values.llama4Scout')}</span>;
  return <span className="text-[var(--text-secondary)] text-xs font-medium">{value}</span>;
}

/* ── Helper components ───────────────────────────────────── */

function FeatureCheck({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: color + '15', border: `1px solid ${color}25` }}
      >
        <Check className="w-3 h-3" style={{ color }} />
      </div>
      <span>{children}</span>
    </div>
  );
}

function FeatureMissing({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-[var(--text-muted)]">
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-white/5">
        <X className="w-3 h-3 text-[var(--text-muted)] opacity-50" />
      </div>
      <span>{children}</span>
    </div>
  );
}

/* ── FAQ Accordion ───────────────────────────────────────── */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        'card glass-noise overflow-hidden transition-all duration-200',
        open && 'border-[var(--border-hover)] shadow-[0_0_20px_var(--accent-glow)]'
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left group"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] pr-4 group-hover:text-[var(--accent)] transition-colors">{q}</span>
        <div
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
            open ? 'bg-[var(--accent)]/15' : 'bg-[var(--bg-card)]'
          )}
        >
          <ChevronDown className={cn('w-4 h-4 transition-all duration-200', open ? 'text-[var(--accent)] rotate-180' : 'text-[var(--text-muted)]')} />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--border-hover)] to-transparent mb-4" />
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
