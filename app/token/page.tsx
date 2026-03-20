'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FEATURE_CATALOG, TOKEN_ECONOMY } from '@hatcher/shared';
import { ArrowRight, Copy, Check, ExternalLink, Flame, Shield, Sparkles, TrendingDown, Wallet } from 'lucide-react';
import { useState } from 'react';

const HATCH_MINT = process.env.NEXT_PUBLIC_HATCH_TOKEN_MINT ?? '';

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// Use actual prices from FEATURE_CATALOG
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

function ContractAddress({ mint }: { mint: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${mint.slice(0, 6)}...${mint.slice(-4)}`;

  function copy() {
    navigator.clipboard.writeText(mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-[#1A1730] border border-[rgba(46,43,74,0.6)]">
      <span className="text-xs text-[#71717a] uppercase tracking-wider font-medium">CA</span>
      <code className="font-mono text-sm text-[#A5A1C2]">{short}</code>
      <button onClick={copy} className="text-[#71717a] hover:text-[#f97316] transition-colors" aria-label="Copy contract address">
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
      <a
        href={`https://solscan.io/token/${mint}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#71717a] hover:text-[#f97316] transition-colors"
        aria-label="View on Solscan"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

export default function TokenPage() {
  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative py-24 px-4 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-gradient-to-br from-[#f97316]/12 via-[#f97316]/8 to-transparent blur-3xl" />
          <div className="absolute top-10 right-1/3 w-[350px] h-[350px] rounded-full bg-[#ea580c]/5 blur-3xl" />
        </div>

        <motion.div
          className="mx-auto max-w-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#f97316]/25 bg-[#f97316]/8 text-[#f97316] text-sm font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse" />
            Live on Solana
          </div>

          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center text-4xl mx-auto mb-6 shadow-[0_0_40px_rgba(249,115,22,0.3)]">
            &#x1F95A;
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-5 tracking-tight">
            <span className="text-gradient">$HATCH Token</span>
          </h1>

          <p className="text-xl mb-10 max-w-2xl mx-auto leading-relaxed text-[var(--text-secondary)]">
            The fuel of the Hatcher platform. Pay for premium AI agent features, earn through referrals, and watch supply deflate with every transaction.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
          </div>

          {HATCH_MINT && (
            <ContractAddress mint={HATCH_MINT} />
          )}
        </motion.div>
      </section>

      {/* ── TOKENOMICS GRID ──────────────────────────────────── */}
      <motion.section
        className="py-20 px-4"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="section-label mb-3">Tokenomics</div>
            <h2 className="text-4xl font-bold mb-4 text-[var(--text-primary)]">Designed to Deflate</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Every dollar spent on the platform permanently removes $HATCH from circulation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TOKENOMICS.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  className="card glass-noise p-6 hover:scale-[1.02] transition-transform duration-300 group"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
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

      {/* ── HOW TO BUY ───────────────────────────────────────── */}
      <motion.section
        className="py-20 px-4"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <div className="section-label mb-3">Acquisition</div>
            <h2 className="text-4xl font-bold mb-4 text-[var(--text-primary)]">How to Buy $HATCH</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Get $HATCH in three simple steps via Jupiter — the best DEX aggregator on Solana.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              {
                step: '01',
                title: 'Get a Solana Wallet',
                description: 'Download Phantom or Backpack. Create a wallet and secure your seed phrase.',
              },
              {
                step: '02',
                title: 'Buy SOL',
                description: 'Purchase SOL from any exchange (Coinbase, Binance) and transfer it to your wallet.',
              },
              {
                step: '03',
                title: 'Swap for $HATCH',
                description: 'Go to Jupiter, paste the $HATCH contract address, and swap your SOL.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="card glass-noise p-6 transition-all duration-200"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#f97316]/15 border border-[#f97316]/25 flex items-center justify-center text-[#f97316] font-bold text-sm flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1.5 text-[var(--text-primary)]">{item.title}</h3>
                    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <a
              href="https://jup.ag/swap/SOL-HATCH"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-base px-10 py-4 inline-flex items-center gap-2"
            >
              <Wallet className="w-5 h-5" />
              Swap on Jupiter
            </a>
          </div>
        </div>
      </motion.section>

      {/* ── TOKEN UTILITY TABLE ──────────────────────────────── */}
      <motion.section
        className="py-20 px-4"
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="section-label mb-3">Utility</div>
            <h2 className="text-4xl font-bold mb-4 text-[var(--text-primary)]">What You Can Unlock</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Every premium feature is priced in USD and paid with $HATCH at live Jupiter price.
              <strong className="text-green-400"> BYOK (Bring Your Own Key) is always free.</strong>
            </p>
          </div>

          <div className="card glass-noise overflow-hidden">
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
          </div>
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
