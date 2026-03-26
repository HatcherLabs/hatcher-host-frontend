'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TIERS, TIER_ORDER, ADDONS } from '@hatcher/shared';
import type { UserTierKey } from '@hatcher/shared';
import { RobotMascot } from '@/components/ui/RobotMascot';
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

/* ── Animation variants ──────────────────────────────────── */
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.08 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const cardHover = {
  scale: 1.02,
  borderColor: 'rgba(6, 182, 212, 0.4)',
  boxShadow: '0 0 30px rgba(6, 182, 212, 0.12), 0 8px 40px rgba(0,0,0,0.2)',
};

const scrollFadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const staggerGrid = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const displayFont = { fontFamily: 'var(--font-display), system-ui, sans-serif' };

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
  return (
    <motion.div
      className="min-h-screen"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* HERO */}
        <motion.div className="text-center mb-16 relative" variants={sectionVariants}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.12),transparent_60%)] pointer-events-none" />
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] text-xs font-medium mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Simple Pricing
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 relative" style={displayFont}>
            <span className="text-gradient">Choose Your</span>{' '}
            <span className="text-[var(--text-primary)]">Plan</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto leading-relaxed relative">
            Start free with any framework. Scale when you are ready.
            All integrations included. BYOK always free. Pay with SOL or platform tokens.
          </p>
        </motion.div>

        {/* TIER CARDS */}
        <motion.div
          className="grid md:grid-cols-3 gap-6 mb-20"
          variants={staggerGrid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {TIER_ORDER.map((tierKey) => {
            const tier = TIERS[tierKey];
            const style = TIER_STYLES[tierKey];

            return (
              <motion.div
                key={tierKey}
                className={cn(
                  'card glass-noise p-8 flex flex-col relative',
                  style.highlighted && 'border-[#06b6d4]/40 shadow-[0_0_40px_rgba(6,182,212,0.12)]'
                )}
                whileHover={cardHover}
                variants={staggerItem}
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
                    <span className="text-4xl font-extrabold" style={{ color: style.accent }}>
                      {tier.usdPrice === 0 ? 'Free' : `$${tier.usdPrice}`}
                    </span>
                    {tier.usdPrice > 0 && (
                      <span className="text-sm text-[var(--text-muted)]">/mo</span>
                    )}
                  </div>
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
                    href="/register"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all border border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    <Rocket className="w-4 h-4" />
                    Get Started
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/billing"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all text-white"
                    style={{
                      background: '#06b6d4',
                      boxShadow: '0 4px 16px rgba(6,182,212,0.3)',
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    Subscribe
                  </Link>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* ADD-ONS SECTION */}
        <motion.section
          className="mb-20"
          variants={scrollFadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3 flex items-center justify-center gap-3" style={displayFont}>
              <Plus className="w-6 h-6 text-[#06b6d4]" />
              <span className="text-[var(--text-primary)]">Agent Add-ons</span>
            </h2>
            <p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto">
              Need more agents? Stack add-ons on any tier. Mix and match as needed.
            </p>
          </div>

          <motion.div
            className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto"
            variants={staggerGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {ADDONS.map((addon) => (
              <motion.div
                key={addon.key}
                className="card glass-noise p-6 text-center"
                whileHover={cardHover}
                variants={staggerItem}
              >
                <h3 className="font-bold text-[var(--text-primary)] text-lg mb-2">{addon.name}</h3>
                <div className="text-3xl font-extrabold mb-1">
                  <span className="text-gradient">${addon.usdPrice}</span>
                </div>
                <p className="text-[var(--text-muted)] text-xs mb-3">
                  {addon.type === 'one_time' ? 'one-time' : '/month'}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {addon.extraAgents ? `${addon.extraAgents} extra agent slots` : addon.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* FREE INTEGRATIONS CALLOUT */}
        <motion.section
          className="mb-20"
          variants={scrollFadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          <div className="card-gradient-border glass-noise p-8 relative overflow-hidden">
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
        </motion.section>

        {/* COMPARE PLANS TABLE */}
        <motion.section
          className="mb-20"
          variants={scrollFadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3 flex items-center justify-center gap-3" style={displayFont}>
              <Shield className="w-6 h-6 text-[#06b6d4]" />
              <span className="text-[var(--text-primary)]">Compare Plans</span>
            </h2>
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
                      <div className="text-sm sm:text-lg font-extrabold text-gradient">$9.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">/mo</span></div>
                    </th>
                    <th className="text-center px-2 py-3 sm:p-5 text-[var(--text-primary)] font-semibold">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider mb-1">Pro</div>
                      <div className="text-sm sm:text-lg font-extrabold text-gradient">$19.99<span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-normal">/mo</span></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_ROWS.map((row, i) => (
                    <motion.tr
                      key={row.label}
                      className={cn(
                        'border-b border-[rgba(46,43,74,0.2)] transition-colors hover:bg-white/[0.02]',
                        i % 2 === 0 && 'bg-white/[0.01]'
                      )}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <td className="px-2.5 py-3 sm:p-4 text-[var(--text-secondary)] text-xs sm:text-sm">{row.label}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.free)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center bg-[#06b6d4]/[0.02]">{renderCell(row.basic)}</td>
                      <td className="px-2 py-3 sm:p-4 text-center">{renderCell(row.pro)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          className="mb-20"
          variants={scrollFadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-3" style={displayFont}>
              <HelpCircle className="w-6 h-6 text-[#06b6d4]" />
              <span className="text-[var(--text-primary)]">Frequently Asked Questions</span>
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ.map((item, index) => (
              <FAQItem key={item.q} q={item.q} a={item.a} index={index} />
            ))}
          </div>
        </motion.section>

        {/* NEED HELP */}
        <motion.div
          className="text-center mb-20"
          variants={scrollFadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
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
        </motion.div>

        {/* CTA BANNER */}
        <motion.div
          className="card-gradient-border glass-noise p-10 sm:p-14 text-center relative overflow-hidden"
          variants={scrollFadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.1),transparent_60%)] pointer-events-none" />
          <RobotMascot size="lg" mood="waving" className="mx-auto mb-6 relative" />
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 relative" style={displayFont}>
            <span className="text-gradient">Ready to hatch</span>{' '}
            <span className="text-[var(--text-primary)]">your agent?</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-base max-w-lg mx-auto mb-8 leading-relaxed relative">
            Pick your framework, choose a template, and deploy in seconds.
            Start free with a built-in LLM. Upgrade when you need more power.
          </p>
          <div className="flex items-center justify-center gap-4 relative">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link href="/create" className="btn-primary px-10 py-4 text-base font-bold">
                <Rocket className="w-5 h-5" />
                Create Agent
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-6 py-4 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Browse Agents
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* FOOTER NOTE */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-10">
          All prices in USD. Pay with SOL or platform tokens.
        </p>
      </div>
    </motion.div>
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

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className={cn(
        'card glass-noise overflow-hidden transition-all duration-200',
        open && 'border-[rgba(6,182,212,0.3)] shadow-[0_0_20px_rgba(6,182,212,0.06)]'
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left group"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] pr-4 group-hover:text-[#06b6d4] transition-colors">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
            open ? 'bg-[#06b6d4]/15' : 'bg-white/[0.03]'
          )}
        >
          <ChevronDown className={cn('w-4 h-4 transition-colors', open ? 'text-[#06b6d4]' : 'text-[var(--text-muted)]')} />
        </motion.div>
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
    </motion.div>
  );
}

const FAQ = [
  {
    q: 'Do I need a wallet to use Hatcher?',
    a: 'No. You can register with email and create a free agent immediately. You only need to connect a Solana wallet when purchasing a paid subscription with SOL or platform tokens.',
  },
  {
    q: 'What frameworks are supported?',
    a: 'Hatcher supports 4 frameworks: OpenClaw (13,700+ skills, plugin ecosystem), Hermes (lightweight, persistent memory, 40+ tools), ElizaOS (multi-agent, 350+ plugins, blockchain-native), and Milady (privacy-first, 29 connectors). All tiers support all frameworks.',
  },
  {
    q: 'What is BYOK (Bring Your Own Key)?',
    a: 'BYOK lets you use your own API key for any LLM provider (OpenAI, Anthropic, Google, xAI, Groq, OpenRouter). This is always free on all tiers -- you pay the provider directly, no Hatcher markup. Works with both frameworks.',
  },
  {
    q: 'Are integrations really free?',
    a: 'Yes. Telegram, Discord, WhatsApp, Slack, Signal, iMessage, and 14+ more platforms are included at no extra charge on all tiers, including Free.',
  },
  {
    q: 'How do add-ons work?',
    a: 'Add-ons are stackable. For example, if you are on the Free tier (1 agent) and purchase a +5 Agents add-on, you can run 6 agents total. Add-ons work on any tier and you can combine multiple.',
  },
  {
    q: 'How is the token price determined?',
    a: 'All prices are listed in USD. The equivalent token amount is calculated at payment time using live rates.',
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
