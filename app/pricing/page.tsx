'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FOUNDING_MEMBER_MAX_SLOTS } from '@hatcher/shared';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
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
  agents: string;
  messages: string;
  cpu: string;
  ram: string;
  storage: string;
  sleep: string;
  features: string[];
  missing: string[];
}

const TIERS_DATA: TierDef[] = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    icon: <Rocket className="w-5 h-5" />,
    accent: '#22c55e',
    agents: '1 agent included',
    messages: '20 messages/day',
    cpu: '0.5 CPU',
    ram: '1 GB RAM',
    storage: '50 MB workspace',
    sleep: 'Auto-sleep after 1h idle',
    features: [
      'Llama 4 Scout on Groq',
      'BYOK = unlimited messages',
      '3 web searches/day',
      'All integrations (Telegram, Discord, Twitter, etc)',
    ],
    missing: ['Logs, File Manager available as add-ons'],
  },
  {
    key: 'starter',
    name: 'Starter',
    price: 6.99,
    icon: <Zap className="w-5 h-5" />,
    accent: 'var(--color-accent)',
    agents: '1 agent included',
    messages: '50 messages/day',
    cpu: '1 CPU',
    ram: '1.5 GB RAM',
    storage: '150 MB workspace',
    sleep: 'Auto-sleep after 4h idle',
    features: [
      'BYOK = unlimited messages',
      '10 web searches/day',
      'All integrations',
    ],
    missing: ['Logs, File Manager available as add-ons'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 19.99,
    icon: <Crown className="w-5 h-5" />,
    accent: '#8b5cf6',
    badge: 'Most Popular',
    highlighted: true,
    agents: '3 agents included',
    messages: '100 messages/day',
    cpu: '1.5 CPU',
    ram: '2 GB RAM',
    storage: '500 MB workspace',
    sleep: 'Auto-sleep after 12h idle',
    features: [
      'BYOK = unlimited messages',
      '50 web searches/day',
      'All integrations',
      'Buy Always On per agent for 24/7',
    ],
    missing: ['Logs, File Manager available as add-ons'],
  },
  {
    key: 'business',
    name: 'Business',
    price: 49.99,
    icon: <Building2 className="w-5 h-5" />,
    accent: '#f59e0b',
    agents: '10 agents included',
    messages: '300 messages/day',
    cpu: '2 CPU',
    ram: '3 GB RAM',
    storage: '1 GB workspace',
    sleep: 'Always-on (no auto-sleep)',
    features: [
      'BYOK = unlimited messages',
      '200 web searches/day',
      'File Manager included',
      'Full logs included',
      'Priority support',
      'Team collaboration',
      'All integrations',
    ],
    missing: [],
  },
  {
    key: 'founding_member',
    name: 'Founding Member',
    price: 99,
    icon: <Gem className="w-5 h-5" />,
    accent: '#e11d48',
    badge: '20 spots only',
    agents: '10 agents included',
    messages: '300 messages/day',
    cpu: '2 CPU',
    ram: '4 GB RAM',
    storage: '2 GB workspace',
    sleep: 'Always-on (no auto-sleep)',
    features: [
      '$99 one-time — lifetime access',
      '200 web searches/day',
      'File Manager + Full Logs included',
      'Priority support',
      'Team collaboration',
      'All integrations',
      'Founding badge',
    ],
    missing: [],
  },
];

/* ── Add-on definitions ──────────────────────────────────── */

interface AddonDef {
  name: string;
  price: string;
  period: string;
  description: string;
}

interface AddonGroup {
  label: string;
  items: AddonDef[];
}

const ADDON_GROUPS: AddonGroup[] = [
  {
    label: 'Extra Agents',
    items: [
      { name: '+1 Agent',  price: '$2.99',  period: '/mo', description: '1 extra slot' },
      { name: '+3 Agents', price: '$6.99',  period: '/mo', description: '3 extra slots' },
      { name: '+5 Agents', price: '$11.99', period: '/mo', description: '5 extra slots' },
      { name: '+10 Agents', price: '$19.99', period: '/mo', description: '10 extra slots' },
    ],
  },
  {
    label: 'Extra Messages (account)',
    items: [
      { name: '+20 msg/day',  price: '$1.99', period: '/mo', description: 'Stackable' },
      { name: '+50 msg/day',  price: '$3.99', period: '/mo', description: 'Stackable' },
      { name: '+100 msg/day', price: '$5.99', period: '/mo', description: 'Stackable' },
      { name: '+200 msg/day', price: '$9.99', period: '/mo', description: 'Stackable' },
    ],
  },
  {
    label: 'Extra Searches (account)',
    items: [
      { name: '+25 searches/day', price: '$3.99', period: '/mo', description: 'Stackable' },
      { name: '+50 searches/day', price: '$6.99', period: '/mo', description: 'Stackable' },
    ],
  },
  {
    label: 'Per-Agent',
    items: [
      { name: 'Always On',    price: '$7.99', period: '/mo per agent',      description: 'Keep running 24/7' },
      { name: 'File Manager', price: '$4.99', period: 'one-time per agent', description: 'Browse & edit files' },
      { name: 'Full Logs',    price: '$2.99', period: '/mo per agent',      description: 'Unlock log viewer' },
      { name: '+10 Plugins',  price: '$5.99', period: '/mo per agent',      description: 'Stack extra plugin slots' },
    ],
  },
];

/* ── Feature comparison data ─────────────────────────────── */

interface FeatureRow {
  label: string;
  free: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
  business: string | boolean;
  founding: string | boolean;
}

const FEATURE_ROWS: FeatureRow[] = [
  { label: 'Agents included',       free: '1',         starter: '1',         pro: '3',           business: '10',         founding: '10' },
  { label: 'Messages/day (account)', free: '20',       starter: '50',        pro: '100',         business: '300',        founding: '300' },
  { label: 'Web searches/day',      free: '3',         starter: '10',        pro: '50',          business: '200',        founding: '200' },
  { label: 'BYOK messages',         free: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited',   business: 'Unlimited',  founding: 'Unlimited' },
  { label: 'CPU / RAM',             free: '0.5 / 1GB', starter: '1 / 1.5GB', pro: '1.5 / 2GB',  business: '2 / 3GB',    founding: '2 / 4GB' },
  { label: 'Storage',               free: '50 MB',     starter: '150 MB',    pro: '500 MB',      business: '1 GB',       founding: '2 GB' },
  { label: 'Auto-sleep',            free: '1 hour',    starter: '4 hours',   pro: '12 hours',    business: 'Always-on',  founding: 'Always-on' },
  { label: 'File Manager',          free: 'Add-on',    starter: 'Add-on',    pro: 'Add-on',      business: true,         founding: true },
  { label: 'Full Logs',             free: 'Add-on',    starter: 'Add-on',    pro: 'Add-on',      business: true,         founding: true },
  { label: 'Team collaboration',    free: false,        starter: false,       pro: false,         business: true,         founding: true },
  { label: 'Priority support',      free: false,        starter: false,       pro: false,         business: true,         founding: true },
  { label: 'Plugins + Skills',      free: '3',         starter: '10',        pro: '25',          business: '50',         founding: '50' },
  { label: 'All integrations',      free: true,         starter: true,        pro: true,          business: true,         founding: true },
  { label: 'BYOK (own LLM key)',    free: true,         starter: true,        pro: true,          business: true,         founding: true },
  { label: 'Default LLM (Groq)',    free: 'Llama 4 Scout', starter: 'Llama 4 Scout', pro: 'Llama 4 Scout', business: 'Llama 4 Scout', founding: 'Llama 4 Scout' },
];

function renderCell(value: string | boolean) {
  if (value === true) return <Check className="w-4 h-4 text-green-400 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-[var(--text-muted)] opacity-40 mx-auto" />;
  return <span className="text-[var(--text-secondary)] text-xs font-medium">{value}</span>;
}

/* ── Page ─────────────────────────────────────────────────── */
export default function PricingPage() {
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
    <div className="relative">
      {/* Subtle radial glow BEHIND the hero — no hard edge, fades into
          `--bg-base` smoothly. Previously we had a fixed 420px-tall
          ambient layer under the header that produced a visible colored
          strip when the browser anti-aliased the transparent edge. The
          glow is now scoped to the hero section itself so content below
          sits on the normal page background, same as every other
          dashboard page. */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:pt-10 pb-16 relative">
        {/* HERO */}
        <div className="text-center mb-16 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_60%)] pointer-events-none" />
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#8b5cf6] text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Simple, Transparent Pricing
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-4xl sm:text-5xl font-extrabold mb-5 relative text-[var(--text-primary)]"
          >
            Choose Your Plan
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto leading-relaxed relative"
          >
            Start free with any framework. Scale when you are ready.
            All integrations included on every tier. BYOK always unlimited.
          </motion.p>

          {/* Monthly / Annual toggle — annual = 15% off (pay for ~10.2 months, get 12) */}
          <div className="inline-flex items-center gap-3 mt-8 p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)]">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                'px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200',
                !isAnnual
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                'px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2',
                isAnnual
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              Annual
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-bold leading-none">
                -15%
              </span>
            </button>
          </div>
        </div>

        {/* TIER CARDS */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-20">
          {TIERS_DATA.map((tier) => {
            const isLifetime = tier.key === 'founding_member';
            const monthlyPrice = tier.price;
            const annualMonthlyPrice = monthlyPrice === 0 || isLifetime ? monthlyPrice : parseFloat((monthlyPrice * 0.85).toFixed(2));
            const displayPrice = isLifetime ? monthlyPrice : (isAnnual ? annualMonthlyPrice : monthlyPrice);
            const annualTotal = isAnnual && monthlyPrice > 0 && !isLifetime ? parseFloat((annualMonthlyPrice * 12).toFixed(2)) : null;
            const billingParam = isLifetime ? 'lifetime' : (isAnnual ? 'annual' : 'monthly');

            return (
              <motion.div
                key={tier.key}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'card glass-noise p-7 flex flex-col relative',
                  tier.highlighted && 'border-[#8b5cf6]/40 shadow-[0_0_40px_rgba(139,92,246,0.15)]'
                )}
              >
                {/* Popular / Founding badge — short pill sits above the
                    card. The live slot count gets its own row inside the
                    card body (see below) because it's too wide for the
                    badge. */}
                {tier.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white text-[11px] font-bold uppercase tracking-wider whitespace-nowrap',
                      isLifetime
                        ? 'bg-gradient-to-r from-[#e11d48] to-[#be123c] shadow-[0_0_20px_rgba(225,29,72,0.5)]'
                        : 'bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] shadow-[0_0_20px_rgba(139,92,246,0.5)]'
                    )}>
                      {isLifetime ? <Gem className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
                      {isLifetime ? 'Limited' : tier.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: tier.accent + '15', border: `1px solid ${tier.accent}30` }}
                    >
                      <div style={{ color: tier.accent }}>{tier.icon}</div>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{tier.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${tier.key}-price-${isAnnual}`}
                        className="text-3xl font-extrabold text-[var(--text-primary)]"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                      >
                        {displayPrice === 0 ? '$0' : `$${displayPrice}`}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-sm text-[var(--text-muted)]">
                      {displayPrice === 0 ? '/mo' : isLifetime ? ' once' : '/mo'}
                    </span>
                  </div>
                  {annualTotal && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      ${annualTotal} billed annually
                      {' '}
                      <span className="text-green-400 font-semibold">
                        (save ${(monthlyPrice * 12 - annualTotal).toFixed(2)})
                      </span>
                    </p>
                  )}
                  {!isAnnual && monthlyPrice > 0 && !isLifetime && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      Switch to annual and save 15%
                    </p>
                  )}
                  {isLifetime && (
                    <p className="text-[10px] text-[#e11d48] font-semibold mt-1">
                      Pay once, keep forever
                    </p>
                  )}
                </div>

                {/* Founding: live slot availability — dedicated row so
                    the text has room to breathe and the progress bar is
                    fully visible (not clipped behind the badge). */}
                {isLifetime && (
                  <div className="mb-5 p-3 rounded-lg bg-[#e11d48]/5 border border-[#e11d48]/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
                        Availability
                      </span>
                      {foundingRemaining === null ? (
                        <span className="text-[10px] text-[var(--text-muted)] inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 border-2 border-[var(--text-muted)]/30 border-t-[var(--text-muted)] rounded-full animate-spin" />
                          Loading…
                        </span>
                      ) : (
                        <span className={cn(
                          'text-[11px] font-bold tabular-nums',
                          foundingRemaining === 0 ? 'text-red-400'
                            : foundingRemaining <= 3 ? 'text-orange-400'
                            : 'text-[var(--text-primary)]'
                        )}>
                          {foundingRemaining === 0 ? 'Sold out' : `${foundingRemaining} of ${FOUNDING_MEMBER_MAX_SLOTS} left`}
                        </span>
                      )}
                    </div>
                    <div className="relative h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      {foundingRemaining === null ? (
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#e11d48]/40 to-transparent animate-[shimmer_1.4s_ease-in-out_infinite]"
                          style={{ backgroundSize: '200% 100%' }}
                        />
                      ) : (
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#e11d48] to-[#be123c] transition-all duration-700"
                          style={{ width: `${((FOUNDING_MEMBER_MAX_SLOTS - foundingRemaining) / FOUNDING_MEMBER_MAX_SLOTS) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Highlights */}
                <div className="space-y-2.5 flex-1 mb-7">
                  <FeatureCheck color={tier.accent}>{tier.agents}</FeatureCheck>
                  <FeatureCheck color={tier.accent}>{tier.messages}</FeatureCheck>
                  <FeatureCheck color={tier.accent}>{tier.cpu} / {tier.ram}</FeatureCheck>
                  <FeatureCheck color={tier.accent}>{tier.storage}</FeatureCheck>
                  <FeatureCheck color={tier.accent}>{tier.sleep}</FeatureCheck>
                  {tier.features.map((f) => (
                    <FeatureCheck key={f} color={tier.accent}>{f}</FeatureCheck>
                  ))}
                  {tier.missing.map((f) => (
                    <FeatureMissing key={f}>{f}</FeatureMissing>
                  ))}
                </div>

                {/* CTA */}
                {tier.key === 'free' ? (
                  <Link
                    href="/register"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all bg-green-600 text-white hover:bg-green-500"
                  >
                    <Rocket className="w-4 h-4" />
                    Get Started Free
                  </Link>
                ) : tier.highlighted ? (
                  <Link
                    href={`/dashboard/billing?upgrade=${tier.key}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all text-white"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      boxShadow: '0 4px 16px rgba(139,92,246,0.35)',
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    Get {tier.name}
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/billing?upgrade=${tier.key}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all text-white"
                    style={{
                      background: tier.accent,
                      boxShadow: `0 4px 16px ${tier.accent}40`,
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    Get {tier.name}
                  </Link>
                )}
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
              <Plus className="w-6 h-6 text-[#8b5cf6]" />
              <span className="text-[var(--text-primary)]">Add-ons</span>
            </motion.h2>
            <p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto">
              Customize your plan. Stack add-ons on any tier. Mix and match as needed.
            </p>
          </div>

          <div className="max-w-6xl mx-auto space-y-6">
            {ADDON_GROUPS.map((group) => (
              <div key={group.label}>
                <h3 className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3 text-center">
                  {group.label}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {group.items.map((addon) => {
                    // Only subscription-type addons get annual pricing.
                    const isSubscription = addon.period.startsWith('/mo');
                    const monthlyNum = parseFloat(addon.price.replace('$', ''));
                    const annualMonthly = isSubscription && isAnnual ? parseFloat((monthlyNum * 0.85).toFixed(2)) : monthlyNum;
                    const displayPrice = isAnnual && isSubscription ? `$${annualMonthly}` : addon.price;
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
                            15% off annual
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
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
                <h2 className="text-xl font-bold text-[var(--text-primary)]">All Integrations Free</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 rounded-full">
                  every tier
                </span>
              </div>
            </div>
            <p className="text-[var(--text-muted)] text-sm mb-4">
              Telegram, Discord, WhatsApp, Slack, Signal, iMessage, and 14+ more platforms
              are included free on all tiers. No extra charge, ever.
            </p>
            <p className="text-[var(--text-secondary)] text-sm font-medium p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]">
              All prices in USD, payable in SOL or $HATCHER. BYOK (Bring Your Own Key) = unlimited messages with your own LLM API key on any tier.
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
              <Shield className="w-6 h-6 text-[#8b5cf6]" />
              <span className="text-[var(--text-primary)]">Compare Plans</span>
            </motion.h2>
            <p className="text-[var(--text-muted)] text-sm">See what each tier includes at a glance</p>
          </div>

          <div className="card glass-noise p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left px-2.5 py-3 sm:p-5 text-[var(--text-muted)] font-medium text-[10px] sm:text-xs uppercase tracking-wider">Feature</th>
                    <th className="text-center px-2 py-3 sm:p-5 text-green-400 font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">Free</div>
                      <div className="text-sm sm:text-lg font-extrabold">$0</div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[var(--color-accent)] font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">Starter</div>
                      <div className="text-sm sm:text-lg font-extrabold text-[var(--text-primary)]">$6.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">/mo</span></div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[#8b5cf6] font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">Pro</div>
                      <div className="text-sm sm:text-lg font-extrabold text-[var(--text-primary)]">$19.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">/mo</span></div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[#f59e0b] font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">Business</div>
                      <div className="text-sm sm:text-lg font-extrabold text-[var(--text-primary)]">$49.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">/mo</span></div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[#e11d48] font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">Founding</div>
                      <div className="text-sm sm:text-lg font-extrabold text-[var(--text-primary)]">$99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal"> once</span></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_ROWS.map((row, i) => (
                    <tr
                      key={row.label}
                      className={cn(
                        'border-b border-[var(--border-default)] transition-colors hover:bg-[var(--bg-card)]',
                        i % 2 === 0 && 'bg-[var(--bg-card)]'
                      )}
                    >
                      <td className="px-2.5 py-3 sm:p-4 text-[var(--text-secondary)] text-xs sm:text-sm">{row.label}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.free)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.starter)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center bg-[#8b5cf6]/[0.03]">{renderCell(row.pro)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.business)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center bg-[#e11d48]/[0.03]">{renderCell(row.founding)}</td>
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
              <HelpCircle className="w-6 h-6 text-[#8b5cf6]" />
              <span className="text-[var(--text-primary)]">Frequently Asked Questions</span>
            </motion.h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* NEED HELP */}
        <div className="text-center mb-20">
          <p className="text-[var(--text-muted)] text-sm">
            Need help choosing a plan?{' '}
            <a href="mailto:support@hatcher.host" className="text-[#8b5cf6] hover:underline font-medium">
              Email us
            </a>
            {' '}or{' '}
            <a href="https://discord.gg/7tY3HjKjMc" target="_blank" rel="noopener noreferrer" className="text-[#8b5cf6] hover:underline font-medium">
              Discord
            </a>
            {' '}or{' '}
            <a href="https://t.me/HatcherLabs" target="_blank" rel="noopener noreferrer" className="text-[#8b5cf6] hover:underline font-medium">
              Telegram
            </a>
          </p>
        </div>

        {/* CTA BANNER */}
        <div className="card glass-noise p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.1),transparent_60%)] pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 relative text-[var(--text-primary)]">
            Ready to deploy your agent?
          </h2>
          <p className="text-[var(--text-secondary)] text-base max-w-lg mx-auto mb-8 leading-relaxed relative">
            Pick your framework, choose a template, and deploy in seconds.
            Start free with a built-in LLM. Upgrade when you need more power.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 relative">
            <Link href="/create" className="btn-primary px-10 py-4 text-base font-bold">
              <Rocket className="w-5 h-5" />
              Create Agent
            </Link>
            <Link
              href="/frameworks"
              className="inline-flex items-center gap-2 px-6 py-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              See Frameworks
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* FOOTER NOTE */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-10 max-w-xl mx-auto leading-relaxed">
          All prices in USD, payable in SOL or $HATCHER. BYOK (Bring Your Own Key) = unlimited messages with your own LLM API key on any tier.
        </p>
      </div>
    </div>
  );
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
        open && 'border-[rgba(139,92,246,0.3)] shadow-[0_0_20px_rgba(139,92,246,0.06)]'
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left group"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] pr-4 group-hover:text-[#8b5cf6] transition-colors">{q}</span>
        <div
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
            open ? 'bg-[#8b5cf6]/15' : 'bg-[var(--bg-card)]'
          )}
        >
          <ChevronDown className={cn('w-4 h-4 transition-all duration-200', open ? 'text-[#8b5cf6] rotate-180' : 'text-[var(--text-muted)]')} />
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
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[rgba(139,92,246,0.2)] to-transparent mb-4" />
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FAQ = [
  {
    q: 'What is BYOK (Bring Your Own Key)?',
    a: 'BYOK lets you use your own API key for any LLM provider (OpenAI, Anthropic, Google, xAI, Groq, OpenRouter). This is always free on all tiers -- you pay the provider directly, no Hatcher markup. Messages with your own key are unlimited.',
  },
  {
    q: 'How do add-ons work?',
    a: 'Add-ons are stackable on any tier. For example, if you are on the Starter tier (1 agent) and purchase a +3 Agents add-on, you can run 4 agents total. You can stack multiple add-ons.',
  },
  {
    q: 'What is the difference between shared and dedicated resources?',
    a: 'Shared resources mean your agent shares CPU and RAM with others on the same server -- still performant but may vary under load. Dedicated resources (Pro and Business) give your agent guaranteed CPU and RAM that no one else can use.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'You can pay with SOL or $HATCHER. Prices are listed in USD and converted at live rates via Jupiter.',
  },
  {
    q: 'Can I downgrade my tier?',
    a: 'Yes. You can cancel your subscription at any time and your tier will revert to Free at the end of the billing period. Agents beyond your free limit will be paused.',
  },
  {
    q: 'What is auto-sleep?',
    a: 'Free agents sleep after 1 hour of inactivity, Starter after 4 hours, Pro after 12 hours. Business and Founding Member agents are always-on with no auto-sleep. They wake instantly on the next message. You can add Always On to any agent for $7.99/mo.',
  },
  {
    q: 'What LLM do I get with the free tier?',
    a: 'Free and Starter tiers use GPT-OSS 20B on Groq. Pro, Business, and Founding Member tiers get Llama 3.3 70B on Groq — a more capable model. Message limits are account-wide: Free 20/day, Starter 50/day, Pro 100/day, Business 300/day, Founding 300/day. BYOK (bring your own LLM key) bypasses all limits on any tier.',
  },
  {
    q: 'What is the Founding Member tier?',
    a: 'Founding Member is a one-time $99 payment that gives you lifetime access to Hatcher: 10 agents, 300 messages/day, 4 GB RAM, 2 GB workspace, always-on, and all premium features (File Manager, Full Logs, priority support) included. No monthly fees, ever. Limited to 20 spots — once they are gone, this tier is gone.',
  },
];
