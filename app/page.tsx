'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

import {
  ArrowRight,
  Check,
  ChevronDown,
  Cpu,
  Brain,
  Bot,
  Sparkles,
  Globe,
  Key,
  Shield,
  Zap,
  MessageSquare,
  BarChart3,
  Users,
  Activity,
  X,
} from 'lucide-react';
import { DOCS_URL } from '@/lib/config';
import { FOUNDING_MEMBER_MAX_SLOTS } from '@hatcher/shared';
import { AgentDiscoverySection } from '@/components/landing/AgentDiscoverySection';

// ─── Shared animation config ──────────────────────────────────
// Slide-only animation (no opacity gate). Sections render fully
// visible in SSR + headless screenshots + reduced-motion users — the
// scroll-triggered animation is just a polish slide-up, not a
// visibility prerequisite. Previous opacity:0 caused crawlers, OG
// preview generators, and static screenshots to see ~2000px of
// empty page below the hero.
const ease = [0.25, 0.46, 0.45, 0.94] as const;
const fadeUp = { initial: { y: 30 }, whileInView: { y: 0 }, viewport: { once: true, amount: 0.1 } };

// ─── Public stats (users / agents / active) ──────────────────
interface PlatformStats {
  totalUsers: number;
  totalAgents: number;
  activeAgents: number;
}

function StatProofCard({
  label,
  value,
  icon: Icon,
  iconColor,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  loading: boolean;
}) {
  return (
    <div className="card glass-noise p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.08em] font-semibold block mb-1.5 text-[var(--text-muted)] whitespace-nowrap">
            {label}
          </span>
          {loading ? (
            <span className="inline-block h-7 w-16 rounded shimmer" />
          ) : (
            <span className="text-xl sm:text-[28px] leading-[1.1] font-bold block text-[var(--text-primary)] truncate">
              {value}
            </span>
          )}
        </div>
        {/* Icon hidden on xs — mobile cards are ~100px wide and an icon
            box eats the space we need for the label + value. */}
        <div
          className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-xl items-center justify-center flex-shrink-0"
          style={{ background: iconColor + '18' }}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  );
}

function HeroStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getPlatformStats();
        if (cancelled) return;
        if (res.success) setStats(res.data);
      } catch {
        // silent — stats are decorative; landing still renders
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString());

  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.6, ease, delay: 0.2 }}
      className="max-w-4xl mx-auto grid grid-cols-3 gap-3 sm:gap-4"
    >
      <StatProofCard
        label="Users"
        value={stats ? fmt(stats.totalUsers) : '—'}
        icon={Users}
        iconColor="var(--color-accent)"
        loading={loading}
      />
      <StatProofCard
        label="Agents"
        value={stats ? fmt(stats.totalAgents) : '—'}
        icon={Bot}
        iconColor="#60A5FA"
        loading={loading}
      />
      <StatProofCard
        label="Active now"
        value={stats ? fmt(stats.activeAgents) : '—'}
        icon={Activity}
        iconColor="#4ADE80"
        loading={loading}
      />
    </motion.div>
  );
}

// ─── Typewriter effect ───────────────────────────────────────
const TYPEWRITER_WORDS = ['AI Agent', 'Fitness Coach', 'Crypto Tracker', 'Study Buddy', 'Travel Planner', 'Personal Assistant'];
// Longest word reserves layout space so the headline never reflows mid-cycle
// (which causes CLS + the trailing chat-preview card to jitter).
const LONGEST_WORD = TYPEWRITER_WORDS.reduce((a, b) => (b.length > a.length ? b : a));

function Typewriter() {
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = TYPEWRITER_WORDS[wordIndex]!;
    const speed = deleting ? 40 : 80;

    if (!deleting && charIndex === word.length) {
      const pause = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(pause);
    }
    if (deleting && charIndex === 0) {
      setDeleting(false);
      setWordIndex((i) => (i + 1) % TYPEWRITER_WORDS.length);
      return;
    }

    const timer = setTimeout(() => {
      setCharIndex((c) => c + (deleting ? -1 : 1));
    }, speed);
    return () => clearTimeout(timer);
  }, [charIndex, deleting, wordIndex]);

  const word = TYPEWRITER_WORDS[wordIndex]!;
  const displayed = word.slice(0, charIndex);

  return (
    <span className="relative inline-block align-baseline">
      {/* Invisible spacer reserves space for the longest word so layout never reflows. */}
      <span aria-hidden="true" className="invisible whitespace-nowrap">{LONGEST_WORD}</span>
      <span className="absolute inset-0 text-[var(--color-accent)] whitespace-nowrap">
        {displayed}
        <span className="animate-pulse opacity-70">|</span>
      </span>
    </span>
  );
}

// ─── Live agent demo preview ──────────────────────────────────
function AgentPreview() {
  const [solPrice, setSolPrice] = useState<number | null>(null);

  useEffect(() => {
    api.getPrice('sol').then((res) => {
      if (res.success && res.data.price) setSolPrice(res.data.price);
    }).catch(() => {});
  }, []);

  const priceStr = solPrice ? `$${solPrice.toFixed(2)}` : '$---.--';
  const alertPrice = solPrice ? `$${Math.round(solPrice * 0.95)}` : '$---';

  const messages = [
    { role: 'user', text: 'What\'s the price of SOL right now?' },
    { role: 'agent', text: `SOL is currently trading at ${priceStr}. Want me to set a price alert?` },
    { role: 'user', text: `Yes, alert me if it drops below ${alertPrice}` },
    { role: 'agent', text: `Done! I'll send you a notification on Telegram if SOL drops below ${alertPrice}.` },
  ];

  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= messages.length) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), visibleCount === 0 ? 800 : 1500);
    return () => clearTimeout(timer);
  }, [visibleCount, messages.length]);

  return (
    <div className="bg-[var(--bg-sidebar)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/5">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-base)]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        </div>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-[var(--text-secondary)]">CryptoHelper — Online</span>
        </div>
      </div>
      <div className="p-4 space-y-3 min-h-[220px]">
        {messages.slice(0, visibleCount).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--color-accent)] text-white rounded-br-md'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)] rounded-bl-md'
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
        {visibleCount < messages.length && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── FAQ accordion ────────────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border-default)]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 py-5 text-left group">
        <span className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-accent)] transition-colors">{question}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <p className="pb-5 text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-3xl">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ██  LANDING PAGE
// ═══════════════════════════════════════════════════════════════
export default function LandingPage() {
  const { isLoading: authLoading } = useAuth();
  const [tokenData, setTokenData] = useState<{ price: string; mcap: string } | null>(null);
  // Founding Member availability. Hidden by default; rendered as a
  // scarcity banner only while spots remain (no banner when sold out —
  // don't tease users with something they can't buy).
  const [foundingRemaining, setFoundingRemaining] = useState<number | null>(null);

  // Affiliate program announcement banner — dismissed persistently
  // via the `hx_aff_banner_dismissed=1` cookie so it stays gone across
  // reloads and across devices that share cookies (SSR-friendly too).
  // Default to `true` during the very first client tick so the banner
  // doesn't flash in before we read the cookie — we flip to `false`
  // inside useEffect if the cookie is missing.
  const [affBannerHidden, setAffBannerHidden] = useState(true);

  useEffect(() => {
    const dismissed = document.cookie
      .split('; ')
      .some((c) => c.startsWith('hx_aff_banner_dismissed=1'));
    if (!dismissed) setAffBannerHidden(false);
  }, []);

  function dismissAffBanner() {
    // 180 days is long enough that returning visitors don't see the
    // same banner again, short enough that we can run a new campaign
    // later without stale dismissals suppressing it forever.
    const maxAge = 60 * 60 * 24 * 180;
    document.cookie = `hx_aff_banner_dismissed=1; path=/; max-age=${maxAge}; SameSite=Lax`;
    setAffBannerHidden(true);
  }

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    fetch('https://api.dexscreener.com/latest/dex/tokens/Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump')
      .then(r => r.json())
      .then(d => {
        const pair = d?.pairs?.[0];
        if (pair) {
          const price = parseFloat(pair.priceUsd);
          const mcap = pair.marketCap || pair.fdv || 0;
          setTokenData({
            price: price < 0.01 ? `$${price.toFixed(6)}` : `$${price.toFixed(4)}`,
            mcap: mcap >= 1_000_000 ? `$${(mcap / 1_000_000).toFixed(2)}M` : `$${(mcap / 1_000).toFixed(1)}K`,
          });
        }
      })
      .catch(() => {});

    // Founding Member availability — the /features endpoint is public
    // and already returns a `founding: { remaining }` summary.
    api.getTiersCatalog()
      .then((res) => {
        if (res.success) setFoundingRemaining(res.data.founding.remaining);
      })
      .catch(() => {});
  }, []);

  if (authLoading) return <div className="min-h-screen bg-[var(--bg-base)]" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">


      {/* Founding Member now lives as a full section further down the
          page (between pricing and FAQ), not as a top banner. This
          gives it room to breathe and show what's included. */}

      {/* ── Affiliate Program Banner — dismissible, cookie-backed ── */}
      {!affBannerHidden && (
        <div
          className="relative w-full border-b border-[var(--color-accent)]/30 text-[var(--text-primary)] text-[12px] sm:text-[13px]"
          style={{
            background:
              'linear-gradient(90deg, color-mix(in srgb, var(--bg-card) 85%, transparent) 0%, color-mix(in srgb, var(--color-accent) 18%, var(--bg-card)) 50%, color-mix(in srgb, var(--bg-card) 85%, transparent) 100%)',
          }}
        >
          <Link
            href="/affiliate"
            className="block w-full py-2 pl-4 pr-10 sm:pr-12 text-center hover:brightness-110 transition"
          >
            <span className="inline-flex items-center gap-2 flex-wrap justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0" />
              <span>
                <strong className="font-semibold">Affiliate Program is live</strong>
                <span className="text-[var(--text-secondary)]"> — earn up to </span>
                <strong className="font-semibold">40%</strong>
                <span className="text-[var(--text-secondary)]"> on every referral</span>
              </span>
              <span className="text-[var(--color-accent)] font-semibold">→</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={dismissAffBanner}
            aria-label="Dismiss affiliate banner"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Token Banner — slim editorial line, single live-dot ──── */}
      <div className="w-full border-b border-[var(--border-default)] bg-[var(--bg-card-solid)] text-[var(--text-secondary)] py-2 px-4 text-[12px] sm:text-[13px]">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 sm:gap-3 flex-nowrap overflow-hidden">
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-[var(--text-primary)]">$HATCHER</span>
          </span>
          {tokenData && (
            <>
              <span className="text-[var(--text-muted)] shrink-0">·</span>
              <span className="font-mono tabular-nums text-[var(--text-primary)] shrink-0">{tokenData.price}</span>
              <span className="hidden sm:inline text-[var(--text-muted)] shrink-0">MCap</span>
              <span className="hidden sm:inline font-mono tabular-nums text-[var(--text-primary)] shrink-0">{tokenData.mcap}</span>
            </>
          )}
          <span className="hidden md:inline text-[var(--text-muted)]">·</span>
          <code className="hidden md:inline font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] select-all transition-colors truncate">Cntmo5...zZpump</code>
          <Link href="/token" className="text-[var(--color-accent)] hover:underline underline-offset-2 shrink-0 ml-auto sm:ml-0">Learn more →</Link>
        </div>
      </div>

      {/* ── 1. HERO ─────────────────────────────────────── */}
      <section className="relative pt-20 sm:pt-28 md:pt-36 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden">
        {/* Single subtle ambient — one accent color, calm not busy.
            Replaces previous purple+cyan radial pair + dot grid + 5 floating
            emojis (decoration without purpose, AI-slop pattern). */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(6,182,212,0.06), transparent 70%)',
        }} />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="mb-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Managed AI agent hosting · Crypto-native
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease }}
                className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6 text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Hatch Your{' '}<br />
                <Typewriter />
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease }} className="text-lg text-[var(--text-secondary)] leading-relaxed mb-10 max-w-lg">
                Pick a framework. Configure. Launch in 60 seconds. No code required, no infrastructure to manage. 4 frameworks, 20+ platforms, free tier with BYOK.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease }} className="flex flex-wrap items-center gap-5">
                <Link href="/register" className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 transition-opacity">
                  Get started free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href={DOCS_URL} className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5 group">
                  Read docs
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="hidden lg:block">
              <AgentPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 1b. SOCIAL PROOF (platform stats) ─────────── */}
      <section className="px-4 sm:px-6 -mt-8 sm:-mt-12 mb-4 sm:mb-6">
        <HeroStats />
      </section>

      {/* ── 1c. FOR AI AGENTS (moltbook-style invite) ─── */}
      <AgentDiscoverySection />

      {/* ── 2. HOW IT WORKS ─────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-16 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">How it works</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              3 steps. 60 seconds.
            </h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">No coding, no setup guides, no configuration files.</p>
          </motion.div>

          {/* Editorial numbered rows — typography-led, not card-grid.
              Big outline numerals carry the rhythm, spacing between rows
              gives the eye time to land on each step. */}
          <div className="divide-y divide-[var(--border-default)] border-t border-b border-[var(--border-default)]">
            {[
              { num: '01', title: 'Pick a framework', desc: 'OpenClaw, Hermes, ElizaOS, or Milady. Each has unique strengths — browser control, memory, multi-agent, on-chain.' },
              { num: '02', title: 'Configure', desc: 'Name, personality, integrations. Fill a simple form — no config files, no YAML.' },
              { num: '03', title: 'Deploy', desc: 'One click. Your agent is live on every connected platform in under 60 seconds.' },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ y: 20 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease }}
                className="grid grid-cols-[auto_1fr] md:grid-cols-[8rem_1fr_2fr] gap-x-6 md:gap-x-10 py-8"
              >
                <div className="text-[48px] md:text-[72px] font-bold leading-none text-[var(--text-muted)] opacity-30 tabular-nums" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
                  {step.num}
                </div>
                <h3 className="self-center text-xl md:text-2xl font-semibold text-[var(--text-primary)]">{step.title}</h3>
                <p className="col-start-2 md:col-start-3 self-center text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-xl">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2, ease }} className="mt-10">
            <Link href="/register" className="text-sm font-medium text-[var(--color-accent)] hover:underline underline-offset-4 inline-flex items-center gap-1.5 group">
              Try it now
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── USE CASES ─────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-16 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Use cases</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              What will you hatch?
            </h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">
              From personal productivity to business automation — your agent, your rules.
            </p>
          </motion.div>

          {/* Editorial 2-column with asymmetric weight — typography over emoji.
              Each row: title + inline desc. Lets the reader scan 9 use-cases
              without each one shouting with decorative color. */}
          <div className="grid sm:grid-cols-2 gap-x-10 md:gap-x-16 gap-y-1">
            {[
              { title: 'Personal assistant', desc: 'Calendar, emails, reminders — from Telegram.' },
              { title: 'Fitness coach', desc: 'Workouts, routines, daily accountability.' },
              { title: 'Food & nutrition', desc: 'Log meals, count calories, recipe suggestions.' },
              { title: 'Crypto tracker', desc: 'Token prices, portfolio alerts, on-chain data.' },
              { title: 'Study buddy', desc: 'Quiz you, summarize textbooks, help with homework.' },
              { title: 'Travel planner', desc: 'Find flights, plan itineraries, local picks.' },
              { title: 'Budget manager', desc: 'Track expenses, savings goals, weekly reports.' },
              { title: 'Research assistant', desc: 'Web search, summarize articles, compile reports.' },
              { title: 'Customer support', desc: 'Answer FAQs on Discord or WhatsApp, 24/7.' },
            ].map((uc, i) => (
              <motion.div
                key={uc.title}
                initial={{ y: 12 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{ duration: 0.4, delay: i * 0.04, ease }}
                className="grid grid-cols-[auto_1fr] items-baseline gap-4 border-b border-[var(--border-default)]/60 py-5"
              >
                <h3 className="text-base font-semibold text-[var(--text-primary)] whitespace-nowrap">{uc.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{uc.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.p {...fadeUp} transition={{ duration: 0.5, delay: 0.2, ease }} className="mt-10 text-sm text-[var(--text-muted)]">
            And anything else you can describe in plain English.
          </motion.p>
        </div>
      </section>

      {/* ── 3. FRAMEWORKS ───────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden" id="frameworks">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-16 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Frameworks</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Four frameworks. One platform.
            </h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">
              Pick the one that fits your agent. Switch whenever you want.
            </p>
          </motion.div>

          <div className="divide-y divide-[var(--border-default)] border-t border-b border-[var(--border-default)]">
            {[
              { icon: Cpu, name: 'OpenClaw', tag: 'all-rounder', desc: 'Powerful tools, plugins, and browser control.', features: '2500+ skills · Browser automation · File management', href: `${DOCS_URL}/frameworks/openclaw` },
              { icon: Brain, name: 'Hermes', tag: 'reasoning', desc: 'Smart-first design for rich memory and reasoning.', features: '77 bundled skills · Deep memory · Multi-model', href: `${DOCS_URL}/frameworks/hermes` },
              { icon: Bot, name: 'ElizaOS', tag: 'multi-agent', desc: 'Multi-agent coordination with 90+ plugins.', features: '90+ plugins · Multi-agent · Knowledge base', href: `${DOCS_URL}/frameworks/elizaos` },
              { icon: Sparkles, name: 'Milady', tag: 'crypto-native', desc: 'On-chain awareness, DeFi tools, token tracking.', features: 'DeFi tools · On-chain data · Token tracking', href: `${DOCS_URL}/frameworks/milady` },
            ].map((fw, i) => (
              <motion.div
                key={fw.name}
                initial={{ x: -20 }}
                whileInView={{ x: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
              >
                <Link
                  href={fw.href}
                  className="group flex items-start gap-4 md:gap-6 py-6 hover:bg-[var(--bg-card)]/40 transition-colors px-2 -mx-2 rounded"
                >
                  <fw.icon size={20} className="text-[var(--text-muted)] group-hover:text-[var(--color-accent)] transition-colors shrink-0 mt-0.5" />
                  {/* Name + tag stacked so each row has identical height
                      regardless of tag length ("ALL-ROUNDER" vs "REASONING"
                      vs "MULTI-AGENT" wrap inconsistently when inline). */}
                  <div className="w-36 md:w-40 shrink-0">
                    <h3 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)] leading-tight">{fw.name}</h3>
                    <span className="block mt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)] whitespace-nowrap">{fw.tag}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{fw.desc}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{fw.features}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-all shrink-0 mt-1.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. WHY HATCHER ──────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden" id="features">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-16 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Platform</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Everything your agent needs
            </h2>
          </motion.div>

          {/* Single-accent feature grid. Icons stroke-only in muted grey,
              stripe/linear restraint — no colored icon boxes, no 5-color
              palette shouting. Title + description carry the weight. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
            {[
              { icon: Zap, title: 'Instant deploy', desc: 'From zero to running agent in under 60 seconds.' },
              { icon: Globe, title: 'All platforms', desc: 'Telegram, Discord, Twitter, WhatsApp, Slack.' },
              { icon: Key, title: 'Bring your own key', desc: 'Use your own LLM API key for unlimited messages on any tier.' },
              { icon: Shield, title: 'Secure by default', desc: 'Isolated containers, encrypted secrets, no shared data.' },
              { icon: BarChart3, title: 'Live analytics', desc: 'Real-time stats, usage tracking, performance metrics.' },
              { icon: MessageSquare, title: 'Chat & voice', desc: 'Text chat, voice calls, real-time streaming — out of the box.' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ y: 20 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: i * 0.05, ease }}
              >
                <feature.icon className="w-5 h-5 text-[var(--color-accent)] mb-4" strokeWidth={1.75} />
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">{feature.title}</h3>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. PRICING ──────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden" id="pricing">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-16 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Pricing</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Start free, grow when ready
            </h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">All platforms included on every plan. Bring your own AI key for unlimited messages on any tier.</p>
          </motion.div>

          {/* Unified tier cards — no 4-color tier coding, no neon badges.
              The Pro tier is marked only by a subtle accent border + a
              single small "Popular" label (matching the eyebrow typography
              style used elsewhere). Rest stays calm and scannable. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                name: 'Free', price: '$0', sub: '/month',
                features: ['1 AI agent', '20 messages/day', 'All platforms', 'Free AI included'],
                cta: 'Get started', href: '/register', highlight: false,
              },
              {
                name: 'Starter', price: '$6.99', sub: '/month',
                features: ['1 AI agent', '50 messages/day', 'BYOK = unlimited', 'Longer active time'],
                cta: 'Choose Starter', href: '/pricing', highlight: false,
              },
              {
                name: 'Pro', price: '$19.99', sub: '/month',
                features: ['3 AI agents', '100 messages/day', 'BYOK = unlimited', 'Dedicated resources'],
                cta: 'Choose Pro', href: '/pricing', highlight: true,
              },
              {
                name: 'Business', price: '$49.99', sub: '/month',
                features: ['10 AI agents', '300 messages/day', 'Always-on containers', 'Priority support'],
                cta: 'Choose Business', href: '/pricing', highlight: false,
              },
            ].map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ y: 30 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease }}
                className={`relative rounded-xl p-6 flex flex-col ${
                  tier.highlight
                    ? 'border-2 border-[var(--color-accent)] bg-[var(--bg-card)]'
                    : 'border border-[var(--border-default)] bg-[var(--bg-card)]/40'
                } transition-colors`}
              >
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--text-muted)]">{tier.name}</p>
                  {tier.highlight && <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">Popular</span>}
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-[32px] font-bold text-[var(--text-primary)] tabular-nums leading-none">{tier.price}</span>
                  <span className="text-sm text-[var(--text-muted)]">{tier.sub}</span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                      <Check className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`block text-center font-semibold px-5 py-2.5 rounded-md text-sm transition-opacity ${
                    tier.highlight
                      ? 'bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90'
                      : 'border border-[var(--border-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {tier.cta}
                </Link>
              </motion.div>
            ))}
          </div>

          <p className="text-sm text-[var(--text-muted)] mt-8">
            Need more agents, messages, or storage? Add stackable packs — all tiers get add-on flexibility.{' '}
            <Link href="/pricing" className="text-[var(--color-accent)] hover:underline underline-offset-2">See full pricing →</Link>
          </p>
        </div>
      </section>

      {/* ── 5b. FOUNDING MEMBER ─────────────────────────── */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 40% 40% at 50% 50%, rgba(6,182,212,0.05), transparent 70%)',
        }} />
        <div className="max-w-5xl mx-auto relative">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-12 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">Limited offer · Founding member</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Pay once, keep forever.
            </h2>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-5xl md:text-6xl font-bold text-[var(--text-primary)] tabular-nums leading-none">$99</span>
              <span className="text-lg text-[var(--text-muted)]">one-time</span>
            </div>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">
              Locked-in price, no monthly fees, all Business-tier features forever. Only 20 spots.
            </p>
          </motion.div>

          {/* Availability bar */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.08, ease }}
            className="card glass-noise p-5 sm:p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
                Available spots
              </span>
              {foundingRemaining === null ? (
                <span className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-[var(--text-muted)]/30 border-t-[var(--text-muted)] rounded-full animate-spin" />
                  Checking…
                </span>
              ) : (
                <span className={`text-xs font-bold ${foundingRemaining === 0 ? 'text-red-400' : foundingRemaining <= 3 ? 'text-orange-400' : 'text-[var(--text-primary)]'}`}>
                  {foundingRemaining === 0 ? 'Sold out' : `${foundingRemaining} of ${FOUNDING_MEMBER_MAX_SLOTS} left`}
                </span>
              )}
            </div>
            <div className="relative h-3 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
              {foundingRemaining === null ? (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#8b5cf6]/30 to-transparent animate-[shimmer_1.4s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />
              ) : (
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${((FOUNDING_MEMBER_MAX_SLOTS - foundingRemaining) / FOUNDING_MEMBER_MAX_SLOTS) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease }}
                  className="absolute inset-y-0 left-0 bg-[var(--color-accent)]"
                />
              )}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
              {foundingRemaining === null
                ? 'Loading availability…'
                : foundingRemaining === 0
                  ? `All ${FOUNDING_MEMBER_MAX_SLOTS} founding spots are taken. Standard tiers still available.`
                  : `${FOUNDING_MEMBER_MAX_SLOTS - foundingRemaining} of ${FOUNDING_MEMBER_MAX_SLOTS} claimed · once they're gone, this offer is gone.`}
            </p>
          </motion.div>

          {/* What's included */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.14, ease }}
            className="card glass-noise p-6 sm:p-8 mb-6"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">
              Everything included, forever
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                '10 agents included',
                'Always-on (no sleep)',
                '300 messages/day per account',
                '200 web searches/day',
                '2 CPU · 4 GB RAM per agent',
                '2 GB workspace per agent',
                'File Manager + Full Logs',
                'Team collaboration + priority support',
                'Founding badge',
                'Locked-in price forever',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <Check className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.2, ease }}>
            <Link
              href="/pricing"
              className={`inline-flex items-center justify-center gap-2 h-11 px-6 rounded-md font-semibold text-sm transition-opacity ${
                foundingRemaining === 0
                  ? 'bg-[var(--text-muted)]/50 text-[var(--text-muted)] pointer-events-none'
                  : 'bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90'
              }`}
            >
              {foundingRemaining === 0 ? 'Sold out' : 'Claim your spot'}
              {foundingRemaining !== 0 && <ArrowRight className="w-4 h-4" />}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── 6. FAQ ──────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden" id="faq">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-14 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">FAQ</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Common questions
            </h2>
          </motion.div>

          <div className="space-y-3">
            {[
              { q: 'Is it really free?', a: 'Yes. The free plan gives you 1 agent, 20 messages per day, and access to all platforms. No credit card required. BYOK (bring your own LLM key) = unlimited messages on any tier.' },
              { q: 'Do I need to know how to code?', a: 'Not at all! Creating an agent is like filling out a form — choose a name, describe what you want it to do, pick platforms, and launch.' },
              { q: 'What is "Bring Your Own Key"?', a: 'Connect your own OpenAI, Anthropic, Google, or Groq key for unlimited messages. You only pay your AI provider directly.' },
              { q: 'Where does my agent run?', a: 'On our cloud servers 24/7. No need to keep your computer on or install anything.' },
            ].map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. FINAL CTA ────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(6,182,212,0.06), transparent 70%)',
        }} />
        <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            Ready to deploy your first agent?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-10 max-w-xl mx-auto">
            Free tier includes 1 agent with 20 messages/day. BYOK = unlimited. No credit card required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/register" className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 transition-opacity">
              Create your agent
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5 group">
              See pricing
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[var(--color-accent)]" strokeWidth={2.5} /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[var(--color-accent)]" strokeWidth={2.5} /> Free AI included</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[var(--color-accent)]" strokeWidth={2.5} /> Deploy in 60s</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[var(--color-accent)]" strokeWidth={2.5} /> All platforms</span>
          </div>
        </motion.div>
      </section>

      {/* Global footer is rendered by LayoutShell */}
    </motion.div>
  );
}
