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
} from 'lucide-react';
import { DOCS_URL } from '@/lib/config';

// ─── Shared animation config ──────────────────────────────────
const ease = [0.25, 0.46, 0.45, 0.94] as const;
const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

// ─── Typewriter effect ───────────────────────────────────────
const TYPEWRITER_WORDS = ['AI Agent', 'Fitness Coach', 'Crypto Tracker', 'Study Buddy', 'Travel Planner', 'Personal Assistant'];

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
    <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
      {displayed}
      <span className="animate-pulse text-purple-400">|</span>
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
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-br-md'
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
    <div className="border border-[var(--border-default)] rounded-xl overflow-hidden bg-[var(--bg-card)] hover:border-[var(--border-hover)] transition-colors">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left">
        <span className="text-sm font-medium text-[var(--text-primary)]">{question}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <p className="px-6 pb-4 text-sm text-[var(--text-secondary)] leading-relaxed">{answer}</p>
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
  }, []);

  if (authLoading) return <div className="min-h-screen bg-[var(--bg-base)]" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">

      {/* ── Open Beta Banner ────────────────────────────────── */}
      <div className="w-full bg-[var(--color-accent)]/90 text-white text-center py-2 px-4 text-sm font-medium">
        We&apos;re in open beta! All features are free to try.{' '}
        <Link href="/register" className="underline underline-offset-2 hover:text-white/80 transition-colors">Sign up and start building</Link>
      </div>

      {/* ── Token Banner ──────────────────────────────────── */}
      <div className="w-full bg-gradient-to-r from-[#9945FF]/90 to-[#14F195]/90 text-white text-center py-2.5 px-4 text-sm font-medium">
        <span className="mr-1">&#x1FA99;</span> <strong>$HATCHER</strong> is live{tokenData && <> — <span className="font-mono">{tokenData.price}</span> · MCap <span className="font-mono">{tokenData.mcap}</span></>} — <span className="hidden sm:inline">CA: <code className="font-mono text-xs bg-white/15 px-1.5 py-0.5 rounded select-all">Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump</code></span> <Link href="/token" className="inline-block underline underline-offset-2 hover:text-white/80 transition-colors ml-1 py-1">Learn more</Link>
      </div>

      {/* ── 1. HERO ─────────────────────────────────────── */}
      <section className="relative pt-20 sm:pt-28 md:pt-36 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(139,92,246,0.12), transparent 70%), radial-gradient(ellipse 40% 40% at 70% 60%, rgba(6,182,212,0.06), transparent 60%)',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(139,92,246,0.15) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.3,
          maskImage: 'radial-gradient(ellipse 70% 50% at 50% 30%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 50% at 50% 30%, black, transparent)',
        }} />

        {/* Floating platform icons */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[
            { icon: '💬', x: '10%', y: '20%', delay: 0, size: 'text-2xl' },
            { icon: '🤖', x: '85%', y: '15%', delay: 1.5, size: 'text-3xl' },
            { icon: '📱', x: '75%', y: '70%', delay: 3, size: 'text-2xl' },
            { icon: '🔗', x: '15%', y: '75%', delay: 2, size: 'text-xl' },
            { icon: '⚡', x: '50%', y: '10%', delay: 0.8, size: 'text-xl' },
          ].map((item, i) => (
            <motion.span
              key={i}
              className={`absolute ${item.size} opacity-[0.08]`}
              style={{ left: item.x, top: item.y }}
              animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, delay: item.delay, ease: 'easeInOut' }}
            >
              {item.icon}
            </motion.span>
          ))}
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="mb-5">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  4 AI frameworks, 20+ platforms
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease }}
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Hatch Your{' '}<br />
                <Typewriter />
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease }} className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8 max-w-lg">
                Your personal AI assistant — for crypto, research, customer support, or anything else. Pick a framework, configure, and launch in 60 seconds. No code required.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease }} className="flex flex-wrap items-center gap-4">
                <Link href="/register" className="clay-btn-primary clay-btn-lg text-base">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href={DOCS_URL} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5">
                  View Docs <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="hidden lg:block">
              <AgentPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 2. HOW IT WORKS ─────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              3 steps. 60 seconds.
            </h2>
            <p className="mt-4 text-[var(--text-secondary)] max-w-md mx-auto">No coding, no setup guides, no configuration files.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { num: '1', title: 'Pick a Framework', desc: 'OpenClaw, Hermes, ElizaOS, or Milady. Each has unique strengths.' },
              { num: '2', title: 'Configure', desc: 'Name, personality, integrations. Fill a simple form.' },
              { num: '3', title: 'Deploy', desc: 'One click. Your agent is live on all connected platforms.' },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15, ease }}
                className="relative rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 hover:border-[var(--border-hover)] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/20 flex items-center justify-center mb-4">
                  <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">{step.num}</span>
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.4, ease }} className="text-center mt-10">
            <Link href="/create" className="text-sm text-[var(--color-accent)] hover:brightness-125 transition-all inline-flex items-center gap-1.5">
              Try it now <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── USE CASES ─────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              What will you hatch?
            </h2>
            <p className="mt-4 text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
              From personal productivity to business automation — your AI agent, your rules.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { emoji: '🧑‍💼', title: 'Personal Assistant', desc: 'Manage your calendar, emails, and reminders — all from Telegram' },
              { emoji: '💪', title: 'Fitness Coach', desc: 'Track workouts, suggest routines, and keep you accountable daily' },
              { emoji: '🍽️', title: 'Food & Nutrition', desc: 'Log meals, count calories, suggest recipes based on your goals' },
              { emoji: '📈', title: 'Crypto Tracker', desc: 'Monitor token prices, get alerts when your portfolio moves' },
              { emoji: '📚', title: 'Study Buddy', desc: 'Quiz you on any topic, summarize textbooks, help with homework' },
              { emoji: '✈️', title: 'Travel Planner', desc: 'Find flights, plan itineraries, and get local recommendations' },
              { emoji: '💰', title: 'Budget Manager', desc: 'Track expenses, set savings goals, get weekly spending reports' },
              { emoji: '🔬', title: 'Research Assistant', desc: 'Search the web, summarize articles, compile reports for you' },
              { emoji: '💬', title: 'Customer Support', desc: 'Answer FAQs on Discord or WhatsApp 24/7 for your business' },
            ].map((uc, i) => (
              <motion.div
                key={uc.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
                className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] transition-colors"
              >
                <span className="text-2xl mb-3 block">{uc.emoji}</span>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{uc.title}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{uc.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. FRAMEWORKS ───────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden" id="frameworks">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              4 Frameworks. One Platform.
            </h2>
          </motion.div>

          <div className="space-y-3">
            {[
              { icon: Cpu, name: 'OpenClaw', desc: 'The all-rounder — powerful tools, plugins, and browser control', features: ['2500+ skills', 'Browser automation', 'File management'], color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'hover:border-amber-500/30', href: `${DOCS_URL}/frameworks/openclaw` },
              { icon: Brain, name: 'Hermes', desc: 'Smart-first design for rich memory and reasoning', features: ['77 bundled skills', 'Deep memory', 'Multi-model'], color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'hover:border-purple-500/30', href: `${DOCS_URL}/frameworks/hermes` },
              { icon: Bot, name: 'ElizaOS', desc: 'Multi-agent coordination with 90+ plugins', features: ['90+ plugins', 'Multi-agent', 'Knowledge base'], color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'hover:border-cyan-500/30', href: `${DOCS_URL}/frameworks/elizaos` },
              { icon: Sparkles, name: 'Milady', desc: 'Crypto-native with on-chain awareness', features: ['DeFi tools', 'On-chain data', 'Token tracking'], color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'hover:border-rose-500/30', href: `${DOCS_URL}/frameworks/milady` },
            ].map((fw, i) => (
              <motion.div
                key={fw.name}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease }}
              >
                <Link
                  href={fw.href}
                  className={`group flex items-center gap-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] ${fw.border} transition-all hover:translate-x-1 duration-200`}
                >
                  <div className={`w-10 h-10 rounded-lg ${fw.bg} flex items-center justify-center shrink-0`}>
                    <fw.icon size={20} className={fw.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{fw.name}</h3>
                    <p className="text-sm text-[var(--text-secondary)] truncate">{fw.desc}</p>
                    <div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {fw.features.map((f: string) => (
                        <span key={f} className={`text-[10px] px-1.5 py-0.5 rounded ${fw.bg} ${fw.color} font-medium`}>{f}</span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)] shrink-0 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. WHY HATCHER ──────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden" id="features">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Everything your agent needs
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Zap, title: 'Instant Deploy', desc: 'From zero to running agent in under 60 seconds', color: 'purple' },
              { icon: Globe, title: 'All Platforms', desc: 'Telegram, Discord, Twitter, WhatsApp, Slack', color: 'cyan' },
              { icon: Key, title: 'Bring Your Own Key', desc: 'Use your own LLM API keys for unlimited messages', color: 'amber' },
              { icon: Shield, title: 'Secure by Default', desc: 'Isolated containers, encrypted secrets, no shared data', color: 'emerald' },
              { icon: BarChart3, title: 'Live Analytics', desc: 'Real-time stats, usage tracking, performance metrics', color: 'rose' },
              { icon: MessageSquare, title: 'Chat & Voice', desc: 'Text chat, voice calls, real-time streaming', color: 'purple' },
            ].map((feature, i) => {
              const colors: Record<string, { icon: string; iconBg: string; border: string }> = {
                purple: { icon: 'text-purple-400', iconBg: 'bg-purple-500/10', border: 'hover:border-purple-500/20' },
                cyan: { icon: 'text-cyan-400', iconBg: 'bg-cyan-500/10', border: 'hover:border-cyan-500/20' },
                emerald: { icon: 'text-emerald-400', iconBg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/20' },
                amber: { icon: 'text-amber-400', iconBg: 'bg-amber-500/10', border: 'hover:border-amber-500/20' },
                rose: { icon: 'text-rose-400', iconBg: 'bg-rose-500/10', border: 'hover:border-rose-500/20' },
              };
              const c = colors[feature.color] || colors.purple;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease }}
                  className={`rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 ${c.border} transition-colors duration-200`}
                >
                  <div className={`w-9 h-9 rounded-lg ${c.iconBg} flex items-center justify-center mb-3`}>
                    <feature.icon className={c.icon} size={18} />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">{feature.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. PRICING ──────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden" id="pricing">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
              Start free, grow when ready
            </h2>
            <p className="mt-4 text-[var(--text-secondary)] max-w-lg mx-auto">All platforms included on every plan. Bring your own AI key = unlimited messages.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                name: 'Free', price: '$0', sub: 'No credit card', color: 'emerald', highlight: false,
                features: ['1 AI agent', '10 messages/day', 'All platforms', 'Free AI included'],
                cta: 'Get Started', href: '/register',
              },
              {
                name: 'Starter', price: '$4.99', sub: '/month', color: 'purple', highlight: false,
                features: ['1 AI agent', '50 messages/day', 'BYOK = unlimited', 'Longer active time'],
                cta: 'Subscribe', href: '/pricing',
              },
              {
                name: 'Pro', price: '$14.99', sub: '/month', color: 'cyan', highlight: true,
                features: ['3 AI agents', '200 messages/day', 'BYOK = unlimited', 'Priority support'],
                cta: 'Go Pro', href: '/pricing',
              },
              {
                name: 'Business', price: '$39.99', sub: '/month', color: 'amber', highlight: false,
                features: ['10 AI agents', '500 messages/day', 'Always-on containers', 'Dedicated resources'],
                cta: 'Go Business', href: '/pricing',
              },
            ].map((tier, i) => {
              const colorMap: Record<string, { label: string; check: string; border: string; ctaBg: string }> = {
                emerald: { label: 'text-emerald-400', check: 'text-emerald-400', border: 'border-[var(--border-default)]', ctaBg: 'border border-[var(--border-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]' },
                purple: { label: 'text-purple-400', check: 'text-emerald-400', border: 'border-[var(--border-default)]', ctaBg: 'border border-[var(--border-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]' },
                cyan: { label: 'text-cyan-400', check: 'text-cyan-400', border: 'border-cyan-500/30', ctaBg: 'bg-white text-black hover:bg-white/90' },
                amber: { label: 'text-amber-400', check: 'text-amber-400', border: 'border-amber-500/20', ctaBg: 'bg-amber-500 text-white hover:bg-amber-400' },
              };
              const c = colorMap[tier.color];
              return (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease }}
                  whileHover={{ y: -4 }}
                  className={`bg-[var(--bg-sidebar)] ${c.border} border rounded-2xl p-6 relative overflow-hidden transition-colors duration-200`}
                >
                  {tier.highlight && <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />}
                  <div className="flex items-center gap-2 mb-2">
                    <p className={`text-xs font-semibold tracking-[0.2em] uppercase ${c.label}`}>{tier.name}</p>
                    {tier.highlight && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">POPULAR</span>}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{tier.price}</p>
                    {tier.sub !== 'No credit card' && <span className="text-sm text-[var(--text-muted)]">{tier.sub}</span>}
                  </div>
                  {tier.sub === 'No credit card' && <p className="text-xs text-emerald-400/70 mb-4">No credit card required</p>}
                  {tier.sub !== 'No credit card' && <div className="mb-4" />}
                  <ul className="space-y-2.5 mb-6">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                        <Check className={`w-3.5 h-3.5 ${c.check} shrink-0`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={tier.href} className={`block text-center font-medium px-6 py-2.5 rounded-full ${c.ctaBg} hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 text-sm`}>
                    {tier.cta}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] mt-6">
            Need more agents? Add extras with stackable packs.{' '}
            <Link href="/pricing" className="text-[var(--color-accent)] hover:underline">See full pricing</Link>
          </p>
        </div>
      </section>

      {/* ── 6. FAQ ──────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-[var(--border-default)] overflow-hidden" id="faq">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">Common questions</h2>
          </motion.div>

          <div className="space-y-3">
            {[
              { q: 'Is it really free?', a: 'Yes. The free plan gives you 1 agent, 10 messages per day, and access to all platforms. No credit card required.' },
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
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-purple-500/8 blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[80px]" />
        </div>
        <motion.div {...fadeUp} transition={{ duration: 0.6, ease }} className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}>
            Ready to deploy your first agent?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-10 max-w-lg mx-auto">
            Get started free — no credit card required.
          </p>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Link href="/create" className="clay-btn-primary clay-btn-lg text-lg">
              Create Your Agent <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
          <p className="mt-6 text-xs text-[var(--text-muted)]">
            Free tier includes 1 agent with 10 messages/day
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Free AI included</span>
            <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Deploy in 60s</span>
            <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> All platforms</span>
          </div>
        </motion.div>
      </section>

      {/* Global footer is rendered by LayoutShell */}
    </motion.div>
  );
}
