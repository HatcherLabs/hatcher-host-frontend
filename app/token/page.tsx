'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FEATURE_CATALOG, TOKEN_ECONOMY } from '@hatcher/shared';
import {
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Shield,
  Sparkles,
  TrendingDown,
  Wallet,
  Zap,
  Globe,
  CreditCard,
  Vote,
  Rocket,
  Search,
} from 'lucide-react';
import { useState } from 'react';

const HATCH_MINT = process.env.NEXT_PUBLIC_HATCH_TOKEN_MINT || 'HATCH_TOKEN_MINT';

/* ── Animation variants ─────────────────────────────────── */
const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

/* ── Data ──────────────────────────────────────────────── */
const TOKEN_UTILITY = FEATURE_CATALOG
  .filter((f) => f.framework === 'openclaw' && f.usdPrice > 0)
  .slice(0, 12)
  .map((f) => ({
    feature: f.name,
    price: f.type === 'subscription' ? `$${f.usdPrice}/mo` : `$${f.usdPrice}`,
    type: f.type === 'subscription' ? 'Monthly' : 'One-time',
    category: f.category,
  }));

const TOKENOMICS = [
  {
    label: `${TOKEN_ECONOMY.burnRate * 100}% Burned`,
    description: 'Half of every $HATCH payment is permanently burned, reducing total supply over time.',
    icon: Flame,
    color: '#F87171',
  },
  {
    label: `${TOKEN_ECONOMY.treasuryRate * 100}% Treasury`,
    description: 'The other half funds platform development, liquidity, and the team runway.',
    icon: Shield,
    color: '#f97316',
  },
  {
    label: 'PumpFun Launch',
    description: '$HATCH launched on PumpFun and graduates to Raydium at full bonding curve.',
    icon: Sparkles,
    color: '#f97316',
  },
  {
    label: 'Deflationary',
    description: 'Every feature unlock, every payment, every subscription burns more supply forever.',
    icon: TrendingDown,
    color: '#4ADE80',
  },
];

const USE_CASES = [
  {
    icon: Zap,
    title: 'Agent Features',
    description: 'Unlock premium platforms, skills, cron jobs, webhooks, persistent memory, multi-agent routing, and voice capabilities for your AI agents.',
    color: '#f97316',
  },
  {
    icon: CreditCard,
    title: 'Platform Credits',
    description: 'Purchase hosted LLM credits to power your agents with GPT-4o mini, Haiku, or Gemini Flash without managing your own API keys.',
    color: '#22D3EE',
  },
  {
    icon: Vote,
    title: 'Governance',
    description: 'Hold $HATCH to participate in platform governance decisions, vote on new features, framework support, and the future roadmap.',
    color: '#A78BFA',
  },
];

const HOW_TO_BUY_STEPS = [
  {
    step: '01',
    title: 'Get a Solana Wallet',
    description: 'Download Phantom or Backpack. Create a wallet and secure your seed phrase. Fund it with SOL from any exchange like Coinbase or Binance.',
    icon: Wallet,
  },
  {
    step: '02',
    title: 'Go to Jupiter DEX',
    description: 'Open Jupiter (jup.ag), connect your wallet, and select SOL as the input token. Jupiter finds the best swap route across all Solana DEXes.',
    icon: Globe,
  },
  {
    step: '03',
    title: 'Paste Contract & Swap',
    description: 'Paste the $HATCH contract address as the output token. Set your amount, confirm the transaction, and you\'re done.',
    icon: Rocket,
  },
];

const TRADING_LINKS = [
  {
    name: 'Jupiter',
    description: 'Best DEX aggregator',
    url: 'https://jup.ag/swap/SOL-HATCH',
    color: '#22D3EE',
  },
  {
    name: 'Birdeye',
    description: 'Charts & analytics',
    url: `https://birdeye.so/token/${HATCH_MINT}?chain=solana`,
    color: '#4ADE80',
  },
  {
    name: 'DexScreener',
    description: 'Real-time trading',
    url: `https://dexscreener.com/solana/${HATCH_MINT}`,
    color: '#A78BFA',
  },
];

/* ── Contract Address Component ────────────────────────── */
function ContractAddress({ mint, compact }: { mint: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`inline-flex items-center gap-3 rounded-xl bg-[#1A1730] border border-[rgba(46,43,74,0.6)] ${compact ? 'px-4 py-2.5' : 'px-5 py-3'}`}>
      <span className="text-xs text-[#71717a] uppercase tracking-wider font-medium">CA</span>
      <code className="font-[family-name:var(--font-mono)] text-sm text-[#A5A1C2] select-all">
        {compact ? `${mint.slice(0, 6)}...${mint.slice(-4)}` : mint}
      </code>
      <button
        onClick={copy}
        className="text-[#71717a] hover:text-[#f97316] transition-colors p-1 rounded-lg hover:bg-white/5"
        aria-label="Copy contract address"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
      <a
        href={`https://solscan.io/token/${mint}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#71717a] hover:text-[#f97316] transition-colors p-1 rounded-lg hover:bg-white/5"
        aria-label="View on Solscan"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────── */
export default function TokenPage() {
  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative py-28 md:py-36 px-4 text-center">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full bg-gradient-to-br from-[#f97316]/12 via-[#f97316]/6 to-transparent blur-3xl" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] rounded-full bg-[#ea580c]/5 blur-3xl" />
          <div className="absolute -bottom-20 left-1/4 w-[300px] h-[300px] rounded-full bg-[#f97316]/4 blur-3xl" />
        </div>

        <motion.div
          className="mx-auto max-w-4xl"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#f97316]/25 bg-[#f97316]/8 text-[#f97316] text-sm font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse" />
            Live on Solana
          </motion.div>

          <motion.div
            variants={scaleIn}
            className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center text-5xl mx-auto mb-8 shadow-[0_0_60px_rgba(249,115,22,0.35)]"
            style={{ animation: 'float 3s ease-in-out infinite' }}
          >
            &#x1F95A;
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-extrabold mb-5 tracking-tight">
            <span className="text-gradient">$HATCH</span>{' '}
            <span className="text-[var(--text-primary)]">Token</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed text-[var(--text-secondary)]">
            The fuel of the Hatcher platform. Pay for premium AI agent features, purchase hosted LLM credits, and watch supply deflate with every transaction.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://jup.ag/swap/SOL-HATCH"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2"
            >
              Buy on Jupiter
              <ExternalLink className="w-4 h-4" />
            </a>
            <Link href="/pricing" className="btn-secondary text-base px-8 py-3.5 inline-flex items-center gap-2">
              View Feature Pricing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-10">
            <ContractAddress mint={HATCH_MINT} />
          </motion.div>
        </motion.div>
      </section>

      {/* ── TOKEN INFO CARD ────────────────────────────────── */}
      <motion.section
        className="py-16 px-4"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="mx-auto max-w-4xl">
          <motion.div variants={fadeUp} className="card glass-noise p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-[#f97316]/15 flex items-center justify-center">
                <Search className="w-5 h-5 text-[#f97316]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Token Info</h2>
            </div>

            <div className="grid gap-6">
              {/* Contract Address */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-6 border-b border-[rgba(46,43,74,0.6)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Contract Address</span>
                <div className="min-w-0 flex-1">
                  <ContractAddress mint={HATCH_MINT} compact />
                </div>
              </div>

              {/* Network */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-6 border-b border-[rgba(46,43,74,0.6)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Network</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#9945FF]" />
                  <span className="text-[var(--text-primary)] font-medium">Solana</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#9945FF]/10 text-[#9945FF] border border-[#9945FF]/20 font-medium">SPL Token</span>
                </div>
              </div>

              {/* Token Standard */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-6 border-b border-[rgba(46,43,74,0.6)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Launch</span>
                <span className="text-[var(--text-primary)] font-medium">PumpFun &rarr; Raydium graduation</span>
              </div>

              {/* Supply Info */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-6 border-b border-[rgba(46,43,74,0.6)]">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Supply Model</span>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--text-primary)] font-medium">Deflationary</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20 font-medium flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    {TOKEN_ECONOMY.burnRate * 100}% burn per tx
                  </span>
                </div>
              </div>

              {/* Decimals */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium w-40 flex-shrink-0">Decimals</span>
                <span className="text-[var(--text-primary)] font-medium font-[family-name:var(--font-mono)]">6</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── TOKENOMICS GRID ──────────────────────────────────── */}
      <motion.section
        className="py-20 px-4"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="mx-auto max-w-6xl">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <div className="section-label mb-3">Tokenomics</div>
            <h2 className="text-4xl font-bold mb-4 text-[var(--text-primary)]">Designed to Deflate</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Every dollar spent on the platform permanently removes $HATCH from circulation.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TOKENOMICS.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  className="card glass-noise p-6 hover:scale-[1.02] transition-transform duration-300 group"
                  variants={fadeUp}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                    style={{ background: item.color + '20' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: item.color }}>{item.label}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ── USE CASES ──────────────────────────────────────── */}
      <motion.section
        className="py-20 px-4"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="mx-auto max-w-6xl">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <div className="section-label mb-3">Use Cases</div>
            <h2 className="text-4xl font-bold mb-4 text-[var(--text-primary)]">What $HATCH Powers</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              $HATCH is the native currency of the Hatcher ecosystem, used for everything from feature unlocks to governance.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {USE_CASES.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  className="card glass-noise p-8 group"
                  variants={fadeUp}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: item.color + '15', border: `1px solid ${item.color}25` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: item.color }} />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-[var(--text-primary)]">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ── HOW TO BUY ───────────────────────────────────────── */}
      <motion.section
        className="py-20 px-4"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="mx-auto max-w-5xl">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <div className="section-label mb-3">How to Buy</div>
            <h2 className="text-4xl font-bold mb-4 text-[var(--text-primary)]">Get $HATCH in 3 Steps</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Swap SOL for $HATCH on Jupiter, the best DEX aggregator on Solana.
            </p>
          </motion.div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {HOW_TO_BUY_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  className="card glass-noise p-7 group relative overflow-hidden"
                  variants={fadeUp}
                >
                  {/* Step number watermark */}
                  <div className="absolute -top-2 -right-2 text-[80px] font-extrabold leading-none text-white/[0.02] pointer-events-none select-none">
                    {item.step}
                  </div>

                  <div className="relative">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-12 h-12 rounded-xl bg-[#f97316]/12 border border-[#f97316]/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-6 h-6 text-[#f97316]" />
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-[#f97316]/10 flex items-center justify-center text-[#f97316] font-bold text-sm flex-shrink-0">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-[var(--text-primary)]">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Contract address reminder */}
          <motion.div variants={fadeUp} className="text-center mb-8">
            <p className="text-sm text-[var(--text-muted)] mb-4">Paste this contract address in Jupiter:</p>
            <ContractAddress mint={HATCH_MINT} />
          </motion.div>
        </div>
      </motion.section>

      {/* ── TRADING LINKS ──────────────────────────────────── */}
      <motion.section
        className="py-16 px-4"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="mx-auto max-w-4xl">
          <motion.div variants={fadeUp} className="text-center mb-10">
            <div className="section-label mb-3">Trade & Track</div>
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">Where to Trade $HATCH</h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-5">
            {TRADING_LINKS.map((link) => (
              <motion.a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card glass-noise p-6 group text-center block"
                variants={fadeUp}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: link.color + '15', border: `1px solid ${link.color}25` }}
                >
                  <ExternalLink className="w-5 h-5" style={{ color: link.color }} />
                </div>
                <h3 className="font-bold text-lg mb-1 text-[var(--text-primary)] group-hover:text-[#f97316] transition-colors">{link.name}</h3>
                <p className="text-sm text-[var(--text-muted)]">{link.description}</p>
              </motion.a>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── TOKEN UTILITY TABLE ──────────────────────────────── */}
      <motion.section
        className="py-20 px-4"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="mx-auto max-w-4xl">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <div className="section-label mb-3">Utility</div>
            <h2 className="text-4xl font-bold mb-4 text-[var(--text-primary)]">What You Can Unlock</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Every premium feature is priced in USD and paid with $HATCH at live Jupiter price.
              <strong className="text-green-400"> BYOK (Bring Your Own Key) is always free.</strong>
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="card glass-noise overflow-hidden">
            <div className="grid grid-cols-4 px-5 py-3 border-b border-[var(--border-default)] bg-[var(--accent-glow)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Feature</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Category</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-center text-[var(--text-muted)]">Price</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-right text-[var(--text-muted)]">Type</span>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              {TOKEN_UTILITY.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-4 px-5 py-3.5 hover:bg-[#f97316]/5 transition-colors duration-200"
                >
                  <span className="text-sm font-medium text-[var(--text-primary)]">{row.feature}</span>
                  <span className="text-sm text-[var(--text-muted)]">{row.category}</span>
                  <span className="text-sm text-[var(--accent-400)] font-semibold text-center">{row.price}</span>
                  <span className="text-sm text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      row.type === 'One-time'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/20'
                    }`}>
                      {row.type}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-[var(--border-default)] bg-[var(--accent-glow)]">
              <p className="text-xs text-[var(--text-muted)]">
                Actual $HATCH amount calculated live via Jupiter Price API at time of purchase.
                See <Link href="/pricing" className="text-[var(--accent-400)] hover:underline">full pricing page</Link> for all features.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-4xl">
          <motion.div
            className="relative rounded-3xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#f97316]/15 via-[#f97316]/10 to-[#ea580c]/10" />
            <div className="absolute inset-0 border border-[#f97316]/20 rounded-3xl" />
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-[#f97316]/10 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-[#f97316]/8 blur-3xl" />

            <div className="relative text-center px-8 py-16">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-[var(--text-primary)]">
                Every feature burns $HATCH
              </h2>
              <p className="text-lg mb-10 max-w-xl mx-auto text-[var(--text-secondary)]">
                The more agents that get deployed and features unlocked, the more deflationary $HATCH becomes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create" className="btn-primary text-base px-10 py-4 inline-flex items-center gap-2">
                  Launch an Agent
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="https://jup.ag/swap/SOL-HATCH"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-base px-8 py-4 inline-flex items-center gap-2"
                >
                  Buy $HATCH on Jupiter
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
