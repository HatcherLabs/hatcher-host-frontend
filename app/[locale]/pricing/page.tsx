'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import { MarketingShell } from '@/components/marketing/v3/MarketingShell';
import { HatcherWalletModalProvider } from '@/components/providers/HatcherWalletModalProvider';
import { useAuth } from '@/lib/auth-context';
import { loginHrefForReturn } from '@/lib/safe-redirect';
import { CAPACITY_ADDONS } from '@/lib/capacity-addons';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Crown,
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
    accent: 'var(--color-accent)',
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
    accent: 'var(--color-accent)',
    highlighted: true,
  },
  {
    key: 'business',
    name: 'Business',
    price: 49.99,
    icon: <Building2 className="w-5 h-5" />,
    accent: '#6ea3f7',
  },
];

const AI_CREDITS_BY_TIER: Record<string, number> = {
  free: 500,
  starter: 3000,
  pro: 15000,
  business: 40000,
};

const HATCHER_PAYMENT_DISCOUNT_FACTOR = 0.9;
const DEEPSEEK_PROMO_END_MS = Date.parse('2026-08-18T14:00:00.000Z');
function priceForHatcherPayment(usdPrice: number): number {
  return Math.round(usdPrice * HATCHER_PAYMENT_DISCOUNT_FACTOR * 100) / 100;
}

function formatAiCredits(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/* ── Add-on group keys (for translation lookup) ──────────── */

const ADDON_GROUP_KEYS = ['aiCredits', 'extraAgents'] as const;
type AddonGroupKey = typeof ADDON_GROUP_KEYS[number];

/* The prices stay hardcoded (USD amounts, not translatable) */
const ADDON_PRICES: Record<AddonGroupKey, { price: string; isSubscription: boolean }[]> = {
  aiCredits: [
    { price: '$7',  isSubscription: false },
    { price: '$13', isSubscription: false },
    { price: '$30', isSubscription: false },
    { price: '$60', isSubscription: false },
  ],
  extraAgents:   [
    { price: '$2.99',  isSubscription: true },
    { price: '$6.99',  isSubscription: true },
    { price: '$11.99', isSubscription: true },
    { price: '$19.99', isSubscription: true },
  ],
};

/* ── Page ─────────────────────────────────────────────────── */
export default function PricingPage() {
  return (
    <HatcherWalletModalProvider
      description="Choose a wallet for HATCHER payments on Solana."
      eyebrow="Hatcher pricing"
    >
      <PricingPageContent />
    </HatcherWalletModalProvider>
  );
}

function PricingPageContent() {
  const t = useTranslations('pricing');
  const tBilling = useTranslations('dashboard.billing');
  const tTiers = useTranslations('shared.tiers');
  const tSharedAddons = useTranslations('shared.addons');
  const tCapacity = useTranslations('dashboard.agentDetail.capacity');
  const locale = useLocale();
  const { isAuthenticated } = useAuth();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const [isAnnual, setIsAnnual] = useState(false);
  const [deepSeekPromoActive, setDeepSeekPromoActive] = useState(false);
  useEffect(() => {
    setDeepSeekPromoActive(Date.now() < DEEPSEEK_PROMO_END_MS);
  }, []);
  return (
    <MarketingShell>
      <div className="mx-auto max-w-7xl px-4 pt-20 sm:pt-24 pb-20 relative">
        {/* HERO */}
        <div className="mb-12 max-w-4xl">
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-4 text-[12px] font-semibold text-[var(--text-muted)]"
          >
            {t('eyebrow')}
          </motion.p>
          <motion.h1
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-[-0.055em] leading-[0.96] mb-5 text-[var(--text-primary)] max-w-3xl"
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
          >
            {t('heading')}
          </motion.h1>
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-[330px] text-lg leading-relaxed text-[var(--text-secondary)] sm:max-w-2xl"
          >
            {t('subheading')}
          </motion.p>

          {/* Monthly / Annual toggle */}
          <div className="inline-flex items-center mt-8 p-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                'px-4 py-2 rounded-md text-[13px] font-semibold transition-colors',
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
                'px-4 py-2 rounded-md text-[13px] font-semibold transition-colors flex items-center gap-1.5',
                isAnnual
                  ? 'bg-[var(--bg-base)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {t('billingToggle.annual')}
              <span className="text-[10px] font-semibold text-[var(--color-accent)]">{t('billingToggle.annualDiscount')}</span>
            </button>
          </div>

          <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-3 py-2 text-xs font-medium text-[var(--color-warning)]">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>{t('hatcherDiscountBanner')}</span>
            <button
              className="rounded-md border border-[var(--color-warning-border)] bg-[var(--bg-card)] px-2.5 py-1 font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
              onClick={() => setWalletModalVisible(true)}
              type="button"
            >
              {tBilling('connectWallet')}
            </button>
          </div>
          {deepSeekPromoActive && (
            <div className="mt-4 max-w-3xl rounded-lg border border-[var(--color-accent-border)] bg-[var(--color-accent-bg)] px-4 py-3">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{t('deepseekPromo.title')}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{t('deepseekPromo.body')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TIER CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-20">
          {TIERS_META.map((tier) => {
            const monthlyPrice = tier.price;
            const annualMonthlyPrice = monthlyPrice === 0 ? monthlyPrice : parseFloat((monthlyPrice * 0.85).toFixed(2));
            const displayPrice = isAnnual ? annualMonthlyPrice : monthlyPrice;
            const annualTotal = isAnnual && monthlyPrice > 0 ? parseFloat((annualMonthlyPrice * 12).toFixed(2)) : null;
            const hatcherCharge = annualTotal ?? displayPrice;
            const hatcherPrice = priceForHatcherPayment(hatcherCharge);

            // Tier-specific translated strings
            const tierKey = tier.key as 'free' | 'starter' | 'pro' | 'business';
            const tierAgents   = t(`tiers.${tierKey}.agents`);
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
                  'relative rounded-lg p-6 flex flex-col',
                  tier.highlighted
                    ? 'border border-[var(--color-accent)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]'
                    : 'border border-[var(--border-default)] bg-[var(--bg-card)]/40'
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-[var(--text-muted)]">{tTiers(`${tier.key as 'free' | 'starter' | 'pro' | 'business'}.name`)}</p>
                  {tier.highlighted && <span className="text-[11px] font-semibold text-[var(--color-accent)]">{t('tierBadges.popular')}</span>}
                </div>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${tier.key}-price-${isAnnual}`}
                        className="text-[32px] font-bold text-[var(--text-primary)] tabular-nums leading-none"
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18 }}
                      >
                        {displayPrice === 0 ? '$0' : `$${displayPrice}`}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-sm text-[var(--text-muted)]">
                      {t('priceUnit.perMonth')}
                    </span>
                  </div>
                  {annualTotal && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                      {t('annualSavings', { annualTotal, saved: (monthlyPrice * 12 - annualTotal).toFixed(2) })}
                    </p>
                  )}
                  {!isAnnual && monthlyPrice > 0 && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-1.5">{t('switchToAnnual')}</p>
                  )}
                  {monthlyPrice > 0 && (
                    <p className="text-[11px] text-[var(--color-warning)] font-medium mt-1.5">
                      {annualTotal
                        ? t('hatcherDiscountAnnual', { price: hatcherPrice.toFixed(2) })
                        : t('hatcherDiscountLine', { price: hatcherPrice.toFixed(2) })}
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2 flex-1 mb-7">
                  <FeatureCheck color="var(--color-accent)">{tierAgents}</FeatureCheck>
                  <FeatureCheck color="var(--color-accent)">
                    {formatAiCredits(AI_CREDITS_BY_TIER[tier.key] ?? 0, locale)} AI Credits{t('priceUnit.perMonth')}
                  </FeatureCheck>
                  <FeatureCheck color="var(--color-accent)">UsePod/OpenRouter model picker</FeatureCheck>
                  <FeatureCheck color="var(--color-accent)">{tierCpu} / {tierRam} · {t('perAgent')}</FeatureCheck>
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
                  href={
                    tier.key === 'free'
                      ? isAuthenticated ? '/dashboard/agents' : '/register'
                      : isAuthenticated
                        ? `/dashboard/billing?upgrade=${tier.key}`
                        : loginHrefForReturn(`/dashboard/billing?upgrade=${tier.key}`)
                  }
                  className={cn(
                    'block text-center font-semibold px-5 py-2.5 rounded-md text-sm transition-opacity',
                    tier.highlighted
                      ? 'bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90'
                      : 'border border-[var(--border-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  )}
                >
                      {tier.key === 'free' ? t('tierCta.free') : t('tierCta.paid', { tierName: tTiers(`${tier.key as 'free' | 'starter' | 'pro' | 'business'}.name`) })}
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
                  <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3 text-center">
                    {groupLabel}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {groupItems.map((addon, idx) => {
                      const { price, isSubscription } = prices[idx];
                      const monthlyNum = parseFloat(price.replace('$', ''));
                      const annualMonthly = isSubscription && isAnnual ? parseFloat((monthlyNum * 0.85).toFixed(2)) : monthlyNum;
                      const displayPrice = isAnnual && isSubscription ? `$${annualMonthly}` : price;
                      const hatcherPrice = priceForHatcherPayment(annualMonthly);
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
                          <p className="text-[10px] text-[var(--color-warning)] font-semibold mb-2">
                            {t('addons.hatcherDiscount', { price: hatcherPrice.toFixed(2) })}
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            {addon.description}
                          </p>
                          {isAnnual && isSubscription && (
                            <p className="text-[10px] text-[var(--color-success)] font-semibold mt-2">
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
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-1 text-center">
                {tBilling('capacityGroup')}
              </h3>
              <p className="mx-auto mb-3 max-w-2xl text-center text-[11px] text-[var(--text-muted)]">
                {tBilling('capacityGroupNote')}
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {CAPACITY_ADDONS.map((addon) => {
                  const hatcherPrice = priceForHatcherPayment(addon.usdPrice);
                  return (
                    <motion.div
                      key={addon.key}
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.2 }}
                      className="card glass-noise p-4 text-center"
                    >
                      <h4 className="font-bold text-[var(--text-primary)] text-sm mb-2">
                        {tSharedAddons(`${addon.kind}.name`)}
                      </h4>
                      <div className="text-xl font-extrabold mb-0.5 text-[var(--text-primary)]">
                        ${addon.usdPrice}
                      </div>
                      <p className="text-[var(--text-muted)] text-[10px] mb-2 font-medium">
                        {tCapacity('per30Days')}
                      </p>
                      <p className="text-[10px] text-[var(--color-warning)] font-semibold mb-2">
                        {t('addons.hatcherDiscount', { price: hatcherPrice.toFixed(2) })}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {tSharedAddons(`${addon.kind}.description`)}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* BYOK + INTEGRATIONS CALLOUT */}
        <section className="mb-20">
          <div className="card glass-noise p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-info)_8%,transparent),transparent_70%)] pointer-events-none" />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-info-bg)] border border-[var(--color-info-border)] flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-[var(--color-info)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('integrations.heading')}</h2>
                <span className="text-[11px] font-semibold text-[var(--color-success)] border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-2.5 py-0.5 rounded-md">
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
                    <th className="text-left px-2.5 py-3 sm:p-5 text-[var(--text-muted)] font-semibold text-xs">{t('compareTable.featureColumn')}</th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[var(--color-success)] font-semibold">
                      <div className="text-xs mb-1">{tTiers('free.name')}</div>
                      <div className="text-sm sm:text-lg font-extrabold">$0</div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[var(--color-accent)] font-semibold">
                      <div className="text-xs mb-1">{tTiers('starter.name')}</div>
                      <div className="text-sm sm:text-lg font-extrabold text-[var(--text-primary)]">$6.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">{t('priceUnit.perMonth')}</span></div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[var(--color-info)] font-semibold">
                      <div className="text-xs mb-1">{tTiers('pro.name')}</div>
                      <div className="text-sm sm:text-lg font-extrabold text-[var(--text-primary)]">$19.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">{t('priceUnit.perMonth')}</span></div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[var(--color-warning)] font-semibold">
                      <div className="text-xs mb-1">{tTiers('business.name')}</div>
                      <div className="text-sm sm:text-lg font-extrabold text-[var(--text-primary)]">$49.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">{t('priceUnit.perMonth')}</span></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      { rowKey: 'agents',         free: '1',         starter: '1',         pro: '3',    business: '5' },
                      { rowKey: 'aiCredits', label: 'AI Credits / month', free: '500', starter: '3,000', pro: '15,000', business: '40,000' },
                      { rowKey: 'models', label: 'Hosted models', free: 'UsePod/OpenRouter + MiMo + AceData', starter: 'UsePod/OpenRouter + MiMo + AceData', pro: 'UsePod/OpenRouter + MiMo + AceData', business: 'UsePod/OpenRouter + MiMo + AceData' },
                      { rowKey: 'webSearch', label: 'Web search', free: 'Uses AI Credits', starter: 'Uses AI Credits', pro: 'Uses AI Credits', business: 'Uses AI Credits' },
                      { rowKey: 'byok',            free: 'Provider-paid', starter: 'Provider-paid', pro: 'Provider-paid', business: 'Provider-paid' },
                      { rowKey: 'cpuRam', label: `${t('compareTable.rows.cpuRam')} · ${t('perAgent')}`, free: '1 / 1GB', starter: '1 / 1.5GB', pro: '1.5 / 4GB', business: '4 / 6GB' },
                      { rowKey: 'storage',         free: '2 GB',     starter: '10 GB',    pro: '25 GB', business: '50 GB' },
                      { rowKey: 'autoSleep',       free: '12h',      starter: 'alwaysOn', pro: 'alwaysOn',  business: 'alwaysOn' },
                      { rowKey: 'fileManager',     free: true,       starter: true,       pro: true, business: true },
                      { rowKey: 'fullLogs',        free: true,       starter: true,       pro: true, business: true },
                      { rowKey: 'prioritySupport', free: false,      starter: false,      pro: false, business: true },
                      { rowKey: 'community', label: 'Community perks', free: false, starter: false, pro: false, business: false },
                      { rowKey: 'plugins',         free: 'Included', starter: 'Included', pro: 'Included', business: 'Included' },
                      { rowKey: 'integrations',    free: true,       starter: true,       pro: true, business: true },
                      { rowKey: 'byokKey',         free: true,       starter: true,       pro: true, business: true },
                      { rowKey: 'defaultLlm',      free: 'llama4Scout', starter: 'llama4Scout', pro: 'llama4Scout', business: 'llama4Scout' },
                    ] as Array<{ rowKey: string; label?: string; free: string | boolean; starter: string | boolean; pro: string | boolean; business: string | boolean }>
                  ).map((row, i) => (
                    <tr
                      key={row.rowKey}
                      className={cn(
                        'border-b border-[var(--border-default)] transition-colors hover:bg-[var(--bg-card)]',
                        i % 2 === 0 && 'bg-[var(--bg-card)]'
                      )}
                    >
                      <td className="px-2.5 py-3 sm:p-4 text-[var(--text-secondary)] text-xs sm:text-sm">{row.label ?? t(`compareTable.rows.${row.rowKey}`)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.free, t)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.starter, t)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center bg-[var(--color-info-bg)]">{renderCell(row.pro, t)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.business, t)}</td>
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
            {(t.raw('faq.items') as { q: string; a: string }[]).slice(0, -1).map((item) => (
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
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(88,214,141,0.08),transparent_62%)] pointer-events-none" />
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
  if (value === true)  return <Check className="w-4 h-4 text-[var(--color-success)] mx-auto" />;
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
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--bg-elevated)]">
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
        open && 'border-[var(--border-hover)] shadow-[var(--shadow-soft)]'
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
