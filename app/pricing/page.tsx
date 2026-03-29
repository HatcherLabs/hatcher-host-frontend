'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TIERS, TIER_ORDER, ADDONS } from '@hatcher/shared';
import type { UserTierKey } from '@hatcher/shared';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Crown,
  HelpCircle,
  MessageSquare,
  Plus,
  Rocket,
  Shield,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

/* ── Feature comparison data ─────────────────────────────── */
interface FeatureRow {
  label: string;
  free: string | boolean;
  basic: string | boolean;
  pro: string | boolean;
}

const FEATURE_ROWS: FeatureRow[] = [
  { label: 'Agents included',       free: '1',       basic: '1',         pro: '5' },
  { label: 'Messages',              free: '20/day',  basic: '100/day',   pro: '300/day' },
  { label: 'BYOK messages',         free: 'Unlimited', basic: 'Unlimited', pro: 'Unlimited' },
  { label: 'CPU',                   free: '0.5',     basic: '1',         pro: '2 cores' },
  { label: 'RAM',                   free: '1 GB',    basic: '1.5 GB',    pro: '2 GB' },
  { label: 'Storage',               free: '150 MB',  basic: '300 MB',    pro: '600 MB' },
  { label: 'File Manager',          free: false,      basic: false,       pro: true },
  { label: 'Full Logs',             free: false,      basic: false,       pro: true },
  { label: 'Auto-sleep',            free: '15 min idle', basic: '6h idle', pro: 'Always-on' },
  { label: 'All integrations',      free: true,       basic: true,        pro: true },
  { label: 'BYOK (own LLM key)',    free: true,       basic: true,        pro: true },
  { label: 'Default LLM (Groq)',    free: true,       basic: true,        pro: true },
  { label: 'Priority support',      free: false,      basic: false,       pro: true },
];

function renderCell(value: string | boolean) {
  if (value === true) return <Check className="w-4 h-4 text-green-400 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-[var(--text-muted)] opacity-40 mx-auto" />;
  return <span className="text-[var(--text-secondary)] text-xs font-medium">{value}</span>;
}

/* ── Tier card accent colors ─────────────────────────────── */
const TIER_STYLES: Record<UserTierKey, { accent: string; badge?: string; highlighted?: boolean }> = {
  free: { accent: '#22c55e' },
  basic: { accent: '#06b6d4' },
  pro: { accent: '#06b6d4', badge: 'Most Popular', highlighted: true },
};

/* ── Page ─────────────────────────────────────────────────── */
export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* HERO */}
        <div className="text-center mb-16 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.12),transparent_60%)] pointer-events-none" />
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Simple Pricing
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-4xl sm:text-5xl font-extrabold mb-5 relative text-white"
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
            All integrations included. BYOK always free. Pay with SOL or platform tokens.
          </motion.p>

          {/* Monthly / Annual toggle */}
          <div className="inline-flex items-center gap-3 mt-8 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
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
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* TIER CARDS */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {TIER_ORDER.map((tierKey) => {
            const tier = TIERS[tierKey];
            const style = TIER_STYLES[tierKey];
            const monthlyPrice = tier.usdPrice;
            const annualMonthlyPrice = monthlyPrice === 0 ? 0 : parseFloat((monthlyPrice * 0.8).toFixed(2));
            const displayPrice = isAnnual ? annualMonthlyPrice : monthlyPrice;
            const annualTotal = isAnnual && monthlyPrice > 0 ? parseFloat((annualMonthlyPrice * 12).toFixed(2)) : null;
            const billingParam = isAnnual ? 'annual' : 'monthly';

            return (
              <motion.div
                key={tierKey}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'card glass-noise p-8 flex flex-col relative',
                  style.highlighted && 'border-[#06b6d4]/40 shadow-[0_0_40px_rgba(6,182,212,0.12)]'
                )}
              >
                {/* Popular badge */}
                {style.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#06b6d4] to-[#0891b2] text-white text-[11px] font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                      <Crown className="w-3.5 h-3.5" />
                      {style.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1.5">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${tierKey}-price-${isAnnual}`}
                        className="text-4xl font-extrabold text-white"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                      >
                        {displayPrice === 0 ? 'Free' : `$${displayPrice}`}
                      </motion.span>
                    </AnimatePresence>
                    {displayPrice > 0 && (
                      <span className="text-sm text-[var(--text-muted)]">/mo</span>
                    )}
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
                  {!isAnnual && monthlyPrice > 0 && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      Switch to annual and save 20%
                    </p>
                  )}
                </div>

                {/* Feature list */}
                <div className="space-y-3 flex-1 mb-8">
                  <FeatureCheck color={style.accent}>
                    {tier.includedAgents} agent{tier.includedAgents > 1 ? 's' : ''} included
                  </FeatureCheck>
                  <FeatureCheck color={style.accent}>
                    {tier.messagesPerDay === 0 ? 'Unlimited messages' : `${tier.messagesPerDay} messages/day`}
                  </FeatureCheck>
                  {tierKey !== 'free' && (
                    <div className="ml-7.5 -mt-1.5">
                      <span className="text-[10px] font-medium text-green-400/80">Unlimited with your own API key</span>
                    </div>
                  )}
                  <FeatureCheck color={style.accent}>
                    {tier.cpuLimit} CPU / {tier.memoryMb >= 1024 ? `${tier.memoryMb / 1024} GB` : `${tier.memoryMb} MB`} RAM
                  </FeatureCheck>
                  <FeatureCheck color={style.accent}>
                    {tier.storageMb >= 1024 ? `${tier.storageMb / 1024} GB` : `${tier.storageMb} MB`} storage
                  </FeatureCheck>
                  {tier.fileManager ? (
                    <FeatureCheck color={style.accent}>File Manager</FeatureCheck>
                  ) : (
                    <FeatureMissing>No File Manager</FeatureMissing>
                  )}
                  {tier.fullLogs ? (
                    <FeatureCheck color={style.accent}>Full logs</FeatureCheck>
                  ) : (
                    <FeatureMissing>No full logs</FeatureMissing>
                  )}
                  {tier.autoSleep ? (
                    <FeatureMissing>Auto-sleep after {tier.autoSleepMinutes >= 60 ? `${Math.round(tier.autoSleepMinutes / 60)}h` : `${tier.autoSleepMinutes} min`} idle</FeatureMissing>
                  ) : (
                    <FeatureCheck color={style.accent}>No auto-sleep</FeatureCheck>
                  )}
                  <FeatureCheck color={style.accent}>All integrations (free)</FeatureCheck>
                  <FeatureCheck color={style.accent}>BYOK always free</FeatureCheck>
                </div>

                {/* CTA */}
                {tierKey === 'free' ? (
                  <Link
                    href={`/register?tier=free`}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all border border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    <Rocket className="w-4 h-4" />
                    Get Started Free
                  </Link>
                ) : (
                  <Link
                    href={`/register?tier=${tierKey}&billing=${billingParam}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all text-white"
                    style={{
                      background: '#06b6d4',
                      boxShadow: '0 4px 16px rgba(6,182,212,0.3)',
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
              <Plus className="w-6 h-6 text-[#06b6d4]" />
              <span className="text-[var(--text-primary)]">Agent Add-ons</span>
            </motion.h2>
            <p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto">
              Need more agents? Stack add-ons on any tier. Mix and match as needed.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {ADDONS.map((addon) => (
              <motion.div
                key={addon.key}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="card glass-noise p-6 text-center"
              >
                <h3 className="font-bold text-[var(--text-primary)] text-lg mb-2">{addon.name}</h3>
                <div className="text-3xl font-extrabold mb-1 text-white">
                  ${addon.usdPrice}
                </div>
                <p className="text-[var(--text-muted)] text-xs mb-3">
                  {addon.type === 'one_time' ? 'one-time' : '/month'}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {addon.extraAgents ? `${addon.extraAgents} extra agent slots` : addon.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FREE INTEGRATIONS CALLOUT */}
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
            <p className="text-[var(--text-muted)] text-sm">
              BYOK (Bring Your Own Key) is also always free -- use your own OpenAI, Anthropic,
              Google, xAI, or Groq API key without any Hatcher markup.
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
              <Shield className="w-6 h-6 text-[#06b6d4]" />
              <span className="text-[var(--text-primary)]">Compare Plans</span>
            </motion.h2>
            <p className="text-[var(--text-muted)] text-sm">See what each tier includes at a glance</p>
          </div>

          <div className="card glass-noise p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(46,43,74,0.4)]">
                    <th className="text-left px-2.5 py-3 sm:p-5 text-[var(--text-muted)] font-medium text-[10px] sm:text-xs uppercase tracking-wider">Feature</th>
                    <th className="text-center px-2 py-3 sm:p-5 text-green-400 font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">Free</div>
                      <div className="text-sm sm:text-lg font-extrabold">$0</div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[var(--text-primary)] font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">Basic</div>
                      <div className="text-sm sm:text-lg font-extrabold text-white">$9.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">/mo</span></div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[var(--text-primary)] font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">Pro</div>
                      <div className="text-sm sm:text-lg font-extrabold text-white">$19.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">/mo</span></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_ROWS.map((row, i) => (
                    <tr
                      key={row.label}
                      className={cn(
                        'border-b border-[rgba(46,43,74,0.2)] transition-colors hover:bg-white/[0.02]',
                        i % 2 === 0 && 'bg-white/[0.01]'
                      )}
                    >
                      <td className="px-2.5 py-3 sm:p-4 text-[var(--text-secondary)] text-xs sm:text-sm">{row.label}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.free)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center bg-[#06b6d4]/[0.02]">{renderCell(row.basic)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.pro)}</td>
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
              <HelpCircle className="w-6 h-6 text-[#06b6d4]" />
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
            <a href="mailto:support@hatcher.host" className="text-[#06b6d4] hover:underline font-medium">
              Email us
            </a>
            {' '}or{' '}
            <a href="https://discord.gg/7tY3HjKjMc" target="_blank" rel="noopener noreferrer" className="text-[#06b6d4] hover:underline font-medium">
              ask on Discord
            </a>
          </p>
        </div>

        {/* CTA BANNER */}
        <div className="card glass-noise p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.1),transparent_60%)] pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 relative text-white">
            Ready to hatch your agent?
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
              href="/explore"
              className="inline-flex items-center gap-2 px-6 py-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Browse Agents
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* FOOTER NOTE */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-10">
          All prices in USD. Pay with SOL or platform tokens.
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
        open && 'border-[rgba(6,182,212,0.3)] shadow-[0_0_20px_rgba(6,182,212,0.06)]'
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left group"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] pr-4 group-hover:text-[#06b6d4] transition-colors">{q}</span>
        <div
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
            open ? 'bg-[#06b6d4]/15' : 'bg-white/[0.03]'
          )}
        >
          <ChevronDown className={cn('w-4 h-4 transition-all duration-200', open ? 'text-[#06b6d4] rotate-180' : 'text-[var(--text-muted)]')} />
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
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[rgba(6,182,212,0.2)] to-transparent mb-4" />
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
    a: 'BYOK lets you use your own API key for any LLM provider (OpenAI, Anthropic, Google, xAI, Groq, OpenRouter). This is always free on all tiers -- you pay the provider directly, no Hatcher markup.',
  },
  {
    q: 'How do add-ons work?',
    a: 'Add-ons are stackable. For example, if you are on the Free tier (1 agent) and purchase a +5 Agents add-on, you can run 6 agents total. Add-ons work on any tier and you can combine multiple.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'You can pay with SOL or our platform token. Prices are listed in USD and converted at live rates.',
  },
  {
    q: 'Can I downgrade my tier?',
    a: 'Yes. You can cancel your subscription at any time and your tier will revert to Free at the end of the billing period. Your agents beyond the free limit will be paused.',
  },
  {
    q: 'What is auto-sleep?',
    a: 'Free tier agents automatically sleep after 15 minutes of inactivity to save resources. Basic tier agents sleep after 6 hours of inactivity. Both wake up instantly on the next message. Pro tier agents are always-on with no auto-sleep.',
  },
];
