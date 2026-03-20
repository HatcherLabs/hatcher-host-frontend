'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FEATURE_CATALOG,
  BUNDLES,
  CREDIT_PACKS,
  HOSTED_CREDIT_MODELS,
  FREE_TIER_LIMITS,
  FRAMEWORKS,

  getFeaturesByFramework,
} from '@hatcher/shared';
import type { FeaturePricing, AgentFramework } from '@hatcher/shared';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { RobotMascot } from '@/components/ui/RobotMascot';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Gift,
  HelpCircle,
  Layers,
  Minus,
  Package,
  Rocket,
  Shield,
  Sparkles,
  Table,
  Zap,
  Star,
  Flame,
  Crown,
  X,
} from 'lucide-react';

// ── Animation variants ───────────────────────────────────────
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
  borderColor: 'rgba(249, 115, 22, 0.4)',
  boxShadow: '0 0 30px rgba(249, 115, 22, 0.12), 0 8px 40px rgba(0,0,0,0.2)',
};

const checkVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: { delay: i * 0.05, type: 'spring' as const, stiffness: 400, damping: 15 },
  }),
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

// Group features by category within a framework
function groupByCategory(features: FeaturePricing[]): Record<string, FeaturePricing[]> {
  const groups: Record<string, FeaturePricing[]> = {};
  for (const f of features) {
    if (!groups[f.category]) groups[f.category] = [];
    groups[f.category].push(f);
  }
  return groups;
}

// Identify "popular" bundles and features
const POPULAR_BUNDLES = ['bundle.social', 'bundle.power'];
const RECOMMENDED_FEATURES = ['openclaw.platform.telegram', 'openclaw.platform.discord', 'openclaw.skills.unlimited'];

// ── Compare Plans Data ──────────────────────────────────────
type PlanCellValue = boolean | string;

const COMPARE_PLANS: { feature: string; free: PlanCellValue; starter: PlanCellValue; power: PlanCellValue }[] = [
  { feature: 'Active Agents', free: '1', starter: '1', power: '1' },
  { feature: 'LLM (Groq Free)', free: true, starter: true, power: true },
  { feature: 'BYOK (Bring Your Own Key)', free: true, starter: true, power: true },
  { feature: 'Telegram Integration', free: false, starter: true, power: true },
  { feature: 'Discord Integration', free: false, starter: true, power: true },
  { feature: 'WhatsApp Integration', free: false, starter: false, power: true },
  { feature: 'Skills', free: '3 basic', starter: '10', power: 'Unlimited' },
  { feature: 'Dedicated Container', free: false, starter: false, power: true },
  { feature: 'Persistent Memory', free: false, starter: false, power: true },
  { feature: 'Full Log Retention', free: '24h', starter: '24h', power: 'Unlimited' },
  { feature: 'Webhooks', free: false, starter: false, power: true },
  { feature: 'Community Support', free: true, starter: true, power: true },
];

function renderPlanCell(value: PlanCellValue) {
  if (value === true) return <Check className="w-4 h-4 text-green-400 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-[var(--text-muted)] opacity-40 mx-auto" />;
  return <span className="text-[var(--text-secondary)] text-xs font-medium">{value}</span>;
}

export default function PricingPage() {
  const openclawFeatures = getFeaturesByFramework('openclaw');
  const accountFeatures = getFeaturesByFramework('account');

  const openclawGrouped = groupByCategory(openclawFeatures);

  return (
    <motion.div
      className="min-h-screen"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mx-auto max-w-6xl px-4 py-16">
        {/* HERO */}
        <motion.div
          className="text-center mb-16 relative"
          variants={sectionVariants}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.12),transparent_60%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.06),transparent_60%)] pointer-events-none" />
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] text-xs font-medium mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Transparent Pricing
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 relative" style={displayFont}>
            <span className="text-gradient">Simple, Transparent</span>{' '}
            <span className="text-[var(--text-primary)]">Pricing</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto leading-relaxed relative">
            Every agent starts free with Groq LLM. Unlock features a la carte with platform tokens.
            Bring your own API key anytime -- always free.
          </p>
        </motion.div>

        {/* FREE BASELINE */}
        <motion.section className="mb-20" variants={sectionVariants}>
          <div className="card-gradient-border glass-noise p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,rgba(34,197,94,0.06),transparent_70%)] pointer-events-none" />
            <div className="flex items-center gap-3 mb-6 relative">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Free Baseline</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 rounded-full">
                  free forever
                </span>
              </div>
            </div>
            <p className="text-[var(--text-muted)] text-sm mb-6 relative">
              Every agent gets this -- no wallet required, no payment needed.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 relative">
              {[
                `${FREE_TIER_LIMITS.maxActiveAgents} active agent`,
                'Groq Llama LLM (free)',
                'BYOK (Bring Your Own Key) -- always free',
                `${FREE_TIER_LIMITS.chatMessagesPerDay} chat messages / day`,
                `${FREE_TIER_LIMITS.logRetentionHours}h log retention`,
                `${FREE_TIER_LIMITS.openclaw.maxSkills} basic skills`,
                'Shared container resources',
                'Community support',
              ].map((f, i) => (
                <motion.div
                  key={f}
                  className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]"
                  custom={i}
                  variants={checkVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <span>{f}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 pt-5 border-t border-[rgba(46,43,74,0.3)] relative">
              <Link
                href="/create"
                className="btn-primary"
              >
                <Rocket className="w-4 h-4" />
                Create Free Agent
              </Link>
            </div>
          </div>
        </motion.section>

        {/* OPENCLAW FEATURES */}
        <FrameworkFeaturesSection
          framework="openclaw"
          categories={openclawGrouped}
        />

        {/* BUNDLES */}
        <motion.section
          className="mb-20"
          variants={scrollFadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3 flex items-center justify-center gap-3" style={displayFont}>
              <Package className="w-6 h-6 text-[#f97316]" />
              <span className="text-[var(--text-primary)]">Bundles</span>
            </h2>
            <p className="text-[var(--text-muted)] text-sm">Save by purchasing features together</p>
          </div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={staggerGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {BUNDLES.map((bundle) => {
              const isPopular = POPULAR_BUNDLES.includes(bundle.key);
              return (
                <motion.div
                  key={bundle.key}
                  className={cn(
                    'card glass-noise p-5 flex flex-col relative',
                    isPopular && 'border-[#f97316]/30 shadow-[0_0_24px_rgba(249,115,22,0.08)]'
                  )}
                  whileHover={cardHover}
                  variants={staggerItem}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white text-[10px] font-bold uppercase tracking-wider shadow-[0_0_16px_rgba(249,115,22,0.4)]">
                        <Flame className="w-3 h-3" />
                        POPULAR
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[var(--text-muted)] border border-[rgba(46,43,74,0.4)] px-2 py-0.5 rounded-lg">
                      OpenClaw
                    </span>
                    <span className="text-lg font-extrabold">
                      <span className="text-gradient">${bundle.usdPrice}</span>
                    </span>
                  </div>
                  <h3 className="font-bold text-[var(--text-primary)] mb-1">{bundle.name}</h3>
                  <p className="text-[var(--text-muted)] text-sm mb-4">{bundle.description}</p>
                  <div className="space-y-1.5 flex-1">
                    {bundle.features.map((fk, i) => {
                      const feat = FEATURE_CATALOG.find((f) => f.key === fk);
                      return (
                        <motion.div
                          key={fk}
                          className="text-xs text-[var(--text-secondary)] flex items-center gap-2"
                          custom={i}
                          variants={checkVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          <div className="w-4 h-4 rounded-full bg-[#f97316]/15 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-[#f97316]" />
                          </div>
                          <span>{feat?.name ?? fk}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-[rgba(46,43,74,0.3)]">
                    <span className={cn(
                      'text-xs px-2.5 py-1 rounded-lg border font-medium',
                      bundle.type === 'one_time'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20'
                    )}>
                      {bundle.type === 'one_time' ? 'one-time' : '/mo'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.section>

        {/* CREDIT PACKS */}
        <motion.section
          className="mb-20"
          variants={scrollFadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3 flex items-center justify-center gap-3" style={displayFont}>
              <CreditCard className="w-6 h-6 text-[#f97316]" />
              <span className="text-[var(--text-primary)]">Hatcher Credits</span>
            </h2>
            <p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto">
              Don&apos;t have your own API key? Buy credits to use premium models through Hatcher.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            {CREDIT_PACKS.map((pack, index) => {
              const isBestValue = index === CREDIT_PACKS.length - 1;
              return (
                <motion.div
                  key={pack.key}
                  className={cn(
                    'card glass-noise p-6 text-center relative',
                    isBestValue && 'card-gradient-border'
                  )}
                  whileHover={cardHover}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {isBestValue && (
                    <>
                      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.08),transparent_60%)] pointer-events-none" />
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white text-[10px] font-bold uppercase tracking-wider shadow-[0_0_16px_rgba(249,115,22,0.4)]">
                          <Star className="w-3 h-3" />
                          BEST VALUE
                        </span>
                      </div>
                    </>
                  )}
                  <h3 className="font-bold text-[var(--text-primary)] text-lg mb-2 relative">{pack.label}</h3>
                  <div className="text-3xl font-extrabold mb-1 relative">
                    <span className="text-gradient">${pack.hatchUsd}</span>
                  </div>
                  <p className="text-[var(--text-muted)] text-xs mb-5 relative">in tokens</p>
                  <div className="bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.3)] rounded-xl px-4 py-3 mb-3 backdrop-blur-sm relative">
                    <span className="text-sm text-[var(--text-secondary)]">
                      ${pack.creditsUsd} <span className="text-[var(--text-muted)]">in credits</span>
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] relative">Use with any hosted model</p>
                </motion.div>
              );
            })}
          </div>

          {/* Model pricing table */}
          <div className="card glass-noise p-5">
            <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-4 font-medium">
              Available Models (Hosted Credits)
            </h4>
            <div className="grid sm:grid-cols-3 gap-3">
              {HOSTED_CREDIT_MODELS.map((m) => (
                <motion.div
                  key={m.model}
                  className="flex items-center gap-3 bg-[rgba(26,23,48,0.6)] border border-[rgba(46,43,74,0.3)] rounded-xl px-4 py-3 backdrop-blur-sm transition-all duration-200"
                  whileHover={{ borderColor: 'rgba(249, 115, 22, 0.3)', boxShadow: '0 0 16px rgba(249,115,22,0.06)' }}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--text-primary)]">{m.label}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{m.provider}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[var(--text-muted)]">in: ${m.inputPer1k}/1k</div>
                    <div className="text-xs text-[var(--text-muted)]">out: ${m.outputPer1k}/1k</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ACCOUNT FEATURES */}
        <motion.section
          className="mb-20"
          variants={scrollFadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3 flex items-center justify-center gap-3" style={displayFont}>
              <Shield className="w-6 h-6 text-[#f97316]" />
              <span className="text-[var(--text-primary)]">Account Features</span>
            </h2>
            <p className="text-[var(--text-muted)] text-sm">Scale your agent fleet with account-level upgrades</p>
          </div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={staggerGrid}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {accountFeatures.map((f) => {
              const isRecommended = f.key === 'account.agents.5';
              return (
                <motion.div
                  key={f.key}
                  className={cn(
                    'card glass-noise p-5 relative',
                    isRecommended && 'border-[#f97316]/30 shadow-[0_0_20px_rgba(249,115,22,0.08)]'
                  )}
                  whileHover={cardHover}
                  variants={staggerItem}
                >
                  {isRecommended && (
                    <div className="absolute -top-2.5 right-4 z-10">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white text-[9px] font-bold uppercase tracking-wider">
                        <Crown className="w-2.5 h-2.5" />
                        RECOMMENDED
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">{f.name}</h3>
                    <span className="font-bold">
                      <span className="text-gradient text-lg">${f.usdPrice}</span>
                      <span className="text-xs text-[var(--text-muted)] font-normal">/mo</span>
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-3">{f.description}</p>
                  <span className="text-xs px-2.5 py-1 rounded-lg border bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20 font-medium">
                    /mo
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.section>

        {/* COMPARE PLANS */}
        <motion.section
          className="mb-20"
          variants={scrollFadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3 flex items-center justify-center gap-3" style={displayFont}>
              <Table className="w-6 h-6 text-[#f97316]" />
              <span className="text-[var(--text-primary)]">Compare Plans</span>
            </h2>
            <p className="text-[var(--text-muted)] text-sm">See what each plan includes at a glance</p>
          </div>

          <div className="card glass-noise p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(46,43,74,0.4)]">
                    <th className="text-left p-5 text-[var(--text-muted)] font-medium text-xs uppercase tracking-wider w-[40%]">Feature</th>
                    <th className="text-center p-5 text-green-400 font-semibold">
                      <div className="text-xs uppercase tracking-wider mb-1">Free</div>
                      <div className="text-lg font-extrabold">$0</div>
                    </th>
                    <th className="text-center p-5 text-[var(--text-primary)] font-semibold">
                      <div className="text-xs uppercase tracking-wider mb-1">Starter</div>
                      <div className="text-lg font-extrabold text-gradient">$18</div>
                    </th>
                    <th className="text-center p-5 text-[var(--text-primary)] font-semibold">
                      <div className="text-xs uppercase tracking-wider mb-1">Power</div>
                      <div className="text-lg font-extrabold text-gradient">$30<span className="text-xs text-[var(--text-muted)] font-normal">/mo</span></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_PLANS.map((row, i) => (
                    <motion.tr
                      key={row.feature}
                      className={cn(
                        'border-b border-[rgba(46,43,74,0.2)] transition-colors hover:bg-white/[0.02]',
                        i % 2 === 0 && 'bg-white/[0.01]'
                      )}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <td className="p-4 text-[var(--text-secondary)]">{row.feature}</td>
                      <td className="p-4 text-center">{renderPlanCell(row.free)}</td>
                      <td className="p-4 text-center bg-[#f97316]/[0.02]">{renderPlanCell(row.starter)}</td>
                      <td className="p-4 text-center">{renderPlanCell(row.power)}</td>
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
              <HelpCircle className="w-6 h-6 text-[#f97316]" />
              <span className="text-[var(--text-primary)]">Frequently Asked Questions</span>
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ.map((item, index) => (
              <FAQItem key={item.q} q={item.q} a={item.a} index={index} />
            ))}
          </div>
        </motion.section>

        {/* CTA BANNER */}
        <motion.div
          className="card-gradient-border glass-noise p-10 sm:p-14 text-center relative overflow-hidden"
          variants={scrollFadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.1),transparent_60%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.05),transparent_60%)] pointer-events-none" />
          <RobotMascot size="lg" mood="waving" className="mx-auto mb-6 relative" />
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 relative" style={displayFont}>
            <span className="text-gradient">Ready to hatch</span>{' '}
            <span className="text-[var(--text-primary)]">your agent?</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-base max-w-lg mx-auto mb-8 leading-relaxed relative">
            Start free with Groq LLM. Bring your own API key anytime -- always free.
            Unlock premium features with tokens when you are ready.
          </p>
          <div className="flex items-center justify-center gap-4 relative">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/create"
                className="btn-primary px-10 py-4 text-base font-bold"
              >
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
      </div>
    </motion.div>
  );
}

// ── Framework Features Section ─────────────────────────────────

function FrameworkFeaturesSection({
  framework,
  categories,
}: {
  framework: AgentFramework;
  categories: Record<string, FeaturePricing[]>;
}) {
  const meta = FRAMEWORKS[framework];

  return (
    <motion.section
      className="mb-20"
      variants={scrollFadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold mb-3 flex items-center justify-center gap-3" style={displayFont}>
          <Zap className="w-6 h-6 text-[#f97316]" />
          <span className="text-[var(--text-primary)]">{meta.name} Features</span>
        </h2>
        <p className="text-[var(--text-muted)] text-sm max-w-lg mx-auto">{meta.description}</p>
      </div>

      <div className="space-y-6">
        {Object.entries(categories).map(([category, features]) => (
          <div key={category}>
            <h3 className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-3 px-1">{category}</h3>
            <motion.div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
              variants={staggerGrid}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
            >
              {features.map((f) => {
                const isRecommended = RECOMMENDED_FEATURES.includes(f.key);
                return (
                  <motion.div
                    key={f.key}
                    className={cn(
                      'card glass-noise p-4 relative',
                      isRecommended && 'border-[#f97316]/25'
                    )}
                    whileHover={cardHover}
                    variants={staggerItem}
                  >
                    {isRecommended && (
                      <div className="absolute -top-2 right-3 z-10">
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#f97316] text-white text-[8px] font-bold uppercase tracking-wider">
                          <Star className="w-2 h-2" />
                          Popular
                        </span>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{f.name}</span>
                        {f.free && (
                          <span className="text-[10px] text-green-400 border border-green-500/20 bg-green-500/10 rounded-full px-2 py-0.5 font-medium">
                            free
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {f.usdPrice === 0 ? (
                          <span className="text-green-400 font-bold text-sm">free</span>
                        ) : (
                          <span className="font-bold text-sm text-gradient">${f.usdPrice}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-3">{f.description}</p>
                    <span className={cn(
                      'text-xs px-2.5 py-1 rounded-lg border font-medium',
                      f.type === 'one_time'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20'
                    )}>
                      {f.type === 'one_time' ? 'one-time' : '/mo'}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

// ── FAQ Accordion ──────────────────────────────────────────────

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className={cn(
        'card glass-noise overflow-hidden transition-all duration-200',
        open && 'border-[rgba(249,115,22,0.3)] shadow-[0_0_20px_rgba(249,115,22,0.06)]'
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left group"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] pr-4 group-hover:text-[#f97316] transition-colors">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
            open ? 'bg-[#f97316]/15' : 'bg-white/[0.03]'
          )}
        >
          <ChevronDown className={cn('w-4 h-4 transition-colors', open ? 'text-[#f97316]' : 'text-[var(--text-muted)]')} />
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
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[rgba(249,115,22,0.2)] to-transparent mb-4" />
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
    q: 'Do I need a Solana wallet to create an agent?',
    a: 'You need a wallet to authenticate (Phantom or Solflare). Creating and using the free tier is completely free -- you only need tokens when unlocking paid features.',
  },
  {
    q: 'What is BYOK (Bring Your Own Key)?',
    a: 'BYOK lets you use your own API key for any LLM provider (OpenAI, Anthropic, Google, etc). This is always free -- you just pay the provider directly. No Hatcher markup.',
  },
  {
    q: 'How are Hatcher Credits different from BYOK?',
    a: 'Credits let you use premium models (Claude Haiku 4.5, GPT-4o mini, Gemini 2.0 Flash) through Hatcher without your own API key. You buy credit packs with tokens and we proxy the calls.',
  },
  {
    q: 'How is the token price determined?',
    a: 'Feature prices are listed in USD. The equivalent token amount is calculated at payment time using the live Jupiter Price API rate.',
  },
  {
    q: 'What framework does Hatcher use?',
    a: 'Hatcher runs agents powered by OpenClaw -- autonomous agents with 13,700+ skills, 20+ messaging platforms, and persistent memory. Each agent runs in a real Docker container.',
  },
  {
    q: 'Can I run multiple agents?',
    a: 'Free tier allows 1 active agent. Purchase account.agents.5 ($18/mo), account.agents.20 ($55/mo), or unlimited ($180/mo) to run more.',
  },
  {
    q: 'What happens if I unlock a one-time feature?',
    a: 'One-time features (like platform integrations and plugins) are permanent -- pay once and keep them forever. Subscription features (like persistent memory) renew monthly.',
  },
  {
    q: 'Is the token launched?',
    a: 'The token has not launched yet. Stay tuned for official announcements on our social channels.',
  },
];
