'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';

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
  icon: React.ComponentType<any>;
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
  const t = useTranslations('landing.stats');
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
        label={t('users')}
        value={stats ? fmt(stats.totalUsers) : '—'}
        icon={Users}
        iconColor="var(--color-accent)"
        loading={loading}
      />
      <StatProofCard
        label={t('agents')}
        value={stats ? fmt(stats.totalAgents) : '—'}
        icon={Bot}
        iconColor="#60A5FA"
        loading={loading}
      />
      <StatProofCard
        label={t('activeNow')}
        value={stats ? fmt(stats.activeAgents) : '—'}
        icon={Activity}
        iconColor="#4ADE80"
        loading={loading}
      />
    </motion.div>
  );
}

// ─── Typewriter effect ───────────────────────────────────────
function Typewriter({ words }: { words: string[] }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  // Longest word reserves layout space so the headline never reflows mid-cycle
  // (which causes CLS + the trailing chat-preview card to jitter).
  const longestWord = words.reduce((a, b) => (b.length > a.length ? b : a), '');

  useEffect(() => {
    const word = words[wordIndex] ?? '';
    const speed = deleting ? 40 : 80;

    if (!deleting && charIndex === word.length) {
      const pause = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(pause);
    }
    if (deleting && charIndex === 0) {
      setDeleting(false);
      setWordIndex((i) => (i + 1) % words.length);
      return;
    }

    const timer = setTimeout(() => {
      setCharIndex((c) => c + (deleting ? -1 : 1));
    }, speed);
    return () => clearTimeout(timer);
  }, [charIndex, deleting, wordIndex, words]);

  const word = words[wordIndex] ?? '';
  const displayed = word.slice(0, charIndex);

  return (
    <span className="relative inline-block align-baseline">
      {/* Invisible spacer reserves space for the longest word so layout never reflows. */}
      <span aria-hidden="true" className="invisible whitespace-nowrap">{longestWord}</span>
      <span className="absolute inset-0 text-[var(--color-accent)] whitespace-nowrap">
        {displayed}
        <span className="animate-pulse opacity-70">|</span>
      </span>
    </span>
  );
}

// ─── Live agent demo preview ──────────────────────────────────
function AgentPreview() {
  const t = useTranslations('landing.hero');
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
          <span className="text-xs text-[var(--text-secondary)]">{t('agentPreviewOnline')}</span>
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
  const tHero = useTranslations('landing.hero');
  const tAff = useTranslations('landing.affiliateBanner');
  const tToken = useTranslations('landing.tokenBanner');
  const tHow = useTranslations('landing.howItWorks');
  const tUse = useTranslations('landing.useCases');
  const tFw = useTranslations('landing.frameworks');
  const tCity = useTranslations('landing.city');
  const tFeat = useTranslations('landing.features');
  const tPricing = useTranslations('landing.pricing');
  const tFounding = useTranslations('landing.founding');
  const tFaq = useTranslations('landing.faq');
  const tCta = useTranslations('landing.finalCta');

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

  // Read translated arrays
  const typewriterWords = tHero.raw('typewriterWords') as string[];

  const howItWorksSteps = tHow.raw('steps') as { num: string; title: string; desc: string }[];

  const useCaseItems = tUse.raw('items') as { title: string; desc: string }[];

  const frameworkIcons = [Cpu, Brain, Bot, Sparkles];
  const frameworkHrefs = [
    `${DOCS_URL}/frameworks/openclaw`,
    `${DOCS_URL}/frameworks/hermes`,
    `${DOCS_URL}/frameworks/elizaos`,
    `${DOCS_URL}/frameworks/milady`,
  ];
  const frameworkItems = tFw.raw('items') as { name: string; tag: string; desc: string; features: string }[];

  const featureIcons = [Zap, Globe, Key, Shield, BarChart3, MessageSquare];
  const featureItems = tFeat.raw('items') as { title: string; desc: string }[];

  const pricingTiers = tPricing.raw('tiers') as { name: string; price: string; sub: string; features: string[]; cta: string }[];
  const pricingHrefs = ['/register', '/pricing', '/pricing', '/pricing'];
  const pricingHighlight = [false, false, true, false];

  const foundingIncludedItems = tFounding.raw('includedItems') as string[];

  const faqItems = tFaq.raw('items') as { q: string; a: string }[];

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
                <strong className="font-semibold">{tAff('live')}</strong>
                <span className="text-[var(--text-secondary)]">{tAff('earn')}</span>
                <strong className="font-semibold">{tAff('pct')}</strong>
                <span className="text-[var(--text-secondary)]">{tAff('perReferral')}</span>
              </span>
              <span className="text-[var(--color-accent)] font-semibold">→</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={dismissAffBanner}
            aria-label={tAff('dismissAriaLabel')}
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
          <Link href="/token" className="text-[var(--color-accent)] hover:underline underline-offset-2 shrink-0 ml-auto sm:ml-0">{tToken('learnMore')}</Link>
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
                {tHero('eyebrow')}
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease }}
                className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6 text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                {tHero('headlinePrefix')}{' '}<br />
                <Typewriter words={typewriterWords} />
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease }} className="text-lg text-[var(--text-secondary)] leading-relaxed mb-10 max-w-lg">
                {tHero('body')}
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease }} className="flex flex-wrap items-center gap-5">
                <Link href="/register" className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 transition-opacity">
                  {tHero('ctaPrimary')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href={DOCS_URL} className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5 group">
                  {tHero('ctaSecondary')}
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
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{tHow('eyebrow')}</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              {tHow('heading')}
            </h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">{tHow('subheading')}</p>
          </motion.div>

          {/* Editorial numbered rows — typography-led, not card-grid.
              Big outline numerals carry the rhythm, spacing between rows
              gives the eye time to land on each step. */}
          <div className="divide-y divide-[var(--border-default)] border-t border-b border-[var(--border-default)]">
            {howItWorksSteps.map((step, i) => (
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
              {tHow('cta')}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── USE CASES ─────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-16 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{tUse('eyebrow')}</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              {tUse('heading')}
            </h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">
              {tUse('subheading')}
            </p>
          </motion.div>

          {/* Editorial 2-column with asymmetric weight — typography over emoji.
              Each row: title + inline desc. Lets the reader scan 9 use-cases
              without each one shouting with decorative color. */}
          <div className="grid sm:grid-cols-2 gap-x-10 md:gap-x-16 gap-y-1">
            {useCaseItems.map((uc, i) => (
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
            {tUse('footer')}
          </motion.p>
        </div>
      </section>

      {/* ── 3. FRAMEWORKS ───────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden" id="frameworks">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-16 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{tFw('eyebrow')}</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              {tFw('heading')}
            </h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">
              {tFw('subheading')}
            </p>
          </motion.div>

          <div className="divide-y divide-[var(--border-default)] border-t border-b border-[var(--border-default)]">
            {frameworkItems.map((fw, i) => {
              const FwIcon = frameworkIcons[i]!;
              return (
                <motion.div
                  key={fw.name}
                  initial={{ x: -20 }}
                  whileInView={{ x: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease }}
                >
                  <Link
                    href={frameworkHrefs[i]!}
                    className="group flex items-start gap-4 md:gap-6 py-6 hover:bg-[var(--bg-card)]/40 transition-colors px-2 -mx-2 rounded"
                  >
                    <FwIcon size={20} className="text-[var(--text-muted)] group-hover:text-[var(--color-accent)] transition-colors shrink-0 mt-0.5" />
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
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3b. CITY SHOWCASE ──────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden relative" id="city">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-10 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-500">{tCity('eyebrow')}</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              {tCity('heading')}
            </h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">
              {tCity('body')}
            </p>
          </motion.div>
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.15, ease }}
            className="relative overflow-hidden border border-[var(--border-default)] bg-[#050814]"
            style={{ aspectRatio: '16/9' }}
          >
            <Link
              href="/city"
              className="group absolute inset-0 block"
              aria-label={tCity('videoAriaLabel')}
            >
              <video
                src="/city-hero.mp4"
                poster="/city-preview.png"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050814]/80 via-transparent to-[#050814]/20" />
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[3px] text-amber-400">{tCity('label')}</div>
                  <div className="mt-1 text-xl font-bold text-white sm:text-2xl">{tCity('exploreCta')}</div>
                </div>
                <div className="hidden sm:block rounded-full border border-amber-400 bg-amber-400 px-5 py-2 font-mono text-xs uppercase tracking-widest text-black transition group-hover:bg-transparent group-hover:text-amber-400">
                  {tCity('enterCta')}
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── 4. WHY HATCHER ──────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden" id="features">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-16 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{tFeat('eyebrow')}</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              {tFeat('heading')}
            </h2>
          </motion.div>

          {/* Single-accent feature grid. Icons stroke-only in muted grey,
              stripe/linear restraint — no colored icon boxes, no 5-color
              palette shouting. Title + description carry the weight. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
            {featureItems.map((feature, i) => {
              const FeatIcon = featureIcons[i]!;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ y: 20 }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease }}
                >
                  <FeatIcon className="w-5 h-5 text-[var(--color-accent)] mb-4" strokeWidth={1.75} />
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">{feature.title}</h3>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. PRICING ──────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden" id="pricing">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-16 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{tPricing('eyebrow')}</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              {tPricing('heading')}
            </h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">{tPricing('subheading')}</p>
          </motion.div>

          {/* Unified tier cards — no 4-color tier coding, no neon badges.
              The Pro tier is marked only by a subtle accent border + a
              single small "Popular" label (matching the eyebrow typography
              style used elsewhere). Rest stays calm and scannable. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricingTiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ y: 30 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease }}
                className={`relative rounded-xl p-6 flex flex-col ${
                  pricingHighlight[i]
                    ? 'border-2 border-[var(--color-accent)] bg-[var(--bg-card)]'
                    : 'border border-[var(--border-default)] bg-[var(--bg-card)]/40'
                } transition-colors`}
              >
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[var(--text-muted)]">{tier.name}</p>
                  {pricingHighlight[i] && <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">{tPricing('popularLabel')}</span>}
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
                  href={pricingHrefs[i]!}
                  className={`block text-center font-semibold px-5 py-2.5 rounded-md text-sm transition-opacity ${
                    pricingHighlight[i]
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
            {tPricing('addonsNote')}{' '}
            <Link href="/pricing" className="text-[var(--color-accent)] hover:underline underline-offset-2">{tPricing('addonsCta')}</Link>
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
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">{tFounding('eyebrow')}</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              {tFounding('heading')}
            </h2>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-5xl md:text-6xl font-bold text-[var(--text-primary)] tabular-nums leading-none">$99</span>
              <span className="text-lg text-[var(--text-muted)]">{tFounding('oneTime')}</span>
            </div>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">
              {tFounding('subheading')}
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
                {tFounding('availableSpotsLabel')}
              </span>
              {foundingRemaining === null ? (
                <span className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-[var(--text-muted)]/30 border-t-[var(--text-muted)] rounded-full animate-spin" />
                  {tFounding('checking')}
                </span>
              ) : (
                <span className={`text-xs font-bold ${foundingRemaining === 0 ? 'text-red-400' : foundingRemaining <= 3 ? 'text-orange-400' : 'text-[var(--text-primary)]'}`}>
                  {foundingRemaining === 0
                    ? tFounding('soldOut')
                    : tFounding('spotsLeft', { remaining: foundingRemaining, max: FOUNDING_MEMBER_MAX_SLOTS })}
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
                ? tFounding('loadingAvailability')
                : foundingRemaining === 0
                  ? tFounding('allTaken', { max: FOUNDING_MEMBER_MAX_SLOTS })
                  : tFounding('claimed', { claimed: FOUNDING_MEMBER_MAX_SLOTS - foundingRemaining, max: FOUNDING_MEMBER_MAX_SLOTS })}
            </p>
          </motion.div>

          {/* What's included */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.14, ease }}
            className="card glass-noise p-6 sm:p-8 mb-6"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">
              {tFounding('includedHeading')}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {foundingIncludedItems.map((item) => (
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
              {foundingRemaining === 0 ? tFounding('ctaSoldOut') : tFounding('ctaClaim')}
              {foundingRemaining !== 0 && <ArrowRight className="w-4 h-4" />}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── 6. FAQ ──────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden" id="faq">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="mb-14 max-w-2xl">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{tFaq('eyebrow')}</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              {tFaq('heading')}
            </h2>
          </motion.div>

          <div className="space-y-3">
            {faqItems.map((item, i) => (
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
            {tCta('heading')}
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-10 max-w-xl mx-auto">
            {tCta('body')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/register" className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-[var(--text-primary)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 transition-opacity">
              {tCta('ctaPrimary')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5 group">
              {tCta('ctaSecondary')}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[var(--color-accent)]" strokeWidth={2.5} /> {tCta('trustNoCreditCard')}</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[var(--color-accent)]" strokeWidth={2.5} /> {tCta('trustFreeAi')}</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[var(--color-accent)]" strokeWidth={2.5} /> {tCta('trustDeploy60s')}</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[var(--color-accent)]" strokeWidth={2.5} /> {tCta('trustAllPlatforms')}</span>
          </div>
        </motion.div>
      </section>

      {/* Global footer is rendered by LayoutShell */}
    </motion.div>
  );
}
